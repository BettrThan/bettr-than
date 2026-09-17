/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS?: Fetcher;
  DB: D1Database;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      let original: Response | undefined;
      const optimized = await handleImageOptimization(request, {
        fetchAsset: async (path) => {
          const assetUrl = new URL(path, request.url);
          if (!env.ASSETS) return new Response("Image unavailable", { status: 503 });
          const response = await env.ASSETS.fetch(new Request(assetUrl));
          // Keep a safe original for cached pages that still request optimization.
          if (assetUrl.origin === url.origin && assetUrl.pathname.startsWith("/products/") && response.ok && /^image\/(jpeg|png|webp|avif|gif)(?:;|$)/i.test(response.headers.get("content-type") ?? "")) original = response.clone();
          return response;
        },
        transformImage: async (body, { width, format, quality }) => {
          if (!env.IMAGES && original) return original;
          try {
            if (!env.IMAGES) throw new Error("Image transformations unavailable");
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          } catch (error) {
            if (original) return original;
            throw error;
          }
        },
      }, allowedWidths);
      return optimized.status >= 500 && original ? original : optimized;
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;

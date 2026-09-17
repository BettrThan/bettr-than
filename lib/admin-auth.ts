import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

async function configuredAdminIdentity() {
  const { env } = await import("cloudflare:workers");
  const configured = env as unknown as {
    ADMIN_USER_ID?: string;
    ADMIN_EMAIL?: string;
  };

  return {
    userId: configured.ADMIN_USER_ID?.trim() || null,
    email: configured.ADMIN_EMAIL?.trim().toLowerCase() || null,
  };
}

export async function isAdminUser(
  user: Pick<ChatGPTUser, "userId" | "email">,
) {
  const admin = await configuredAdminIdentity();
  return Boolean(
    (admin.userId && user.userId === admin.userId) ||
      (admin.email && user.email.trim().toLowerCase() === admin.email),
  );
}

export async function getAdminUser() {
  const user = await getChatGPTUser();
  if (!user || !(await isAdminUser(user))) return null;
  return user;
}

export async function requireAdminApi(request: Request) {
  const user = await getAdminUser();
  if (!user) return { error: Response.json({ error: "Owner access required" }, { status: 403 }) } as const;

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).hostname !== new URL(request.url).hostname) {
      return { error: Response.json({ error: "Invalid request origin" }, { status: 403 }) } as const;
    }
  }
  return { user } as const;
}

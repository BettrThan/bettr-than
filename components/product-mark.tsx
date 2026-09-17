import type { Product } from "@/lib/products";

const accentMap = {
  blue: "from-cyan-400 to-blue-600 shadow-cyan-500/20",
  orange: "from-amber-300 to-orange-600 shadow-orange-500/20",
  violet: "from-violet-400 to-fuchsia-600 shadow-violet-500/20",
  green: "from-emerald-300 to-teal-600 shadow-emerald-500/20",
};

export function ProductMark({
  product,
  size = "large",
}: {
  product: Product;
  size?: "small" | "large";
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[1.6rem] bg-gradient-to-br font-black tracking-tighter text-slate-950 shadow-2xl ${accentMap[product.accent]} ${size === "large" ? "h-32 w-32 text-4xl sm:h-40 sm:w-40 sm:text-5xl" : "h-12 w-12 text-base"}`}
    >
      <span className="absolute inset-x-3 top-3 h-1 rounded-full bg-white/40" />
      <span className="relative">{product.initials}</span>
      <span className="absolute inset-x-4 bottom-3 grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <i key={index} className="h-1 rounded-full bg-slate-950/25" />
        ))}
      </span>
    </div>
  );
}

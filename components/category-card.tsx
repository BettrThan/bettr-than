import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/categories";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.slug}`} className="category-card group">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <Image
          unoptimized
          src={category.image}
          alt={category.imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07101f] via-transparent to-transparent" />
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${category.live ? "bg-cyan-300 text-[#07101f]" : "bg-[#07101f]/85 text-slate-200 backdrop-blur"}`}>
          {category.live ? "Compare now" : "New category"}
        </span>
      </div>
      <div className="p-5">
        <p className="section-kicker">{category.kicker}</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-black text-white group-hover:text-cyan-200">{category.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{category.description}</p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
        </div>
      </div>
    </Link>
  );
}

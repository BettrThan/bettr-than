"use client";

import { useId, type ReactNode } from "react";

export type SpecificationRow = { key: string; label: string; left: ReactNode; right: ReactNode; explanation?: string; leftSource?: ReactNode; rightSource?: ReactNode };

export function ComparisonSpecifications({ leftName, rightName, rows }: { leftName: string; rightName: string; rows: SpecificationRow[] }) {
  const id = useId();
  return <div className="comparison-specifications mt-4 overflow-hidden rounded-2xl border border-white/10">
    <table className="w-full table-fixed text-center text-sm">
      <caption className="sr-only">Specifications for {leftName} and {rightName}</caption>
      <colgroup><col /><col className="comparison-specification-label" /><col /></colgroup>
      <thead><tr className="border-b border-white/10 bg-white/[.045]">
        <th id={`${id}-left`} scope="col">{leftName}</th><th scope="col">Specification</th><th id={`${id}-right`} scope="col">{rightName}</th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.key} className="border-b border-white/10 last:border-0">
        <td headers={`${id}-left ${id}-${row.key}`}><div>{row.left}</div>{row.leftSource && <div className="mt-2 text-xs text-slate-400">{row.leftSource}</div>}</td>
        <th id={`${id}-${row.key}`} scope="row" className="bg-white/[.025] font-semibold text-slate-300">{row.label}{row.explanation && <details className="mt-2 text-xs font-normal leading-5 text-slate-400"><summary className="cursor-pointer text-cyan-200">Why it matters</summary><p className="mt-2">{row.explanation}</p></details>}</th>
        <td headers={`${id}-right ${id}-${row.key}`}><div>{row.right}</div>{row.rightSource && <div className="mt-2 text-xs text-slate-400">{row.rightSource}</div>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

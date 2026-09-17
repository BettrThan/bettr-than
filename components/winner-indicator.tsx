"use client";

import type { CSSProperties } from "react";
import { resolveWinner } from "@/lib/winner-indicator";

type Props = {
  leftScore?: number | null;
  rightScore?: number | null;
  leftLabel: string;
  rightLabel: string;
  eligible?: boolean;
  loading?: boolean;
  closeWinThreshold?: number;
  scoreLabel?: string;
};

export function WinnerIndicator({ leftScore, rightScore, leftLabel, rightLabel, eligible = true, loading = false, closeWinThreshold = 3, scoreLabel = "Balanced" }: Props) {
  const { state, close } = resolveWinner(leftScore, rightScore, eligible, loading, closeWinThreshold);
  const winner = state === "left" ? leftLabel : rightLabel;
  const label = state === "loading" ? "Comparison result loading" : state === "unavailable" ? "Not enough shared evidence to declare a winner" : state === "tie" ? `${leftLabel} and ${rightLabel} are tied on the ${scoreLabel} specification score` : `${winner} ${close ? "narrowly leads" : "leads"} on the ${scoreLabel} specification score`;
  const directional = state === "left" || state === "right";

  return <div className="bt-winner" data-winner={state} data-close-win={close} style={{ "--winner-turn": state === "right" ? "180deg" : "0deg" } as CSSProperties}>
    <div className="bt-winner__badge" role="img" aria-label={label} title={`${label}. The wide opening faces the leader; an underline marks a lead of at most ${closeWinThreshold} points.`}>
      <div className="bt-winner__reveal" key={`${state}-${close}`} aria-hidden="true">
        {directional || state === "loading" ? <svg className="bt-winner__glyph" viewBox="0 0 64 64" fill="none">
          <path className="bt-winner__pointer" d="M21 16 L43 32 L21 48" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          {close && <path d="M18 57 H46" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />}
        </svg> : <span className="bt-winner__neutral">{state === "tie" ? "=" : "VS"}</span>}
      </div>
    </div>
    <div className="bt-winner__caption" aria-hidden="true">
      <span>{scoreLabel}</span>
      <strong>{state === "tie" ? "Tied" : state === "loading" ? "Loading" : state === "unavailable" ? "No result" : <>{close ? "Narrow lead" : "Leads"}<span className="bt-winner__horizontal"> · {state === "left" ? "Left" : "Right"}</span><span className="bt-winner__vertical"> · {state === "left" ? "Above" : "Below"}</span></>}</strong>
    </div>
  </div>;
}

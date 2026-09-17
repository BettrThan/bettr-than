export type WinnerState = "left" | "right" | "tie" | "loading" | "unavailable";

/** Use the displayed, eligible scores. Missing evidence must never become a tie. */
export function resolveWinner(left: number | null | undefined, right: number | null | undefined, eligible = true, loading = false, closeThreshold = 3): { state: WinnerState; close: boolean } {
  if (loading) return { state: "loading", close: false };
  const valid = (score: unknown): score is number => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
  if (!eligible || !valid(left) || !valid(right)) return { state: "unavailable", close: false };
  if (left === right) return { state: "tie", close: false };
  return { state: left > right ? "left" : "right", close: Math.abs(left - right) <= Math.max(0, Number.isFinite(closeThreshold) ? closeThreshold : 3) + 1e-9 };
}

/** Stable identity for a pair, regardless of the selected product order. */
export function comparisonPairKey(leftProductId: string, rightProductId: string) {
  return [leftProductId, rightProductId].sort().join(":");
}

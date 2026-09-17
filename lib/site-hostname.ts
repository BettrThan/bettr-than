/** Shared public-host check; callers retain their own normalization rules. */
export function isPublicSiteHostname(hostname: string) {
  return hostname === "bettrthan.com" || hostname === "www.bettrthan.com";
}

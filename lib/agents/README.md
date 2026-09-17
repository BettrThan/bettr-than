# Bettr Than agents

The production MVP separates these jobs instead of giving one model unchecked
write access:

1. **Discovery** accepts an owner-approved manufacturer URL.
2. **Crawler** fetches only allowlisted public manufacturer pages when the
   owner starts an extraction and stores source URL plus retrieval time.
3. **Normalizer** converts units and names into category fields.
4. **Data QA** rejects missing, duplicate, or conflicting facts.
5. **Comparison** uses deterministic rules in `lib/products.ts`; AI may explain
   the result but cannot choose the winner.
6. **Affiliate** resolves outbound offers separately from canonical product
   facts.
7. **Publisher** requires review before a candidate becomes public.

`product-ingestion.ts` implements the allowlist, safe redirect handling,
structured-data extraction, normalization, confidence levels, and conflict
detection. `/admin/ingestion` is the owner review console. Approved candidates
are copied into the public catalog; broad crawling, automatic publishing, and
copied review prose remain intentionally excluded.

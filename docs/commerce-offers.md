# Commerce offer contract

This release adds provider-neutral retailer offers without allowing commercial relationships to influence product scoring or editorial verdicts.

## Data semantics

- Prices are stored as integer minor units. `349.99 USD` is stored as `34999`.
- Each offer belongs to a product, retailer, provider mapping, and stable offer key.
- Every manual save appends a price observation; it does not overwrite history.
- Shipping is nullable. A total is called comparable only when shipping is known and the currency matches.
- Approved offers may appear publicly. Draft and disabled offers remain private.
- Offers become stale seven days after their checked timestamp. Stale data stays visibly labeled.

## Ranking

Public offers are ordered by:

1. In-stock availability
2. Freshness
3. Known shipping cost
4. Lowest comparable total within the same currency
5. Retailer name as a stable tie-breaker

Affiliate commission and sponsorship never affect ranking. Sponsored offers are labeled.

## Provider boundary

`PricingProvider.fetchOffer` accepts a normalized product mapping and returns either a normalized offer or a typed failure. The rest of the application depends only on that interface, so a future authorized retailer or affiliate API can be added without rewriting public pages.

Transient rate-limit and provider-unavailable failures use capped exponential backoff: no more than three attempts and no wait longer than five seconds. The adapter returns only one final result for persistence, preventing retry attempts from creating duplicate observations. Non-transient mapping and validation failures are not retried. A failed refresh does not remove the last known stored offer, whose checked and stale timestamps remain visible.

No live provider is enabled until Bettr Than has approved credentials and program authorization. The manual offer workflow is the safe initial provider.

## Click data

Public retailer links pass through `/go/offer/:id`. The redirect records only offer ID, product ID, and timestamp before sending the visitor to a validated HTTPS destination. It does not store an IP address or user-agent string.

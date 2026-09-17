import { finderCategories, rankFinderProducts, type FinderCategory, type FinderProduct, type FinderPair } from "@/lib/product-finder";
import { isStaleOffer, type PublicOffer } from "@/lib/offers";

/** Report only offers that have already passed the public offer eligibility filter. */
export function commerceReadiness(products: FinderProduct[], pairs: FinderPair[], offers: Map<string, PublicOffer[]>, now = new Date()) {
  return (Object.entries(finderCategories) as Array<[FinderCategory, string]>).map(([category, name]) => {
    const catalog = products.filter(product => product.categorySlug === category && product.status === "published");
    const ranking = rankFinderProducts(category, catalog, pairs, { preset: "balanced", budget: null, requirements: [] });
    const compared = new Set(ranking.results.map(item => item.product.id));
    const rows = catalog.map(product => {
      const visible = offers.get(product.id) ?? [];
      const fresh = visible.filter(offer => offer.availability === "in_stock" && !isStaleOffer(offer, now));
      return {
        product,
        compared: compared.has(product.id),
        freshOffers: fresh.length,
        freshAffiliateOffers: fresh.filter(offer => offer.isAffiliate).length,
        staleOffers: visible.filter(offer => isStaleOffer(offer, now)).length,
      };
    });
    return {
      category, name, rows,
      productCount: catalog.length,
      currentComparisons: ranking.eligiblePairs.length,
      possibleComparisons: catalog.length * (catalog.length - 1) / 2,
      coveredProducts: rows.filter(row => row.freshOffers > 0).length,
      affiliateProducts: rows.filter(row => row.freshAffiliateOffers > 0).length,
      gaps: rows.filter(row => !row.compared || row.freshOffers === 0 || row.staleOffers > 0),
    };
  });
}

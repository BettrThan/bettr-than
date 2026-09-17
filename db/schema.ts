import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    comparisonSlug: text("comparison_slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    dimensionType: text("dimension_type").notNull().default("overall"),
    dimensionKey: text("dimension_key").notNull().default("overall"),
    choiceSlug: text("choice_slug").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_votes_comparison_visitor_dimension").on(
      table.comparisonSlug,
      table.visitorId,
      table.dimensionType,
      table.dimensionKey,
    ),
  ],
);

export const voteAttempts = sqliteTable(
  "vote_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    comparisonSlug: text("comparison_slug").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    networkHash: text("network_hash").notNull(),
    nonceHash: text("nonce_hash").notNull(),
    outcome: text("outcome").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_vote_attempts_nonce").on(table.nonceHash),
    index("idx_vote_attempts_visitor_created").on(table.visitorHash, table.createdAt),
    index("idx_vote_attempts_network_created").on(table.networkHash, table.createdAt),
  ],
);

export const ingestionJobs = sqliteTable(
  "ingestion_jobs",
  {
    id: text("id").primaryKey(),
    submittedBy: text("submitted_by").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceHost: text("source_host").notNull(),
    categorySlug: text("category_slug").notNull(),
    status: text("status").notNull().default("queued"),
    canonicalName: text("canonical_name"),
    brand: text("brand"),
    imageUrl: text("image_url"),
    description: text("description"),
    extractedJson: text("extracted_json"),
    normalizedJson: text("normalized_json"),
    specsJson: text("specs_json").notNull().default("{}"),
    specProvenanceJson: text("spec_provenance_json").notNull().default("{}"),
    specConflictsJson: text("spec_conflicts_json").notNull().default("[]"),
    conflictsJson: text("conflicts_json").notNull().default("[]"),
    errorMessage: text("error_message"),
    reviewNotes: text("review_notes"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("idx_ingestion_jobs_status_created").on(table.status, table.createdAt),
    index("idx_ingestion_jobs_name").on(table.canonicalName),
  ],
);

export const catalogProducts = sqliteTable(
  "catalog_products",
  {
    id: text("id").primaryKey(),
    ingestionJobId: text("ingestion_job_id").notNull(),
    slug: text("slug").notNull(),
    canonicalName: text("canonical_name").notNull(),
    brand: text("brand").notNull(),
    categorySlug: text("category_slug").notNull(),
    sourceUrl: text("source_url").notNull(),
    imageUrl: text("image_url"),
    description: text("description"),
    factsJson: text("facts_json").notNull(),
    specsJson: text("specs_json").notNull().default("{}"),
    specProvenanceJson: text("spec_provenance_json").notNull().default("{}"),
    specConflictsJson: text("spec_conflicts_json").notNull().default("[]"),
    status: text("status").notNull().default("published"),
    publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_catalog_products_job").on(table.ingestionJobId),
    uniqueIndex("idx_catalog_products_slug").on(table.slug),
    index("idx_catalog_products_category").on(table.categorySlug, table.publishedAt),
    index("idx_catalog_products_category_status").on(table.categorySlug, table.status),
  ],
);

export const comparisons = sqliteTable(
  "comparisons",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    pairKey: text("pair_key").notNull(),
    categorySlug: text("category_slug").notNull(),
    leftProductId: text("left_product_id").notNull(),
    rightProductId: text("right_product_id").notNull(),
    createdBy: text("created_by").notNull(),
    status: text("status").notNull().default("published"),
    verdict: text("verdict"),
    verdictStatus: text("verdict_status").notNull().default("missing"),
    verdictHeadline: text("verdict_headline"),
    verdictBuyLeft: text("verdict_buy_left"),
    verdictBuyRight: text("verdict_buy_right"),
    verdictEvidenceJson: text("verdict_evidence_json").notNull().default("[]"),
    verdictPreset: text("verdict_preset"),
    verdictScoringVersion: text("verdict_scoring_version"),
    verdictDataVersion: text("verdict_data_version"),
    verdictDraftedAt: text("verdict_drafted_at"),
    verdictApprovedAt: text("verdict_approved_at"),
    coveragePercent: integer("coverage_percent").notNull().default(0),
    scoringVersion: text("scoring_version").notNull().default("headphones-v1-legacy"),
    eligibilityJson: text("eligibility_json").notNull().default("{}"),
    approvedAt: text("approved_at"),
    publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_comparisons_slug").on(table.slug),
    uniqueIndex("idx_comparisons_pair").on(table.pairKey),
    index("idx_comparisons_category").on(table.categorySlug, table.publishedAt),
    index("idx_comparisons_category_status").on(table.categorySlug, table.status),
  ],
);

export const discoveryDemand = sqliteTable(
  "discovery_demand",
  {
    useCase: text("use_case").primaryKey(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
);

export const retailers = sqliteTable(
  "retailers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    homepageUrl: text("homepage_url").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    affiliateStatus: text("affiliate_status").notNull().default("none"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_retailers_slug").on(table.slug),
    index("idx_retailers_enabled_name").on(table.enabled, table.name),
  ],
);

export const productRetailerMappings = sqliteTable(
  "product_retailer_mappings",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    retailerId: text("retailer_id").notNull(),
    providerKey: text("provider_key").notNull().default("manual"),
    providerProductId: text("provider_product_id"),
    status: text("status").notNull().default("approved"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_product_retailer_mapping").on(table.productId, table.retailerId, table.providerKey),
    index("idx_product_retailer_mapping_status").on(table.status, table.productId),
  ],
);

export const retailerOffers = sqliteTable(
  "retailer_offers",
  {
    id: text("id").primaryKey(),
    offerKey: text("offer_key").notNull(),
    productId: text("product_id").notNull(),
    retailerId: text("retailer_id").notNull(),
    mappingId: text("mapping_id"),
    providerKey: text("provider_key").notNull().default("manual"),
    sourceType: text("source_type").notNull().default("manual"),
    destinationUrl: text("destination_url").notNull(),
    priceMinor: integer("price_minor").notNull(),
    shippingMinor: integer("shipping_minor"),
    totalPriceMinor: integer("total_price_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    availability: text("availability").notNull().default("unknown"),
    status: text("status").notNull().default("approved"),
    isAffiliate: integer("is_affiliate", { mode: "boolean" }).notNull().default(false),
    isSponsored: integer("is_sponsored", { mode: "boolean" }).notNull().default(false),
    lastCheckedAt: text("last_checked_at").notNull(),
    staleAfterAt: text("stale_after_at").notNull(),
    providerError: text("provider_error"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_retailer_offers_identity").on(table.productId, table.retailerId, table.offerKey),
    index("idx_retailer_offers_public").on(table.productId, table.status, table.availability),
    index("idx_retailer_offers_retailer").on(table.retailerId, table.status),
  ],
);

export const priceObservations = sqliteTable(
  "price_observations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offerId: text("offer_id").notNull(),
    priceMinor: integer("price_minor").notNull(),
    shippingMinor: integer("shipping_minor"),
    totalPriceMinor: integer("total_price_minor").notNull(),
    currency: text("currency").notNull(),
    availability: text("availability").notNull(),
    sourceType: text("source_type").notNull(),
    observedAt: text("observed_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_price_observations_offer_time").on(table.offerId, table.observedAt)],
);

export const offerClicks = sqliteTable(
  "offer_clicks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    offerId: text("offer_id").notNull(),
    productId: text("product_id").notNull(),
    clickedAt: text("clicked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_offer_clicks_offer_time").on(table.offerId, table.clickedAt)],
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventName: text("event_name").notNull(),
    journeyId: text("journey_id"),
    categorySlug: text("category_slug"),
    comparisonSlug: text("comparison_slug"),
    productIdsJson: text("product_ids_json").notNull().default("[]"),
    presetKey: text("preset_key"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    recordedAt: text("recorded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_analytics_event_time").on(table.eventName, table.recordedAt),
    index("idx_analytics_comparison_time").on(table.comparisonSlug, table.recordedAt),
  ],
);

export const researchBatches = sqliteTable("research_batches", {
  id: text("id").primaryKey(),
  digest: text("digest").notNull(),
  title: text("title").notNull(),
  categorySlug: text("category_slug").notNull(),
  payloadJson: text("payload_json").notNull(),
  baselineJson: text("baseline_json").notNull(),
  status: text("status").notNull().default("pending"),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
}, (table) => [index("idx_research_batches_status_time").on(table.status, table.uploadedAt)]);

export const researchPublications = sqliteTable("research_publications", {
  batchId: text("batch_id").primaryKey(),
  accepted: integer("accepted").notNull(),
  approvedBy: text("approved_by").notNull(),
  approvedAt: text("approved_at").notNull(),
}, (table) => [check("research_publication_preconditions", sql`${table.accepted} = 1`)]);

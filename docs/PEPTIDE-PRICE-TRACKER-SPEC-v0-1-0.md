# Peptide Price Tracker Spec

v0.1.0 - Theo ☠️ - 2026-05-31

## Purpose

Create an Ascending Research Hub price-intelligence lane modeled on the useful behavior of Peptide Critic's public peptide price index, without copying their brand or relying on manual edits.

The tracker should answer:

- Which research peptides have the lowest public benchmark $/mg range?
- Which peptides have the deepest public 30-day price drops?
- Which compounds have the broadest vendor coverage?
- Which sources contributed the observation?
- How fresh and trustworthy is each observation?

This is not a commerce recommendation, medical tool, dosing tool, or vendor endorsement.

## Current Baseline

Source: `https://peptidecritic.com/peptide-price-index`

Collected: 2026-05-31

Files:

- `data/peptide-price-tracker-baseline-v0-1-0.json`
- `data/peptide-price-tracker-baseline-v0-1-0.csv`
- `data/price-source-registry-v0-1-0.json`
- `peptide-price-tracker.html`

Extracted baseline:

- 80 peptide rows
- 2,688 vendor observations, calculated by summing public vendor counts
- 2,232 in-stock observations, calculated by summing public in-stock counts
- 13 category lanes including Weight Loss, Healing, Longevity, Growth Hormone, Cognition, Energy, and Performance

Important parsing note: trend values of `9999.0` appear to behave like a new/no-prior-data sentinel. The UI treats those as `New`, not as a literal 9,999% price increase.

## Normalized Row Schema

Each price observation row should keep this shape:

```json
{
  "source": "peptidecritic",
  "source_url": "https://peptidecritic.com/peptide-price-index",
  "nid": "72",
  "slug": "glp3-r",
  "name": "GLP3-R",
  "canonical_title": "glp3-r",
  "synonyms": ["retatrutide", "ly3437943"],
  "category": "Weight Loss",
  "min_price_per_unit": 2.77,
  "max_price_per_unit": 13.0,
  "unit": "mg",
  "data_min_price": 2.772,
  "trend_30d_percent": -1.2,
  "vendor_count": 64,
  "in_stock_count": 56,
  "click_count": 9244,
  "size_min": 2.5,
  "size_max": 200.0,
  "display_sizes": "6-50mg +42 other sizes",
  "detail_url": "https://peptidecritic.com/peptides/glp3-r",
  "has_drawer": true
}
```

## How To Add Other Websites

Add each source to `data/price-source-registry-v0-1-0.json` before scraping it.

Every source needs:

- `source_id`: stable lowercase slug
- `base_url`, `seed_url`, and `robots_url`
- `crawl_status`: allowed, blocked, pending, or authorized-only
- `terms_status`: verified, not verified, or blocked from CLI
- `requires_login`: true only if we have explicit authorization
- `collection_method`: API, public HTML, sitemap, RSS/feed, Shopify/WooCommerce public product JSON, or browser-rendered public page
- `selector_map`: row and field selectors if HTML-based
- `rate_limit_seconds`: default 3 seconds minimum unless the site states otherwise
- `attribution`: required link or source note
- `notes`: any caveats

Recommended collector order:

1. Public API or structured JSON if available and allowed.
2. Public product/feed endpoints such as sitemap, RSS, Shopify product JSON, or WooCommerce public routes.
3. Public static HTML table/card extraction.
4. Browser-rendered extraction only for pages that require JavaScript rendering, without bypassing captchas or login walls.
5. Web-monitor snapshots for change detection after initial source approval.

## Compliance Rules

- Check robots.txt before crawling.
- Attempt terms/privacy review; document when blocked by Cloudflare or similar.
- Do not scrape login-only, paywalled, private, or account-specific data without explicit authorization.
- Do not collect PII.
- Use slow, polite requests and preserve source attribution.
- Store raw snapshots only when useful for audit/debugging; normalized public facts are the production output.
- Keep RUO-only framing visible in the UI.

## Future Data Model

For a real backend, split the static baseline into these tables:

- `price_sources`: one row per approved source.
- `peptides`: canonical compound identity, synonyms, category.
- `vendors`: canonical vendor identity, public URL, status.
- `price_offers`: source-specific offer rows with size, unit, price, stock state, and URL.
- `price_observations`: time-series snapshots of normalized prices and counts.
- `source_snapshots`: audit records for crawl time, HTTP status, hash, and parser version.

## Next Build Pass

- Add an ingestion script under `scripts/` that reads `data/price-source-registry-v0-1-0.json`.
- Add source freshness and last-checked timestamps to the UI.
- Add cross-source dedupe so GLP3-R, Retatrutide, Reta, and LY3437943 can collapse into one canonical profile.
- Add source confidence scoring based on freshness, COA visibility, stock clarity, and public traceability.
- Add a scheduled monitor for source changes after each source passes compliance review.

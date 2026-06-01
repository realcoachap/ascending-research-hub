# Ascending Research Hub

v0.5.17 — Theo 🧪 — 2026-06-01

Premium static hub prototype for separating Ask Theo AI research intelligence, calculation tools, batch verification, reference notes, FAQ/compliance, and a future research-use-only commerce lane. Includes a local/proxyable Theo API test server at `api/ask-theo-server.mjs` with Gemini/Groq cloud-first mode, Ollama/Qwen local fallback, hosted HTTPS tunnel test endpoint, source/compound evidence metadata, provider timeout fallback, public source-bucket rendering for creator/community claims, and API-layer guardrails that allow source-tiered reported-claim analysis while blocking personalized/protocol guidance.

## Current live destinations

- Ask Theo Research Analyst: https://realcoachap.github.io/ascending-research-hub/ask-ai.html
- Peptide Price Tracker: https://realcoachap.github.io/ascending-research-hub/peptide-price-tracker.html
- Shop Preview Page: https://realcoachap.github.io/ascending-research-hub/shop.html
- Shop Alpha Napkin Prototype: `shop-alpha.html`
- Production Shop Auth Spec: `docs/SHOP-AUTH-SPEC.md`
- COA Verification Page: https://realcoachap.github.io/ascending-research-hub/coa.html
- Research Concentration Calculator: https://realcoachap.github.io/research-concentration-calculator/
- Peptide Education Preview: https://realcoachap.github.io/ascending-peptides-preview/
- Janoshik Public Tests: https://public.janoshik.com/
- Finnrick Certificate Verify: https://www.finnrick.com/verify
- Freedom Diagnostics Testing: https://freedomdiagnosticstesting.com/

## Peptide Price Tracker

The first tracker baseline lives in `data/peptide-price-tracker-baseline-v0-1-0.json` and `.csv`, seeded from Peptide Critic's public price index on 2026-05-31. `docs/PEPTIDE-PRICE-TRACKER-SPEC-v0-1-0.md` defines the source registry, compliance review, and multi-source ingestion model for adding more websites.

## Guardrails

- No medical advice
- No treatment claims
- No dosing recommendations
- Reported dosing/use claims can be discussed only as labeled claims with evidence tier, uncertainty, and risk context
- No protocol instructions
- Store/commercial lane remains research-use-only and separate from calculator/reference UX


## Ask Theo API test server

Run locally from this folder:

```bash
PORT=8787 OLLAMA_MODEL=qwen3:8b node api/ask-theo-server.mjs
# optional hosted-model mode:
# PORT=8787 OPENAI_API_KEY=your_key_here node api/ask-theo-server.mjs
```

Then open `ask-ai.html` from a local static server on the same origin/proxy, or use the page's Endpoint button to set `http://127.0.0.1:8787/api/ask-theo`. If no API key is set, the server returns safe local fallback responses so the chat wire can still be tested.

Current hosted test endpoint: `https://crops-reggae-commit-programme.trycloudflare.com/api/ask-theo`

## Theo knowledge ingestion

Theo now supports a local curated source store in `knowledge/` plus `scripts/add-theo-source.mjs`. Feed it transcripts, paper abstracts, notes, labels, or COA text; the API retrieves relevant chunks, passes source context into answers, and the `ask-ai.html` client renders returned source cards below the chat response.

`knowledge/compound-map.json` provides the first safe literacy map for common peptide, supplement, mitochondrial, metabolic, incretin, repair, immune, cognitive, hormone, and longevity-adjacent compounds. It lets Theo answer “what is SLU-PP-332?” or “tell me about MOTS-c” as an educational profile before deeper source coverage exists, while still blocking personalized dosing or protocol requests.

Current coverage can be inspected locally at `GET /api/theo-compounds`. Initial PubMed-backed source notes, peptide-purity standards, and researcher-media source indexes live in `knowledge/source-notes/` and have been ingested into `knowledge/theo-chunks.jsonl`. Public Ask Theo responses bucket creator/community material by evidence class unless the user explicitly asks for exact provenance.

# Ascending Research Hub

v0.5.1 — Theokoles ☠️ — 2026-05-22

Premium static hub prototype for separating Ask Theo AI education, calculation tools, batch verification, reference notes, FAQ/compliance, and a future research-use-only commerce lane. Includes a local/proxyable Theo API test server at `api/ask-theo-server.mjs`.

## Current live destinations

- Ask Theo AI Coach: https://realcoachap.github.io/ascending-research-hub/ask-ai.html
- Shop Preview Page: https://realcoachap.github.io/ascending-research-hub/shop.html
- COA Verification Page: https://realcoachap.github.io/ascending-research-hub/coa.html
- Research Concentration Calculator: https://realcoachap.github.io/research-concentration-calculator/
- Peptide Education Preview: https://realcoachap.github.io/ascending-peptides-preview/
- Janoshik Public Tests: https://public.janoshik.com/
- Finnrick Certificate Verify: https://www.finnrick.com/verify
- Freedom Diagnostics Testing: https://freedomdiagnosticstesting.com/

## Guardrails

- No medical advice
- No treatment claims
- No dosing recommendations
- No protocol instructions
- Store/commercial lane remains research-use-only and separate from calculator/reference UX


## Ask Theo API test server

Run locally from this folder:

```bash
PORT=8787 OPENAI_API_KEY=your_key_here node api/ask-theo-server.mjs
```

Then open `ask-ai.html` from a local static server on the same origin/proxy, or use the page's Endpoint button to set `http://127.0.0.1:8787/api/ask-theo`. If no API key is set, the server returns safe local fallback responses so the chat wire can still be tested.

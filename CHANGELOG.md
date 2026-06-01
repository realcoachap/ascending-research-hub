# Changelog

## [Unreleased]
### Added
- Added a fresh Ask Theo character pass that positions Theo as Ascending Research's source-aware research analyst, separate from Ascending Aminos and commerce.
- Added explicit claim-analysis handling for reported/user/creator/media dosing or use claims, with evidence tier, uncertainty, risk context, and verification framing.
- Added source and compound evidence cards to Ask Theo answers so retrieved PubMed/reference/media context is visible under the chat response.
- Added a 47-compound Theo literacy map covering common peptide, mitochondrial, metabolic, incretin, repair, immune, cognitive, hormone, and longevity-adjacent topics.
- Added initial PubMed-backed source packs for SLU-PP-332 and MOTS-c.
- Added peptide purity standards source pack for COA/purity guidance.
- Added The Biohacking Specialist YouTube channel scan as a researcher-media source index for future transcript ingestion.
- Added Vigorous Steve YouTube channel scan as a researcher-media source index for peptides, HGH, anabolics, TRT, bloodwork, and bodybuilding pharmacology topics.
- Expanded the Vigorous Steve source index with most-popular overall videos and recent RSS coverage from January-May 2026.
- Added `GET /api/theo-compounds` for exposing Theo's current compound literacy coverage.

### Changed
- Updated Ask Theo page copy, intro prompt, quick prompts, local fallback behavior, API system prompt, README notes, and service-worker cache version for the fresh character reset.
- Preserved personalized-use blocks while allowing non-personal reported-claim questions to flow into claim analysis instead of disclaimer-only refusal.
- Hardened Ask Theo client rendering by escaping user/API text before formatting chat bubbles.
- Added provider request timeouts to the Ask Theo API so a slow local Ollama/model endpoint falls back instead of hanging the chat.
- Tuned Ask Theo prompting so compound-name questions such as SLU-PP-332 and MOTS-c return educational profiles instead of disclaimer-only responses.
- Tightened retrieval so peer-reviewed sources are only attached when query terms actually match.
- Added compound-answer cleanup so non-use literacy questions do not end with generic medical boilerplate.
- Fixed Ask Theo endpoint persistence so a saved endpoint overrides the temporary hosted tunnel on reload.
- Updated Theo purity guidance so MOTS-c uses >=99% HPLC purity plus MS/LC-MS identity confirmation as the premium target, while describing 95% as a lower/minimum research-grade spec.
- Narrowed the personalized-use detector so COA verification questions like “What should I verify?” do not trigger the dosing boundary.
- Narrowed the personalized-use detector so source-evaluation wording like “how should I treat this creator's SLU-PP-332 content?” does not trigger the dosing boundary.

## [0.5.12] - 2026-05-22
### Added
- Added persistent Light / Balanced / Dark theme toggle across Hub, Ask Theo, COA, and Shop pages.


## [0.5.11] - 2026-05-22
### Added
- Added in-chat Theo language controls under the chat composer for English, Spanish, Portuguese, and French responses.

### Changed
- Updated Theo API prompt so he clearly supports multilingual education responses instead of saying he is English-only.


## [0.5.10] - 2026-05-22
### Changed
- Standardized the English/Spanish toggle across pages as a compact globe icon control.


## [0.5.9] - 2026-05-22
### Changed
- Rebranded public-facing Theo visuals from skull/Shadow styling to lab/science 🧪 styling for Ascending Research.


## [0.5.8] - 2026-05-22
### Changed
- Condensed Ask Theo layout: moved online/API status into the chat header and placed FAQ quick prompts below the chat so Theo Chat sits higher and feels primary.


## [0.5.7] - 2026-05-22
### Added
- Added Theo knowledge base scaffold: source registry, chunk store, source intake template, ingestion helper script, and knowledge pipeline doc.
- Wired Theo API to retrieve relevant curated source chunks and include source metadata in API responses.


## [0.5.6] - 2026-05-22
### Changed
- Loosened Theo guardrails for compound-plus-label-number questions like “tell me more about NAD+ 1000” so they answer as product/label education instead of stopping at a warning.


## [0.5.5] - 2026-05-22
### Changed
- Added Gemini/Groq cloud-first provider order for much faster Theo responses, with OpenAI/Ollama fallback.
- Added deterministic handling for dosing-unit questions and post-filtering for unsafe educational dosing-range output.


## [0.5.4] - 2026-05-22
### Changed
- Adjusted Theo dosing guardrails to allow general research-reference/labeling context with hard disclaimers while still blocking personalized dosing, protocol, injection, cycle, stack, or “what should I take” guidance.


## [0.5.3] - 2026-05-22
### Changed
- Pointed Ask Theo frontend at the hosted HTTPS test API endpoint for mobile/browser testing.


## [0.5.2] - 2026-05-22
### Changed
- Updated Theo API server to use local Ollama/Qwen by default when no OpenAI key is present.
- Added API-layer safety boundary for dosing/protocol/use questions before model calls.


## [0.5.1] - 2026-05-22
### Added
- Added `api/ask-theo-server.mjs`, a local/proxyable Theo API test server with OpenAI Responses API support and safe fallback mode.

### Changed
- Upgraded `ask-ai.html` into a fuller chat-room layout with sidebar, online status, message avatars, typing state, endpoint configuration, clear-chat action, and API-backed send flow.


## [0.5.0] - 2026-05-22
### Added
- Added `ask-ai.html`, a first-run Theo education coach prototype with medical/dosing disclaimers, quick prompts, and static educational responses.

### Changed
- Changed the primary Hub education destination and shared bottom dock label from Learn to Ask AI.
- Updated hub copy to position Theo as the education-first AI layer separate from the shop lane.


## [0.4.1] - 2026-05-21
### Added
- Added persistent English/Spanish language toggle to hub, COA, and shop preview pages.
- Added Spanish translations for the shared floating dock and compliance/trust copy.


## [0.4.0] - 2026-05-21
### Added
- Added dedicated `shop.html` research-use commerce preview page.
- Upgraded hub hero, proof points, trust architecture section, and Shop routing for a more premium benchmark-beating direction.


## [0.3.3] - 2026-05-21
### Fixed
- Normalized floating dock HTML/CSS so hub and COA use the exact same shared dock component.


## [0.3.2] - 2026-05-21
### Changed
- Standardized floating dock labels across pages: Hub, Calc, Learn, COA, Shop.
- Added Shop dock button routed to the hub store lane.


## [0.3.1] - 2026-05-21
### Changed
- Replaced the top sticky menu with a floating long-oval bottom dock on the hub and COA pages.


## [0.3.0] - 2026-05-21
### Added
- Added sticky, horizontally scrollable menu bars for easier clicking/tapping on the hub and COA pages.
- Added direct menu access to Calculator, Education, COA checks, and Compliance destinations.


## [0.2.2] - 2026-05-21
### Fixed
- Removed leftover COA-specific styles from the hub page after moving COA content to the dedicated page.


## [0.2.1] - 2026-05-21
### Changed
- Moved Batch + COA Verification from an in-page section to a dedicated `coa.html` destination page.
- Updated the hub COA tile and navigation to route to the dedicated COA page.


## [0.2.0] - 2026-05-21
### Added
- Added Batch + COA Verification section with Janoshik, Finnrick, and Freedom Diagnostics external lab links.
- Added COA reading checklist and compliance-safe transparency copy.

### Changed
- Linked the peptide education preview and Ascending Research Hub as reciprocal live destinations.

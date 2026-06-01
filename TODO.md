# TODO

## 2026-05-21 Task: Link education preview and research hub
- [x] Add visible link from peptide education preview back to Ascending Research Hub
- [x] Link Ascending Research Hub education lane to live peptide education preview
- [x] Verify static pages still render locally

## 2026-05-21 Task: Build COA verification lane
- [x] Add third-party lab portal cards
- [x] Add COA reading checklist
- [x] Keep wording compliance-safe and research-transparency focused
- [ ] Future: add paste-a-COA/link checker mockup

## 2026-05-21 Task: Dedicated COA page routing
- [x] Create standalone COA lab directory page
- [x] Update hub COA tile to route to COA page
- [x] Update service worker cache for new page

## 2026-05-21 Task: Crisp menu bar
- [x] Add sticky menu bar to hub page
- [x] Add sticky menu bar to COA page
- [x] Include large tap targets and horizontal mobile scrolling

## 2026-05-21 Task: Floating bottom dock
- [x] Move hub navigation to bottom floating oval dock
- [x] Move COA navigation to bottom floating oval dock

## 2026-05-21 Task: Uniform dock with Shop
- [x] Standardize dock labels across hub and COA pages
- [x] Add Shop dock button routed to store lane

## 2026-05-21 Task: Normalize dock component
- [x] Confirm hub and COA use identical floating dock HTML/CSS

## 2026-05-21 Task: Premium benchmark pass
- [x] Add dedicated shop preview page
- [x] Upgrade hub positioning and trust architecture
- [x] Route Shop dock button to shop page

## 2026-05-21 Task: Spanish translation pass
- [x] Add persistent EN/ES toggle to hub, COA, and shop pages
- [x] Translate visible static hub/COA/shop copy and shared dock labels


## 2026-05-22 Task: Ask Theo AI education coach
- [x] Add first-run Ask Theo chat prototype page
- [x] Include education-only intro and dosing/medical disclaimer
- [x] Change Hub education card and shared dock label from Learn to Ask AI
- [x] Keep shop lane separate from AI education lane
- [x] Add local/proxyable API test server for wired chat testing
- [x] Run Theo locally on Ollama/Qwen3 8B
- [x] Add hard API safety block for dosing/protocol questions
- [x] Upgrade Ask Theo UI to feel more like a chat room
- [x] Host Theo API behind HTTPS test endpoint for mobile/browser testing
- [x] Tune dosing guardrails for educational reference context vs personalized protocol guidance
- [x] Add fast cloud-first provider path for Theo API
- [x] Keep local Ollama as fallback instead of primary response path
- [x] Loosen product/label-number education questions such as NAD+ 1000
- [ ] Future: replace temporary tunnel with production stable API domain
- [ ] Future: connect Theo to real knowledge base and production safe AI backend


## 2026-05-22 Task: Theo curated source brain
- [x] Add source registry and chunk store
- [x] Add ingestion helper for transcripts/papers/labels/social notes
- [x] Wire Theo API to retrieve curated source context
- [x] Add first-pass compound literacy map for peptide/supplement education answers
- [x] Add PubMed source packs for SLU-PP-332 and MOTS-c
- [x] Add public compound coverage endpoint for Ask Theo
- [x] Strip generic medical boilerplate from non-use compound literacy answers
- [x] Add peptide purity standards source pack
- [x] Set MOTS-c premium purity guidance to >=99% HPLC plus MS/LC-MS identity confirmation
- [x] Allow COA verification "should I verify" questions without tripping dosing boundary
- [x] Add The Biohacking Specialist channel scan as researcher-media source index
- [x] Add Vigorous Steve channel scan as researcher-media source index
- [x] Add Vigorous Steve most-popular and recent-six-month video priority lists
- [ ] Future: pull transcript claim cards from The Biohacking Specialist priority peptide videos
- [ ] Future: pull transcript claim cards from Vigorous Steve priority peptide/HGH/bloodwork videos
- [ ] Future: add transcript fetchers for YouTube/Rumble/X where APIs/exports allow
- [ ] Future: add source review UI and evidence scoring


## 2026-06-01 Task: Ask Theo source-aware chat pass
- [x] Show returned curated sources under Theo answers
- [x] Show matched compound chips under Theo answers
- [x] Escape chat text before formatting to avoid unsafe HTML rendering
- [x] Add provider timeout fallback so slow model endpoints do not hang the chat
- [ ] Future: add a dedicated source-review/admin screen for approving claim cards

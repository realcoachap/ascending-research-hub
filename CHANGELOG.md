# Changelog

## [Unreleased]

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

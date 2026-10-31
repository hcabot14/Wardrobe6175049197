# Reference registration prototype — October 31, 2026

The owner verified the January 13 Lisbon test's face and OW-012 likeness after thirteen actual original files were manually attached to ChatGPT Create image. This does not establish automatic reference transfer.

Development connector additions:
- prepare_outfit_references resolves one exact saved owned outfit server-side; model-selected arbitrary URLs and garment lists are not accepted. It requires the current owner/client/trip/snapshot grant, a matching saved proposal, current catalog, full photo counts and approved face manifest.
- Returns public package metadata plus hidden component-only reference bytes; no bearer token or storage URL. Maximum 32 files, 12 MB each, 36 MB total; PNG/JPEG sniffing; rechecks trip/expiry after reads. Purchase-product looks explicitly unsupported until their references are verified.
- A credential-free UI resource uses the documented host uploadFile and setWidgetState/imageIds APIs, records host-provided file IDs only after upload succeeds, and retains completed IDs during partial retries. Missing APIs and expiry fail explicitly. It never invokes a paid model API, writes a proposal or completes a trip.

Local checks passed using bundled Node and mock network/host APIs: connector-mcp.test.cjs and reference-widget.test.cjs. Actual-byte preservation, resource discovery, cached URI compatibility, snapshot and proposal isolation, private metadata projection, partial retry, missing API and expiry checks are included.

Owner explicitly approved deployment after automatic review requested production-specific permission. Development function versions 7–10 were deployed; v10 adds backwards-compatible cached component URIs. v9 deployment was initially held when a test referenced a stale cached ESM resource URI; the test was corrected to resolve the resource URI from the descriptor and passed before deployment.

Live results: real prepare_outfit_references returned awaiting_file_registration with the correct 13 files. The old project conversation reached its length limit. A fresh Wardrobe project chat also prepared the package, initially showed a component loading error, then showed Opened after a compatibility correction and Retry. No successful host file-registration IDs or automatic image-generation conditioning have yet been verified. Do not describe automatic transfer as fixed. The 21-outfit saved proposal remains untouched by this test.

The user reports some displayed images remain black in their lower portion. The original photos in Wardrobe are confirmed complete by the user; do not interpret this as missing source photos or access Downloads to diagnose it. The existing full generated screenshot does not establish the cause of their display problem.

Official API reference: https://developers.openai.com/plugins/reference (host uploadFile, structured widget state/imageIds, UI resources, hidden result metadata).

# Wardrobe connector: development setup and verification

## What is built

`supabase/functions/wardrobe-connector-dev/` is a separate, dependency-free stateless MCP JSON transport. It does not change the production `wardrobe-handoff` service or the live frontend. No model API is called.

The five tools use OAuth-protected server-side calls to the existing private handoff service. Catalog and reference manifests are explicit public projections. Reference photographs become MCP image content. Render input uses ChatGPT's `openai/fileParams` schema; server downloads are restricted to exact configured HTTPS origins, reject redirects and credentials, have timeouts and stream-size limits, and sniff PNG/JPEG signatures. Completion loads the saved plan server-side and delegates completeness checks to the existing handoff service.

Every private call verifies the bearer token using Supabase Auth `/user`, then checks issuer, subject, audience, authenticated role, issue/expiry/not-before times, OAuth client allowlist and `openid` scope. A valid app session is deliberately not a connector token. A server-side `connector_grant` must approve the exact user, wardrobe, trip, snapshot, OAuth client, access scopes and expiry. The underlying handoff token never goes to ChatGPT. Endpoints are fixed by server configuration, not read from model inputs or trip records.

## Current status — October 30, 2026

- All nine local test files passed through the bundled Node runtime, plus `git diff --check`. The new MCP tests use a simulated Auth authority and simulated backend. They do not prove a real OAuth exchange or installation. Existing Edge Function tests used Node TypeScript stripping in isolated wrappers. A standalone CLI/CI run has not been performed for this revision.
- The recipient conversation's real unauthenticated Python GET and POST probes failed with DNS resolution errors. No private credential was included.
- The Wardrobe project's public OAuth discovery URL returned 404. Its OAuth configuration has not been changed.
- Existing database/storage policies allow an authenticated owner access to all their own records/photos. They do not distinguish ordinary app sessions from third-party OAuth sessions. Enabling OAuth now without adapting these policies would grant broader direct access than a trip-only connector intends.
- After explicit user approval, `wardrobe-connector-dev` was deployed as version 2. Live initialization, five-tool discovery and protected-resource metadata returned HTTP 200. A private call returned an MCP tool error: `Connector authentication is not configured`. No OAuth client or trip grant was configured. Version 1 revealed a gateway path mismatch; version 2 fixes the exact shortened path Supabase passes to the function. The path regression test passed.
- No new frontend was published and no branch was merged. Public connector discovery and locked behavior are live-verified; OAuth, private image download, generated-render upload and completed UI return remain unverified.

## Required setup before private access

1. Completed: user approved deployment of the separate development endpoint. Its body implements authentication; platform `verify_jwt=false` is needed for public MCP discovery and OAuth challenges. Tool discovery contains schemas only. Without configured client IDs, all private operations fail closed.
2. Review all exposed-table and storage RLS policies before enabling Supabase OAuth. Add restrictive policies preventing OAuth `client_id` tokens from using ordinary owner APIs directly. Preserve normal owner app access and test read/write sync. Do not just add a permissive policy; policies normally OR together. The connector's backend uses service credentials only inside the server and filters every record by the verified owner.
3. Enable Supabase OAuth 2.1 server and provide an actual consent UI. Use its authorization-code + S256 PKCE flow, exact registered ChatGPT callback, and established Supabase token issuance. Do not implement a custom authorization server or use a bearer token embedded in a URL. The standalone consent UI and trip withdrawal flow are implemented in `connector.html` and `connector/approval/`, with passing simulated-backend tests; publication and real OAuth tests remain outstanding. Ordinary Wardrobe sign-in does not grant connector access.
4. Register a dedicated ChatGPT OAuth client. Set `WARDROBE_MCP_CLIENT_IDS` to that client's exact ID. Configure an access-token hook so only this client's OAuth access tokens have `aud` equal to the exact development MCP resource URL. Keep existing app token audiences unchanged. The bridge requires `scope` to contain `openid`. Verify these actual claims after login without printing tokens.
5. The standalone approval control is implemented but not published or OAuth-configured. It creates an owner-scoped `records` row (`kind=connector_grant`, `id=trip ID`) with `data={clientId,tripId,snapshot,scopes:["wardrobe.read","wardrobe.write"],expiresAt}`. Expiry must not outlive the handoff. Revoke by expiring/deleting that grant. The connector does not let an OAuth tool call create or widen its own grant. Preparing a new snapshot requires new approval.
6. Install the custom connector in ChatGPT and test only the selected development trip. This is an action-time approval step because it grants access to private photos and proposal writes. Availability on the user's physical phone must be established directly.
7. Determine the actual trusted ChatGPT file-delivery origin from the installed file input, verify it belongs to the official file service, and set `WARDROBE_MCP_FILE_ORIGINS` to its exact HTTPS origin. Empty defaults reject all render downloads. Do not add wildcards or accept arbitrary file URLs to make a test pass. ChatGPT delivery of generated images to file inputs remains unverified.

## Acceptance gates

- Real OAuth discovery, PKCE, consent, token renewal, denial and revocation work.
- Unauthenticated, expired, forged, wrong-audience, wrong-client, wrong-user and unapproved-trip calls fail.
- Normal Wardrobe sync still works; OAuth tokens cannot bypass trip restrictions through REST/storage.
- MCP returns and the recipient actually inspects every required sheet and face, then selected full references.
- Real catalog mismatch, fabricated garment IDs and stale snapshots are rejected by the existing backend.
- A generated PNG/JPEG is delivered through the real ChatGPT file input, uploaded, retrieved and visually checked.
- Completion rejects missing images; a finished proposal appears in Wardrobe for owner review.
- Physical phone route, copy/paste, plugin availability and return are tested.
- No metered model API calls. Do not claim the connector works end-to-end until all applicable gates pass.

## Sources

- [OpenAI authentication](https://developers.openai.com/plugins/build/auth)
- [OpenAI file tool inputs](https://developers.openai.com/plugins/reference)
- [Supabase OAuth MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase OAuth token security](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Supabase Edge MCP hosting](https://supabase.com/docs/guides/ai-tools/byo-mcp)


Approval preparation and the rolled-back RLS test are recorded in `tests/CONNECTOR-APPROVAL-20261030.md`. The current Supabase enable form and ChatGPT plugin form are prepared but have not been submitted.

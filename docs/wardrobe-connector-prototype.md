# Wardrobe connector prototype (development only)

This is a proposed **tool contract**, not an installed ChatGPT plugin or a deployed service. It preserves the existing private Supabase handoff rather than introducing public image URLs.

## Intended flow

1. Wardrobe creates a trip handoff with a snapshot ID and short-lived scoped access.
2. User opens their saved Wardrobe ChatGPT project link and pastes the request. Browser links cannot auto-select a ChatGPT project and submit an arbitrary prompt.
3. A dedicated Wardrobe connector authenticates the user and exposes narrowly scoped tools:
   - `get_trip_bundle(trip_id)`: return instructions, catalog, currentCatalog, image manifest and snapshot.
   - `get_reference_image(trip_id, kind, id)`: return actual image content for visual inspection, not just an image URL or base64 text. Require the connector runtime to support image content.
   - `save_proposal(trip_id, snapshot, proposal)`: validate against live garment IDs and snapshot; stage a proposal.
   - `upload_render(trip_id, proposal_id, image)`: accept generated image bytes if supported by the ChatGPT plugin runtime.
   - `complete_proposal(trip_id, proposal_id)`: verify all required images exist before marking complete.
4. Wardrobe displays the returned plan after verification.

## Access and security

Use OAuth or a server-side session binding rather than exposing the handoff bearer token to the model, browser URL, GitHub source, or logs. Enforce user, wardrobe, trip, snapshot, token expiry, per-object allowlists, and read/write scope server-side. Do not put service-role keys in frontend code. Do not create public photo links. Reject stale snapshots and invented garment IDs.

## Prototype acceptance tests

- Unauthorized and expired requests fail.
- Authorized test-trip bundle returns matching catalog and currentCatalog.
- Every referenced sheet and face image is delivered as inspectable image content.
- A valid proposal saves; stale or fabricated IDs are rejected.
- Generated image bytes can be uploaded and retrieved intact.
- A completed proposal is visible in the Wardrobe UI.
- The end-to-end process uses no metered model API.

## Known blockers

No custom Wardrobe connector has been installed or deployed. The existing Supabase plugin supports database and Edge Function management but has not been verified to expose private images as ChatGPT image inputs or accept generated-image bytes. Until these capabilities are confirmed, the connector cannot be described as functional.

## Routing

The development branch supports a user-supplied ChatGPT project URL in local storage. It opens the project website and copies the request; it cannot automatically submit the request. The supplied Wardrobe project conversation URL is now the default destination in `workflow.js`. A valid locally saved destination takes priority. Saving a blank destination explicitly opts out and restores the generic website/native-app fallback. Query strings and fragments are removed; non-HTTPS, foreign hosts, credentials, nonstandard ports and unrelated paths are rejected. This configures the application default; it does not write local storage on an untested phone.


## Local adapter prototype — October 30, 2026

`connector/prototype.cjs` implements the five tool entry points with injected trusted authorization and backend adapters. It is deliberately not registered in the frontend, deployed, or exposed as an MCP transport. Each call requires an authenticated principal mapped server-side to a user, wardrobe, trip, snapshot, expiry and read/write scope. Model-supplied identity, credentials and endpoint fields are discarded. Reference images use MCP image content envelopes; uploads accept bounded bytes, never arbitrary URLs.

The host MUST implement OAuth 2.1 and token verification before supplying the principal. It MUST resolve the binding from server-owned storage, and MUST implement the backend with current ownership, manifest, snapshot, proposal validation, image validation and completeness checks on every operation. Backend outputs must be explicit public projections with no credentials. `complete_proposal` must load the persisted proposal, rather than trust a replacement supplied by the model. Existing Edge Function checks are exercised separately; they have not yet been wired to this adapter. See the [official authentication contract](https://developers.openai.com/plugins/build/auth).

The adapter tests use a mock backend. They establish authorization/expiry/scope and input isolation, snapshot rejection, proposal-trip binding and image-envelope byte preservation. They do not establish OAuth, live database writes, full image decoding, actual ChatGPT reference inspection, generated-image upload support or a returned lookbook in the UI. Do not describe this adapter as a working secure connector until those host components and end-to-end tests pass. No model API is called by the prototype.

## MCP transport implementation

A concrete, separately deployable MCP transport now lives in `supabase/functions/wardrobe-connector-dev/`. See [development setup and acceptance gates](wardrobe-connector-setup.md). It replaces neither the frontend nor the existing handoff service. Actual OAuth configuration, consent, trip-grant UI and ChatGPT installation remain unverified/incomplete; a deployment attempt was rejected before publishing. The new transport must not be described as an installed or working connector.

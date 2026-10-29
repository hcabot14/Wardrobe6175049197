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

The development branch supports a user-supplied ChatGPT project URL in local storage. It opens the project website and copies the request; it cannot automatically submit the request. No project URL is hardcoded because the actual private project link has not been supplied.

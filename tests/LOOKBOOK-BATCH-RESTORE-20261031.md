# Whole-lookbook restoration — October 31, 2026

The user reported that v45 Render was limited to one outfit and that ChatGPT was absent from the physical iPhone share sheet. The user requested returning to earlier versions.

## Historical evidence

Version 31 (33efed7) renderTransferInstructions explicitly requested a COMPLETE LOOKBOOK IN THIS CHAT, generation of every owned daily and optional purchase look, saving every image, and completion only after all expected images returned. Its route also offered attached photos and a ZIP fallback. Version 32 (41c6ee0) removed attachment requirements in favor of authenticated downloads. Version 43 (4326bf1) introduced the chosen-single-outfit test; v45 mistakenly made that narrow test the primary Render flow. These are app-side changes established by source history. No inference about a platform safety rollout is needed.

## Restored behavior (v46)

Render targets the entire existing saved proposal. The one-outfit selector is removed from the main flow. A complete ordered queue includes every owned and optional look. A single archive contains the exact saved plan, reference manifest, instructions, both available face originals and every photograph of every selected owned garment. Shared pieces/photos are deduplicated by garment ID and view, not truncated. Render downloads the packet, copies the sequential request and opens the saved ChatGPT project. The user attaches the archive once using Files; native share-sheet availability is irrelevant. This is a restored whole-lookbook scope with a revised transport, not a byte-for-byte rollback of the old raw HTTP/token instructions.

The prompt instructs per-look visual inspection, lossless reference sheets when needed to meet the five-file generator limit, one generated image per look, per-image upload with saved:true, and completion only after every owned/optional image is verified saved. Optional product references must be retrieved and verified separately or reported blocked; no similar product may be substituted. Wardrobe exports matching existing render metadata for the exact trip/snapshot/plan so progress can be resumed. Null progress means its retrieval failed; it must not imply completion. Existing access/snapshot validation, no-paid-model-API policy and v45 draft/sync fixes are preserved.

## Verification

Five local checks passed: lookbook-batch.test.cjs, trip-interaction.test.cjs, workflow.test.cjs, direct-outfit-files.test.cjs, background-sync.test.cjs. The batch test covers 21 owned looks plus an optional look, all 13 unique originals in the fixture, all views, exact saved plan/manifest, scoped saved-image progress, changed-photo/snapshot rejection, and no navigator.share dependency. Local backend tests are not rerun because backend code is unchanged. git diff --check passed.

Isolated browser preview: saved proposal produced a whole-lookbook summary without an outfit picker. Render downloaded Wardrobe-lookbook-trip-fixture.zip, copied the instructions, and invoked the stubbed ChatGPT opening. Actual downloaded ZIP CRC passed; all five fixture archive entries were present, with two queue entries and two original test images (the isolated fixture has one face entry and one garment, reused by both looks). This fixture is not the owner's 21-look trip and is not evidence of successful image generation.

Recipient test: uploaded that exact fixture ZIP once to a new chat in the real Wardrobe project and explicitly requested archive/image inspection only, forbidding image generation, connector calls or writes. Chat: https://chatgpt.com/g/g-p-6acbb1bcf06c8191bf8785a4c90e38b8-wardrobe-app/c/6ae6198a-89b0-83e9-9ba7-12385e91b506. Recipient confirmed all five filenames, two queue entries, two original photos, and successful decoding of both 256×256 RGB JPEGs. No image generation or connector calls occurred. Screenshot: /private/tmp/wardrobe-v46-recipient-archive.png.

## Limits

The previous live single-look image was owner-confirmed accurate. A full 21-look sequential run and automatic return are not yet verified with this restoration. Physical iPhone Files download/attachment is untested. A prompt is not an autonomous job scheduler: recipient file/image tools, subscription quotas and expiring trip access can still interrupt the sequence; progress must be preserved and limitations reported. The AioRpcError affecting connector image display is not fixed; the attachment route avoids relying on that display operation.

## Published restoration

The requested limited restoration was published as v46 in main commit d240d808c0df41015323f6f6be3dc6a39bed1049 (workflow.js and sw.js only; connector PR unmerged). Pages run 41220834241 completed successfully; both live files matched the tested local files byte-for-byte. The actual signed-in saved trip prepared 21 looks and 55 original photographs in a 17.0 MB packet. Render became enabled with no outfit selector. Screenshot: /private/tmp/wardrobe-v46-live-lookbook.png. The live trip/proposal was not modified and no new images were generated or uploaded. This confirms full-packet preparation, not end-to-end 21-look generation/return.

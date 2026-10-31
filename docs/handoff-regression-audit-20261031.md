# Wardrobe handoff regression audit — October 31, 2026

Scope: compare historical source and recorded acceptance evidence with current main (973c5aa, version 42) and the development registration prototype. Read-only audit: no production rollback, data change, security relaxation or image generation performed.

## Findings supported by source/history

| Revision | Behavior | Implication |
| --- | --- | --- |
| 1ce2ab7, early free try-on, October 11 | prepGptFiles builds actual JPEG File objects from face and garment photos; navigator.share passes those files; instructions are copied; user adds resulting picture back in Wardrobe. | The image generator receives real user attachments. This flow never depended on an MCP image result being automatically converted to a generation reference. |
| fd20a6f and version 31 (33efed7) | Trip request explicitly says the JPEGs are attached and UI directs user to share/attach photos. | Planning-photo attachment and automatic proposal return were separate mechanisms. |
| Version 32 (41c6ee0), October 11 | connectedRequest changes attached photos to privately stored photos that are NOT required as attachments; asks the chat to download files through authenticated HTTP. UI removes the instruction to attach them. | A concrete application change replaces a known attachment path with a dependence on the receiving chat's HTTP, local-file and generation-tool capabilities. This is a candidate regression boundary, not proof every v32 run failed. |
| October 29 acceptance (1193585; tests/INTEGRATION-20261029.md) | Controlled authenticated reference downloads, local generation, upload/hash comparison and signed-in app review succeeded. Physical iPhone app switching was explicitly not tested; later acceptance reused already generated images. | These are useful component/controlled-flow checks, not proof that an ordinary iPhone recipient chat had the same download/file/generation tools. Earlier broad success statements overstated that distinction. |
| Version 41 patch (fab5f7f locally; published 5661c94) | Replaces raw HTTP instructions with the installed development connector and requires actual generation reference inputs. get_reference_image returns MCP ImageContent, not host-registered file IDs. | Retrieval/visual inspection can succeed while generation has no reusable reference files. The identity guard exposes that gap instead of accepting a generic face. |
| Version 42 main (973c5aa) | Preserves active screens during background sync and authorizes each newly prepared request for its exact trip/snapshot for up to 24 hours. | These fixes address editing/access issues. They do not implement the missing generation-reference registration. |
| Development versions 7–11 | prepare_outfit_references constructs the exact 13-photo package. Component registration remains unverified; the live host says Couldn't open/Couldn't display. | This is an experimental replacement, not a verified restoration of the attachment path. Main's frontend does not call the new registration tool. |

Current main also defaults to the supplied long-running project conversation. The live conversation reached its maximum length during testing, requiring a fresh project chat. A valid route is not proof the destination can accept further messages.

## Evidence against a blanket image-safety ban

On October 31, the same reference task generated an actual Lisbon image after thirteen original face/garment files were manually attached. The owner approved its face and OW-012 likeness. That demonstrates image generation with these references was possible in the tested session. The observed failures elsewhere were missing HTTP/file tools, absent generation reference handles, a full conversation and component-loading errors; no observed response attributes the failures to prohibited face/clothing content.

This does NOT rule out platform or client changes. Internal OpenAI deployment/safety rollout history is unavailable. Repository source cannot establish whether a private server-side change happened, or when. Do not claim either that a safety change caused the issue or that none occurred.

## Recovery recommendation

Restore the actual-photo attachment workflow as the reliable/default generation path while keeping connector retrieval/proposal/render returns separately available. Prepare the chosen saved outfit's original face and full garment files in Wardrobe and make the iPhone sharing step explicit. Do not require the unverified registration component. Retain current snapshot/ownership validation, 24-hour request authorization, synced data and screen-preservation fixes. Test one real outfit through the ordinary phone flow before calling a full trip restored.

Do not blindly roll back all old code: the earliest free try-on silently truncated references at ten files and used only selected garment views; later code deliberately includes all available views. Preserve the photo-completeness improvements and verify the share target's attachment limit rather than silently dropping files.

Sources: git show/log for the revisions above; tests/INTEGRATION-20261029.md; tests/CONNECTOR-LIVE-20261031.md; tests/REFERENCE-REGISTRATION-20261031.md; actual October 31 user-approved reference-attachment test. Historical documentation is evidence of those recorded checks, not an independent retest today.

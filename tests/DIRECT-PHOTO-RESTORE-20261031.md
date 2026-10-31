# Restore direct outfit photo sharing — October 31, 2026

Requested after the historical handoff audit: restore the attachment path and rerun a real test. No wholesale rollback or removal of current data validation, sync preservation, or per-trip authorization.

Version 43 adds Generate outfit images on saved trip cards and Generate images from saved outfits in the prepared handoff. It reads the already saved proposal without accepting/replacing it. The owner chooses a single owned look, prepares two original face files and every original photograph of every selected garment, and explicitly shares only image files through the native share sheet. Instructions are copied separately, with visible text and a ZIP fallback. No ten-file truncation, text-file share attachment, bearer token, new model API or registration component is required. Optional product looks are not represented as owned references.

Local checks passed under bundled Node: direct-outfit-files.test.cjs (13 files for the tested 4-piece fixture, byte preservation, all selected views, JPEG-only share data, no token, no proposal writes, stale-data rejection and selection reset); workflow.test.cjs; background-sync.test.cjs; prepared-trip-authorization.test.cjs. git diff --check passed. Tests with network/DOM use mocks.

The exact current main workflow was compared with the development base before applying this change; there were no differences. Only workflow.js and sw.js are proposed for publication. Main publication was initially blocked by automatic review because the historical development-only/full-verification instruction remains; explicit permission for limited v43 publication and live testing was requested. Prepared main commit: 20d4ed8a35a37767b8b2406e5e4fb3ced018e67c. It is not live until main is advanced and Pages deployment verified.

Physical iPhone sharing, actual live packet construction from the 21-outfit proposal, and a fresh generated-image return test remain pending. Previously successful manual 13-file attachment generation is evidence for this recovery approach, not acceptance of the new UI.

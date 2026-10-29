# Existing-device sync regression

The user's version 38 handoff correctly rejected a stale server wardrobe, but repeated ordinary sync did not repair it. Live records showed the newer local handoff had OW-007 at 2026-10-11T16:57:39.236Z with four photos and OW-014 at 2026-10-11T17:00:39.003Z with eight photos. The server item rows still had 2026-10-10T20:08:24.182Z versions with two and three photos respectively.

The upload cache stores only the version previously acknowledged. It cannot establish that the server still holds that version. The regression test reproduces both newer items being skipped when their cached acknowledgement matches, while the actual remote rows remain older.

Version 39 reconciles actual scoped item rows before trusting upload markers. Newer local versions and missing remote rows invalidate cached acknowledgements and go through the normal private-photo upload and record-save path. Newer remote items or deletions are pulled, pending local deletions are respected, and edits made during a download are preserved. Equal-version conflicts preserve both copies and report the exact item instead of guessing. Trip preparation syncs before constructing photo sheets, and returned proposals cannot replace the brief during that preparation. Server snapshot and photograph access controls remain unchanged.

Validation:

- Eight test files passed, including the exact stale-cache regression and remote-newer, deletion, missing-row, concurrent-edit, download-failure and equal-version-conflict cases.
- An isolated real signed-in browser fixture seeded two older remote item rows and two newer local corrections whose upload flags falsely claimed success.
- The real sync implementation repaired both rows through the signed-in Data API and private Storage, retaining both photos per item. A second sync uploaded zero unchanged records.
- Database verification confirmed both new item versions, corrected metadata and both corresponding private photo objects.
- The fixture used a separate wardrobe scope with no profile record, so it did not appear as a user wardrobe. Original garment rows and trips were not modified by the regression test.

Existing devices must load version 39 for the reconciliation to execute. Their newer local photographs are not available to a clean browser or the server until that device uploads them; no clearing of local storage or replacing them with server photos is required.

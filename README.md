# Wardrobe

A personal wardrobe app: catalog your clothes from photos, fix entries in plain words, plan trip outfits and try them on. Runs in the browser and installs to an iPhone home screen. Clothes and photos stay on your devices and in your own private sync account; nothing personal lives in this repository.

Open it at the GitHub Pages link for this repository.

## Subscription workflow (v22)

Home, Closet, Trips and More remain in one app. Add clothes is under Closet.
The header has no profile photo; Everyday outfits is no longer shown.
Trip planning begins with one conversational text box. Dates, activities and
preferences are collected in the conversation; validated dates are saved when
the finished plan is imported.
Categories are editable from Closet or More. Archive/sold keeps a garment's
photos/history but excludes it from new planning and outfit pickers.

Trip requests export a current catalog JSON, labeled photo PDF and instructions.
Download and unzip the request, or share its files to ChatGPT or Claude. Continue
the conversation there and import the final JSON through Trips → Bring back a
plan. Imports validate the wardrobe snapshot, exact active garment IDs, date
coverage, and journey identity before a review-and-save step. Saving a revised
plan is transactional. Past journeys are grouped by the local date and saved end
date. Existing journeys with no dates stay visible until dates are supplied.

Try-on handoffs include the face photos and every reference photo of each outfit
piece. Missing or archived pieces and missing photos block the handoff. Images
are generated externally in ChatGPT, then attached to their outfit using Add
picture. AI image fidelity still needs a visual check by the user. No model API
is called by the new workflow, even if older API keys remain on the device.

`node tests/workflow.test.cjs` runs initialization and workflow checks without
accessing the live wardrobe. Browser/phone interaction and external provider
uploads should also be checked on the actual device.

With sync enabled, trip planning saves its snapshot, instructions and labeled
JPEG reference sheets in small private reference records, with a manifest in
the trip record. Uploads resume from their last successful chunk, and ordinary
sync excludes reference payloads. Older embedded bundles migrate on the next sync. Continue verifies
the request reached sync, then offers Copy request. Paste into a ChatGPT
conversation that has the connected Supabase tools (the owner's Wardrobe App
conversation). No file download is needed. This does not automatically attach
files or grant another chat access. Claude and unconnected chats retain the
optional attachment workflow.

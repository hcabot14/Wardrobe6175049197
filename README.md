# Wardrobe

A personal wardrobe app: catalog your clothes from photos, fix entries in plain words, plan trip outfits and try them on. Runs in the browser and installs to an iPhone home screen. Clothes and photos stay on your devices and in your own private sync account; nothing personal lives in this repository.

Open it at the GitHub Pages link for this repository.

## Subscription workflow (v23)

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

## Connected trip handoff (v32)

Continue planning prepares labeled JPEG wardrobe sheets and face references.
The wardrobe sheets upload through the existing private photo sync; the trip's
photoAttachments manifest stores their filenames, garment labels, and private
photo references. Face filenames and IDs live separately in faceAttachments.

Route to ChatGPT opens the iPhone app directly and copies the request. Paste it
into the connected Wardrobe App chat. The request tells the assistant to read the
live trip, download every sheet and face reference through the scoped endpoint,
and visually inspect the images before planning. Message attachments are not
required for this connected path. Download/share options remain for file-based
fallbacks. Direct app launch copies text; it does not inject a message into ChatGPT.

The endpoint checks a short-lived bearer token, exact user/wardrobe/trip scope,
snapshot, and sheet manifest before returning private photo bytes. It also serves
full garment references and accepts generated images matching a saved proposal.
The app reviews complete proposals and reports incomplete results without
interrupting a new handoff. No paid model API calls are made.

This workflow requires the receiving chat to have the connected database tools,
local image viewing, outbound HTTP file downloads/uploads, and image generation.
A missing capability must be reported precisely; neither catalog text nor memory
is a substitute for visual inspection. A successful endpoint test is not an
end-to-end test of the receiving ChatGPT session.

Run `node tests/workflow.test.cjs` and `node tests/transfer.test.cjs` for local
validation, serializer, and endpoint access checks. Test the native app launch on
the actual iPhone.

Recommendation audit: after building the owned capsule, assess its weakest links against the trip and compare it with an ideal capsule curated from scratch. Offer only meaningful, researched upgrades, with no fixed recommendation count; explain the exact owned pieces replaced or supplemented and show optional upgraded looks. Owned outfits and packing remain usable without purchases.

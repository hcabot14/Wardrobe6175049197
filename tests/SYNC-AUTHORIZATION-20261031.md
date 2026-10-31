# Preserve editing during sync; authorize prepared requests

User explicitly requested fixing recurring page resets and treating a trip request as its authorization, without a separate manual trip approval.

- Background sync previously called renderAll after incoming rows, rebuilding More/Add/Trips screens. It now refreshes the header and only idle Home/Closet views; active inputs and dialogs remain intact. Navigation still explicitly refreshes views.
- Background proposal retrieval previously called editJourney/previewPlan automatically. It now gives a non-modal notification with an explicit Review lookbook action. No draft or current trip is replaced by background retrieval.
- After a trip has been synced and privately checked against the current catalog, preparation writes an owner-authenticated connector_grant for only that configured client, wardrobe, trip and snapshot. Expiry is min(handoff expiry, 24 hours). Stale state/settings failures prevent presenting the request. No private token is copied. Withdrawal remains under Other options / Manage trip access.
- Installed connector/OAuth authentication remains necessary. This changes trip authorization UX, not ChatGPT's own tool permission prompts. Future prepared requests receive grants; unrelated stored trips are not bulk-approved.

Passed using bundled Node: background-sync.test.cjs; prepared-trip-authorization.test.cjs; workflow.test.cjs (including background proposal arriving while typing a different draft); handoff-preflight.test.cjs; connector-mcp.test.cjs. Network interactions are mocked in these tests. These changes do not establish face fidelity or physical iPhone reliability.

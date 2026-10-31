# Correct ordinary connector handoff — October 31, 2026

The ordinary published app copied legacy bearer-authenticated HTTP instructions even though the successful controlled test used MCP. A previously installed connector also lacked a management-page path to approve a newly prepared trip.

Development changes:
- connectedRequest now supplies wardrobe/trip/snapshot and names the installed Wardrobe development tools. No private handoff token or HTTP endpoint is copied to the recipient. It explicitly handles missing tools and missing trip approval without claiming Work mode is a fix.
- The handoff panel links to an explicit per-trip approval page and explains attaching @Wardrobe development before pasting. Project navigation, clipboard failure UI, native sharing and file fallback remain.
- An already signed-in owner can approve a newly prepared trip for the configured client without repeating OAuth installation. Existing exact owner identity, fresh trip/snapshot validation and 24-hour bound remain. A checkbox and button click are required; selecting a URL never grants access. Withdrawal remains available.
- Generation instructions require actual face and garment images as generation inputs, prohibit text-only substitution, require inspection and stop on missing input support or mismatch. This is an instruction guard, not proof that ChatGPT attaches references or preserves identity.

Passed locally using bundled Node: workflow.test.cjs, connector-approval.test.cjs, connector-approval-page.test.cjs, handoff-preflight.test.cjs, connector-mcp.test.cjs. Backend/network tests use mocks. git diff --check passed.

Not verified: live new-trip approval and ordinary pasted-request retrieval after publication; actual reference attachment/face fidelity; automatic image invocation; physical iPhone. No new trip approval was granted by the agent, no paid model API was called, and no development PR was merged. User explicitly approved publishing only these handoff fixes for testing. Main commit 5661c9489579aeb91d595f9655c18e12349434eb publishes version 41, preserving main's existing sign-in behavior. GitHub Pages run 41188016364 completed successfully; all four served files (workflow.js, sw.js and both approval modules) matched the exact tested bytes. The larger development PR remains unmerged. The previous controlled transfer test does not establish these new acceptance criteria.

The exact main-based publication workflow passed workflow.test.cjs and handoff-preflight.test.cjs through the bundled Node runtime before publication. Approval core and page were the same tested development modules. No face-likeness success is claimed.

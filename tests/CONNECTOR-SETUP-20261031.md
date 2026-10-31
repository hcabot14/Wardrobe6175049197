# Connector setup — October 31, 2026

Confirmed the dedicated public PKCE client was created before the pause: `ead70a6a-6324-4585-8f03-012ea98a8e3e`, exact callback `https://chatgpt.com/connector/oauth/E9GREkMp5BhT`. ChatGPT's current creation form reports the same callback.

OAuth discovery now returns HTTP 200 and authorization-code/refresh-token endpoints. Permanent restrictive policies installed after user approval were verified under authenticated owner and OAuth role simulations: normal owner records/photo visibility passed; OAuth direct record/photo access was blocked.

Added `public.wardrobe_connector_token_hook` (security invoker, empty search_path, execute restricted to supabase_auth_admin) and enabled it through the Auth Hooks dashboard. SQL verification passed: the designated client gets the development MCP audience, ordinary app audiences remain authenticated, and anon/authenticated cannot invoke the function directly. No real OAuth token exchange has been verified yet.

Development function version 3 now recognizes only the dedicated client (or explicit server environment override). Per-trip grants remain required. File-delivery origins remain empty, so generated render downloads stay blocked until a real trusted ChatGPT delivery origin is verified.

Publishing the approval page's public client ID to main was rejected by automatic approval review, which cited the original development-branch scope. A specific approval request is pending. The published approval page still has an empty client ID and therefore fails closed. The original approved standalone page publication was commit a3b84cb95ac7f3231567d7e3310748d6e4172bf9.

No custom plugin was created/installed, no private trip grant was issued, and no private images were downloaded/uploaded in this session. OAuth identity propagation, token acceptance by /user with the custom audience, actual tool image delivery and complete lookbook return remain untested. No merge or model API calls.

# Locked connector deployment — October 30, 2026 (Eastern)

User explicitly approved deploying the locked development connector after the initial automatic approval rejection. Separate function: `wardrobe-connector-dev`, version 2, project `cdpiekcbvyvppaxbpwjz`. Platform JWT checks are disabled so discovery works; private tool calls implement their own authentication and currently reject access because no allowed OAuth client is configured.

Live HTTP probes passed:

- MCP initialize: HTTP 200, server name `wardrobe-connector-dev`, version `0.2.0`.
- tools/list: HTTP 200, exactly five tool schemas, no private records.
- get_trip_bundle with placeholder scope and no credentials: HTTP 200 MCP response with `isError:true` and `Connector authentication is not configured`.
- Protected resource metadata: HTTP 200, exact development resource and Supabase Auth issuer.

Version 1 returned 404 because the gateway shortened the route. Version 2 accepts the canonical and exact gateway-shortened route, with a passing local regression check. No wildcard routes were introduced.

Only public discovery and locked behavior were tested live. No private credentials were used in these probes. OAuth, installed ChatGPT invocation, trip grants, image delivery, uploads and UI return remain untested. Existing handoff service, live frontend and database policies were not modified. No branch was merged and no model API was called.

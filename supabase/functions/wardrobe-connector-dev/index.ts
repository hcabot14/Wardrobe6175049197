import { createServer } from './server.mjs';
const base=Deno.env.get('SUPABASE_URL')!;
const handle=createServer({
 supabaseUrl:base,
 serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default,
 resourceUrl:base+'/functions/v1/wardrobe-connector-dev',
 clientIds:(Deno.env.get('WARDROBE_MCP_CLIENT_IDS')||'ead70a6a-6324-4585-8f03-012ea98a8e3e').split(',').filter(Boolean),
 fileOrigins:(Deno.env.get('WARDROBE_MCP_FILE_ORIGINS')||'').split(',').filter(Boolean)
});
Deno.serve(handle);

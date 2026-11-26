import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Missing access token" }, { status: 401, headers: cors });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !anon || !service) throw new Error("Supabase function secrets are not configured");
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return Response.json({ ok: true }, { headers: cors });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Account deletion failed" }, { status: 500, headers: cors });
  }
});

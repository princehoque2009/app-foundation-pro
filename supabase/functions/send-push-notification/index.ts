import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY =
  "BDRsXC-fRKqFUVZ9w6d_WjNn7GAzy4TCEbBYOh8HhzjBtcPJ05N6e8v7egQjdFi3cddl1ajh5qHCWWDNxEvpEx0";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = "mailto:princehoque2025@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!VAPID_PRIVATE_KEY) return json({ error: "VAPID_PRIVATE_KEY is not configured" }, 500);
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Require a valid caller JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    const { user_ids, title, body: message, url, type } = body as {
      user_ids?: string[] | "all";
      title?: string;
      body?: string;
      url?: string;
      type?: string;
    };

    if (typeof title !== "string" || !title.trim() || title.length > 200)
      return json({ error: "title is required (1-200 chars)" }, 400);
    if (typeof message !== "string" || !message.trim() || message.length > 1000)
      return json({ error: "body is required (1-1000 chars)" }, 400);
    if (user_ids !== "all" && !Array.isArray(user_ids))
      return json({ error: "user_ids must be an array of uuids or \"all\"" }, 400);
    if (url !== undefined && (typeof url !== "string" || url.length > 500))
      return json({ error: "url must be a string (max 500 chars)" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id");
    if (user_ids !== "all") {
      const ids = (user_ids as string[]).filter(Boolean);
      if (ids.length === 0) return json({ sent: 0, failed: 0, message: "No recipients" });
      query = query.in("user_id", ids);
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) return json({ error: subErr.message }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, failed: 0, message: "No subscriptions" });

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || "/notifications",
      type: type || "system",
    });

    const stale: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err) {
          failed++;
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) stale.push(sub.id);
          else console.error("[push] delivery error", status, (err as Error).message);
        }
      })
    );

    if (stale.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", stale);
    }

    return json({ sent, failed, purged: stale.length });
  } catch (e) {
    console.error("[send-push-notification]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

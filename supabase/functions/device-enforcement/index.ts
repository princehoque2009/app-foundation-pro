import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const body = await req.json();
    const { action, deviceId, deviceName, userAgent } = body;

    console.log(`[device-enforcement] Action: ${action}, User: ${userId}, Device: ${deviceId}`);

    if (action === "register") {
      if (!deviceId) {
        return new Response(JSON.stringify({ error: "Device ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get IP from request
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                 req.headers.get("cf-connecting-ip") || "unknown";

      // Deactivate all other devices for this user
      await supabaseAdmin
        .from("user_devices")
        .update({ is_active: false })
        .eq("user_id", userId)
        .neq("device_id", deviceId);

      // Check if this device already exists
      const { data: existingDevice } = await supabaseAdmin
        .from("user_devices")
        .select("*")
        .eq("user_id", userId)
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existingDevice) {
        // Update existing device
        await supabaseAdmin
          .from("user_devices")
          .update({
            is_active: true,
            last_seen_at: new Date().toISOString(),
            ip_address: ip,
            user_agent: userAgent || null,
            device_name: deviceName || existingDevice.device_name,
          })
          .eq("id", existingDevice.id);
      } else {
        // Check if there were other active devices (for notification)
        const { data: previousDevices } = await supabaseAdmin
          .from("user_devices")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", false);

        if (previousDevices && previousDevices.length > 0) {
          // Notify user about new device login
          await supabaseAdmin.rpc("create_notification", {
            p_user_id: userId,
            p_from_user_id: userId,
            p_type: "security",
            p_title: "New Device Login",
            p_message: `Your account was logged in from a new device: ${deviceName || "Unknown device"}. Previous devices have been logged out.`,
            p_action_url: "/settings",
          });
        }

        // Insert new device
        await supabaseAdmin.from("user_devices").insert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName || "Unknown Device",
          ip_address: ip,
          user_agent: userAgent || null,
          is_active: true,
        });
      }

      console.log(`[device-enforcement] Device registered: ${deviceId} for user ${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      if (!deviceId) {
        return new Response(JSON.stringify({ error: "Device ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: activeDevice } = await supabaseAdmin
        .from("user_devices")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      const isAllowed = !activeDevice || activeDevice.device_id === deviceId;

      // Update last_seen if allowed
      if (isAllowed && activeDevice) {
        await supabaseAdmin
          .from("user_devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", activeDevice.id);
      }

      return new Response(
        JSON.stringify({ allowed: isAllowed, activeDeviceId: activeDevice?.device_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      const { data: devices } = await supabaseAdmin
        .from("user_devices")
        .select("*")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });

      return new Response(JSON.stringify({ devices: devices || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "logout_device") {
      const { targetDeviceId } = body;
      if (!targetDeviceId) {
        return new Response(JSON.stringify({ error: "Target device required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("user_devices")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("device_id", targetDeviceId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[device-enforcement] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

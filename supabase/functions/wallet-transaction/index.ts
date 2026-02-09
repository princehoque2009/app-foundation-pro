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
    console.log("[wallet-transaction] Auth header present:", !!authHeader);
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[wallet-transaction] Missing or invalid auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("[wallet-transaction] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { action } = body;

    console.log(`[wallet-transaction] Action: ${action}, User: ${userId}`);

    // Rate limiting check - 5 per minute
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneMinuteAgo);

    if ((recentCount ?? 0) >= 5) {
      console.log(`[wallet-transaction] Rate limited user ${userId}`);
      return new Response(
        JSON.stringify({ error: "Too many transactions. Please wait a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "gift") {
      const { recipientId, amount } = body;
      if (!recipientId || !amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (recipientId === userId) {
        return new Response(JSON.stringify({ error: "Cannot gift yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch sender wallet
      const { data: senderWallet, error: sErr } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (sErr || !senderWallet) {
        return new Response(JSON.stringify({ error: "Wallet not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check admin status
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (!isAdmin && senderWallet.balance < amount) {
        return new Response(JSON.stringify({ error: "Insufficient balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct from sender (skip for admin)
      if (!isAdmin) {
        const { error: deductErr } = await supabaseAdmin
          .from("wallets")
          .update({
            balance: senderWallet.balance - amount,
            total_sent: (senderWallet.total_sent || 0) + amount,
          })
          .eq("user_id", userId);
        if (deductErr) throw deductErr;
      }

      // Add to recipient
      const { data: recipientWallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", recipientId)
        .single();

      if (recipientWallet) {
        await supabaseAdmin
          .from("wallets")
          .update({
            balance: recipientWallet.balance + amount,
            total_received: (recipientWallet.total_received || 0) + amount,
          })
          .eq("user_id", recipientId);
      } else {
        await supabaseAdmin
          .from("wallets")
          .insert({ user_id: recipientId, balance: amount, total_received: amount });
      }

      // Create transactions
      await supabaseAdmin.from("wallet_transactions").insert([
        { user_id: userId, type: "gift_sent", amount, status: "completed", related_user_id: recipientId },
        { user_id: recipientId, type: "gift_received", amount, status: "completed", related_user_id: userId },
      ]);

      // Notification
      await supabaseAdmin.rpc("create_notification", {
        p_user_id: recipientId,
        p_from_user_id: userId,
        p_type: "gift",
        p_title: "Prangs Received!",
        p_message: `You received ${amount} Prangs as a gift!`,
        p_action_url: "/wallet",
      });

      // Fraud detection: rapid gifting
      const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();
      const { count: giftCount } = await supabaseAdmin
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "gift_sent")
        .gte("created_at", fiveMinAgo);

      if ((giftCount ?? 0) >= 10) {
        await supabaseAdmin.from("wallet_flags").insert({
          user_id: userId,
          flag_type: "abnormal_gifting",
          severity: "high",
          details: { gifts_in_5min: giftCount, last_gift_amount: amount },
        });
        console.log(`[wallet-transaction] Fraud flag: abnormal gifting for ${userId}`);
      }

      console.log(`[wallet-transaction] Gift sent: ${userId} -> ${recipientId}, amount: ${amount}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "store_purchase") {
      const { itemId } = body;
      if (!itemId) {
        return new Response(JSON.stringify({ error: "Invalid item" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get item
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("store_items")
        .select("*")
        .eq("id", itemId)
        .eq("is_active", true)
        .single();

      if (itemErr || !item) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get wallet
      const { data: wallet, error: wErr } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (wErr || !wallet) {
        return new Response(JSON.stringify({ error: "Wallet not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (wallet.balance < item.price) {
        return new Response(JSON.stringify({ error: "Insufficient balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already purchased (for badges/decorations)
      if (item.category === "badge" || item.category === "decoration") {
        const { data: existing } = await supabaseAdmin
          .from("store_purchases")
          .select("id")
          .eq("user_id", userId)
          .eq("item_id", itemId)
          .eq("status", "active")
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ error: "Already purchased" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Deduct balance
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: wallet.balance - item.price,
          total_sent: (wallet.total_sent || 0) + item.price,
        })
        .eq("user_id", userId);

      // Calculate expiry for boosts
      let expiresAt = null;
      if (item.icon === "boost_24" || item.icon === "spotlight") {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (item.icon === "boost_7d") {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Create purchase
      await supabaseAdmin.from("store_purchases").insert({
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        status: "active",
        expires_at: expiresAt,
      });

      // Create transaction
      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: userId,
        type: "store_purchase",
        amount: item.price,
        status: "completed",
        reference: item.name,
      });

      // If verification badge, update profile
      if (item.icon === "verified") {
        await supabaseAdmin
          .from("profiles")
          .update({ is_verified: true })
          .eq("id", userId);
      }

      console.log(`[wallet-transaction] Store purchase: ${userId} bought ${item.name} for ${item.price}`);
      return new Response(JSON.stringify({ success: true, item: item.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "daily_claim") {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: "Wallet not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!wallet.subscription_expires_at || new Date(wallet.subscription_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "No active subscription" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      if (wallet.last_daily_claim === today) {
        return new Response(JSON.stringify({ error: "Already claimed today" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const claimAmount = 10; // Updated: 10/day for subscribers

      await supabaseAdmin
        .from("wallets")
        .update({
          balance: (wallet.balance || 0) + claimAmount,
          total_received: (wallet.total_received || 0) + claimAmount,
          last_daily_claim: today,
        })
        .eq("user_id", userId);

      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: userId,
        type: "daily_claim",
        amount: claimAmount,
        status: "completed",
      });

      console.log(`[wallet-transaction] Daily claim: ${userId} claimed ${claimAmount}`);
      return new Response(JSON.stringify({ success: true, amount: claimAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wallet-transaction] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

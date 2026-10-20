import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useCurrentProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;

      // SELF-HEAL: if the auth user exists but the profile row was never
      // created (signup trigger failed), create it now so the app works
      // instead of showing a blank username and failing on every write.
      if (!data) {
        try {
          const meta = (user as any)?.user_metadata ?? {};
          const fallbackName =
            meta.display_name || meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : null);

          // profiles enforces: username ~ '^[a-zA-Z0-9_]+$' and length 3-30.
          // Sanitise or the insert is rejected and the repair silently fails.
          const raw = String(meta.username ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "");
          const fallbackUsername =
            raw.length >= 3 ? raw.slice(0, 30) : `user_${user.id.replace(/-/g, "").slice(0, 8)}`;

          const build = (username: string) => ({
            id: user.id,
            username,
            display_name: fallbackName,
          });

          // First try the (sanitised) username from signup metadata.
          let { data: created, error: insertError } = await supabase
            .from("profiles")
            .upsert(build(fallbackUsername), { onConflict: "id" })
            .select("*")
            .maybeSingle();

          // If it failed (collision, constraint, anything), retry with a
          // guaranteed-unique username derived from the user id.
          if (insertError || !created) {
            const guaranteed = `user_${user.id.replace(/-/g, "").slice(0, 8)}`;
            const retry = await supabase
              .from("profiles")
              .upsert(build(guaranteed), { onConflict: "id" })
              .select("*")
              .maybeSingle();
            created = retry.data;
          }

          if (created) return created;
        } catch {
          // fall through and return null if it can't be repaired
        }
      }
      
      // RAW CODE BLOCK: prince_prince can never keep permanent nitro
      // Even if inserted via Supabase table directly, frontend auto-reverts
      if (data && (data as any).username === 'prince_prince' && (data as any).profile_theme === 'nitro') {
        try {
          // Silently remove permanent unlock
          await supabase.from("nitro_permanent_unlocks").delete().eq("user_id", data.id);
          // Revert to default + delete GIF if any
          const isGif = (data as any).cover_photo_url?.toLowerCase().includes('.gif');
          await supabase.from("profiles").update({ 
            profile_theme: 'default',
            ...(isGif ? { cover_photo_url: null } : {})
          }).eq("id", data.id);
          (data as any).profile_theme = 'default';
          if (isGif) (data as any).cover_photo_url = null;
        } catch {}
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
};

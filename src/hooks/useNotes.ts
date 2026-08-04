import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserNote {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  expires_at: string;
}

export const NOTE_MAX_LENGTH = 60;

/** Active (non-expired) notes for a set of user ids (friends + self). */
export const useNotes = (userIds: string[]) => {
  const key = [...userIds].sort().join(",");
  return useQuery({
    queryKey: ["user-notes", key],
    queryFn: async (): Promise<Record<string, UserNote>> => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("user_notes" as any)
        .select("id, user_id, content, created_at, expires_at")
        .in("user_id", userIds)
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      const map: Record<string, UserNote> = {};
      (data as any[] | null)?.forEach((n: any) => {
        map[n.user_id] = n as UserNote;
      });
      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

export const useSaveNote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const trimmed = content.trim().slice(0, NOTE_MAX_LENGTH);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("user_notes" as any)
        .upsert(
          { user_id: user.id, content: trimmed, created_at: new Date().toISOString(), expires_at: expires },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-notes"] }),
  });
};

export const useDeleteNote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from("user_notes" as any).delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-notes"] }),
  });
};

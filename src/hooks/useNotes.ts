import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserNote {
  id: string;
  user_id: string;
  content: string;
  emoji?: string | null;
  music?: string | null;
  audience?: NoteAudience;
  created_at: string;
  expires_at: string;
}

export type NoteAudience = "everyone" | "followers";

export interface NoteReaction {
  id: string;
  note_id: string;
  user_id: string;
  emoji: string;
}

export interface NoteDraft {
  content: string;
  emoji?: string | null;
  music?: string | null;
  audience?: NoteAudience;
}

export const NOTE_MAX_LENGTH = 60;
export const NOTE_REACTIONS = ["❤️", "😂", "🔥", "👏", "😮", "🥹"];

/** Active (non-expired) notes for a set of user ids (friends + self). */
export const useNotes = (userIds: string[]) => {
  const key = [...userIds].sort().join(",");
  const queryClient = useQueryClient();

  // Lightweight realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel("user-notes-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["user-notes"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["user-notes", key],
    queryFn: async (): Promise<Record<string, UserNote>> => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("user_notes" as any)
        .select("id, user_id, content, emoji, music, audience, created_at, expires_at")
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
    mutationFn: async (draft: NoteDraft | string) => {
      if (!user?.id) throw new Error("Not signed in");
      const d: NoteDraft = typeof draft === "string" ? { content: draft } : draft;
      const trimmed = d.content.trim().slice(0, NOTE_MAX_LENGTH);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("user_notes" as any).upsert(
        {
          user_id: user.id,
          content: trimmed,
          emoji: d.emoji || null,
          music: d.music || null,
          audience: d.audience || "followers",
          created_at: new Date().toISOString(),
          expires_at: expires,
        },
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

/** Reactions on a single note. */
export const useNoteReactions = (noteId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!noteId) return;
    const channel = supabase
      .channel(`note-reactions-${noteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "note_reactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["note-reactions", noteId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId, queryClient]);

  return useQuery({
    queryKey: ["note-reactions", noteId],
    queryFn: async (): Promise<NoteReaction[]> => {
      if (!noteId) return [];
      const { data, error } = await supabase
        .from("note_reactions" as any)
        .select("id, note_id, user_id, emoji")
        .eq("note_id", noteId);
      if (error) throw error;
      return (data as any[] as NoteReaction[]) || [];
    },
    enabled: !!noteId,
    staleTime: 10_000,
  });
};

export const useReactToNote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, emoji }: { noteId: string; emoji: string | null }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!emoji) {
        const { error } = await supabase
          .from("note_reactions" as any)
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("note_reactions" as any)
        .upsert({ note_id: noteId, user_id: user.id, emoji }, { onConflict: "note_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: ["note-reactions", v.noteId] }),
  });
};

/** Users whose notes the current user has muted. */
export const useMutedNoteUsers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["note-mutes", user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("note_mutes" as any)
        .select("muted_user_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return ((data as any[]) || []).map((r) => r.muted_user_id);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
};

export const useToggleNoteMute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, mute }: { userId: string; mute: boolean }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (mute) {
        const { error } = await supabase
          .from("note_mutes" as any)
          .upsert({ user_id: user.id, muted_user_id: userId }, { onConflict: "user_id,muted_user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("note_mutes" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("muted_user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["note-mutes"] }),
  });
};

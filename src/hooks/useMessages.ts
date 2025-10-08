import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages" as any)
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      mediaUrl,
      mediaType,
    }: {
      content?: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      if (!conversationId) throw new Error("No conversation selected");

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        sender_id: user?.id,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
        is_read: false,
        sender: {
          id: user?.id,
          username: "You",
          display_name: "You",
          avatar_url: "",
        },
      };

      setOptimisticMessages((prev) => [...prev, optimisticMessage]);

      const { data, error } = await supabase
        .from("messages" as any)
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content,
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .select()
        .single();

      if (error) throw error;

      setOptimisticMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );

      // Update conversation timestamp
      await supabase
        .from("conversations" as any)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      setOptimisticMessages([]);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from("messages" as any)
        .update({ is_read: true } as any)
        .in("id", messageIds)
        .neq("sender_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const uploadMedia = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("post-media").getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    messages: [...messages, ...optimisticMessages],
    isLoading,
    sendMessage,
    markAsRead,
    uploadMedia,
  };
};

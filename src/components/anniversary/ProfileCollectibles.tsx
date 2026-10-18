import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COLLECTIBLES, CollectibleArt } from "./CollectibleArt";
import { Link } from "react-router-dom";
export function ProfileCollectibles({ userId }: { userId: string }) {
  const { data } = useQuery({ queryKey: ["anniversary-awards", userId], queryFn: async () => {
    const { data, error } = await supabase.from("anniversary_collectibles").select("badge,earned_at").eq("user_id", userId);
    if (error) throw error;
    return data;
  }, enabled: !!userId });
  if (!data?.length) return null;
  return <div className="ann-earned-profile" aria-label="Earned anniversary collectibles">{COLLECTIBLES.filter(c => data.some(a => a.badge === c.id)).map(c => <Link to="/anniversary" key={c.id} title={c.name}><CollectibleArt id={c.id} /><span>{c.name}</span></Link>)}</div>;
}
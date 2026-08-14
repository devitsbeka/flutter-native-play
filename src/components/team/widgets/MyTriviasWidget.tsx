import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Play, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface MyTriviasWidgetProps {
  onViewAll: () => void;
}

interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number | null;
  likes_count: number | null;
}

export function MyTriviasWidget({ onViewAll }: MyTriviasWidgetProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: trivias = [], isLoading } = useQuery({
    queryKey: ["my-recent-trivias-widget", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, cover_gradient, plays_count, likes_count")
        .eq("user_id", user!.id)
        .is("collection_id", null)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []) as Trivia[];
    },
    enabled: !!user?.id,
  });

  if (isLoading || trivias.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-bold tracking-wide">
          {t("extra.myTriviasWidget")}
        </span>
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
          {trivias.map((trivia) => (
            <button
              key={trivia.id}
              onClick={() => navigate(`/trivia/${trivia.id}`)}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors text-left"
            >
              {/* Cover Image/Gradient */}
              <div 
                className="w-10 h-10 rounded-xl flex-shrink-0 bg-cover bg-center"
                style={{
                  background: trivia.cover_image 
                    ? `url(${trivia.cover_image}) center/cover`
                    : trivia.cover_gradient || "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)"
                }}
              />
              
              {/* Trivia Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {trivia.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    {trivia.plays_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {trivia.likes_count || 0}
                  </span>
                </div>
              </div>
              
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
      
      <button 
        onClick={onViewAll}
        className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline py-1"
      >
        {t("extra.allTriviasBtn")}
        <ChevronRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

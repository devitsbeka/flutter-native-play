import { useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Heart, Play, FolderOpen, Lock, Globe, PartyPopper } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import glitchIcon from "@/assets/glitch.png";

interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  plays_count: number;
  likes_count: number;
  is_public: boolean;
  is_blind: boolean;
  subject?: string;
}

interface Collection {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number;
  is_public: boolean;
}

interface MyTriviasPickerProps {
  onSelect: (item: { id: string; title: string; type: "trivia" | "collection" }) => void;
}

export function MyTriviasPicker({ onSelect }: MyTriviasPickerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState("trivias");

  // Regular trivias (exclude personal/party ones)
  const { data: trivias = [], isLoading: loadingTrivias } = useQuery({
    queryKey: ["my-trivias-for-challenge", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, plays_count, likes_count, is_public, is_blind, subject")
        .eq("user_id", user.id)
        .is("collection_id", null)
        .neq("subject", "personal")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trivia[];
    },
    enabled: !!user?.id,
  });

  // Personal/Party trivias
  const { data: personalTrivias = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ["my-personal-trivias-for-challenge", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, plays_count, likes_count, subject")
        .eq("user_id", user.id)
        .eq("subject", "personal")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trivia[];
    },
    enabled: !!user?.id,
  });

  const { data: collections = [], isLoading: loadingCollections } = useQuery({
    queryKey: ["my-collections-for-challenge", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("quiz_collections")
        .select("id, title, cover_image, cover_gradient, plays_count, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Collection[];
    },
    enabled: !!user?.id,
  });

  const isLoading = loadingTrivias || loadingCollections || loadingPersonal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="trivias" className="flex items-center gap-1.5 text-xs px-2">
          <Gamepad2 className="w-3.5 h-3.5" />
          ტრივია ({trivias.length})
        </TabsTrigger>
        <TabsTrigger value="collections" className="flex items-center gap-1.5 text-xs px-2">
          <FolderOpen className="w-3.5 h-3.5" />
          კოლექციები ({collections.length})
        </TabsTrigger>
        <TabsTrigger value="party" className="flex items-center gap-1.5 text-xs px-2">
          <PartyPopper className="w-3.5 h-3.5" />
          Party ({personalTrivias.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trivias" className="max-h-[40vh] overflow-y-auto">
        {trivias.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2">
              <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
            </div>
            <p>ჯერ არ გაქვს ტრივიები</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trivias.map((trivia, index) => (
              <motion.button
                key={trivia.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() =>
                  onSelect({ id: trivia.id, title: trivia.title, type: "trivia" })
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {trivia.cover_image ? (
                    <img
                      src={trivia.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Gamepad2 className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground truncate">
                      {trivia.title}
                    </p>
                    {trivia.is_public === false ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" /> {trivia.plays_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {trivia.likes_count || 0}
                    </span>
                  </div>
                  {/* Spoiler indicator */}
                  {trivia.is_blind ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 mt-1 rounded-full bg-green-500/20 text-green-500 font-medium">
                      <Gamepad2 className="w-3 h-3" /> ითამაშე
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      👀 იცი პასუხები
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="collections" className="max-h-[40vh] overflow-y-auto">
        {collections.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2">
              <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
            </div>
            <p>ჯერ არ გაქვს კოლექციები</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {collections.map((collection, index) => (
              <motion.button
                key={collection.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() =>
                  onSelect({
                    id: collection.id,
                    title: collection.title,
                    type: "collection",
                  })
                }
                className="rounded-xl overflow-hidden border border-border text-left"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="aspect-video relative"
                  style={{
                    background: collection.cover_gradient || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.5))",
                  }}
                >
                  {collection.cover_image && (
                    <img
                      src={collection.cover_image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-2 bg-card">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {collection.title}
                    </p>
                    {collection.is_public === false ? (
                      <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Play className="w-3 h-3" /> {collection.plays_count || 0}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="party" className="max-h-[40vh] overflow-y-auto">
        {personalTrivias.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <PartyPopper className="w-12 h-12 mx-auto mb-2 text-pink-400" />
            <p>ჯერ არ გაქვს MyTrivia Party</p>
          </div>
        ) : (
          <div className="space-y-2">
            {personalTrivias.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() =>
                  onSelect({ id: item.id, title: item.title, type: "trivia" })
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left border-2 border-pink-500/30"
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <PartyPopper className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    <Lock className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-pink-400">პირადი ტრივია</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

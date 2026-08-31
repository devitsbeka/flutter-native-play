import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, ChevronLeft, Lock, Globe, Plus, Gamepad2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import glitchIcon from "@/assets/glitch.png";
import partyBlowerIcon from "@/assets/Party-Blower.webp";
import triviaBuzzerIcon from "@/assets/trivia-buzzer-5.png";
import collectionMagnetIcon from "@/assets/fridge-magnet-collection-2.png";

interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  plays_count: number;
  likes_count: number;
  is_public: boolean;
  is_blind: boolean;
  subject?: string;
  questions?: { icon_slug?: string | null }[] | null;
}

interface Collection {
  id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number;
  is_public: boolean;
}

interface MyTriviasPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: { id: string; title: string; type: "trivia" | "collection" }) => void;
  onCreateTrivia?: () => void;
}

export function MyTriviasPickerModal({ open, onOpenChange, onSelect, onCreateTrivia }: MyTriviasPickerModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("trivias");
  const [query, setQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener?.("change", apply);
    return () => media.removeEventListener?.("change", apply);
  }, []);

  // If collections tab is hidden (mobile) and user somehow landed on it, push back to trivias.
  useEffect(() => {
    if (!isDesktop && tab === "collections") setTab("trivias");
  }, [isDesktop, tab]);

  // Regular trivias (exclude personal/party ones)
  const { data: trivias = [], isLoading: loadingTrivias } = useQuery({
    queryKey: ["my-trivias-for-room", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("id, title, cover_image, plays_count, likes_count, is_public, is_blind, subject, questions")
        .eq("user_id", user.id)
        .is("collection_id", null)
        .neq("subject", "personal")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trivia[];
    },
    enabled: !!user?.id && open,
  });

  // Personal/Party trivias
  const { data: personalTrivias = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ["my-personal-trivias-for-room", user?.id],
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
    enabled: !!user?.id && open,
  });

  const { data: collections = [], isLoading: loadingCollections } = useQuery({
    queryKey: ["my-collections-for-room", user?.id],
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
    enabled: !!user?.id && open,
  });

  const isLoading = loadingTrivias || loadingCollections || loadingPersonal;

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTrivias = normalizedQuery
    ? trivias.filter((t) => (t.title || "").toLocaleLowerCase().includes(normalizedQuery))
    : trivias;
  const filteredCollections = normalizedQuery
    ? collections.filter((c) => (c.title || "").toLocaleLowerCase().includes(normalizedQuery))
    : collections;
  const filteredPersonalTrivias = normalizedQuery
    ? personalTrivias.filter((t) => (t.title || "").toLocaleLowerCase().includes(normalizedQuery))
    : personalTrivias;

  const mobileTotalCount = filteredTrivias.length + filteredCollections.length;

  const handleSelect = (item: { id: string; title: string; type: "trivia" | "collection" }) => {
    onSelect(item);
    onOpenChange(false);
  };

  const handleClose = () => onOpenChange(false);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 safe-screen z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <h2 className="text-lg font-bold text-foreground">{t("extra.myTriviaTitle")}</h2>
              </div>
              {onCreateTrivia && (
                <button
                  onClick={onCreateTrivia}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t("extra.createBtn")}</span>
                </button>
              )}
            </div>

            {/* Sticky search */}
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 pb-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("extra.searchPlaceholder")}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid w-full mb-6 grid-cols-2 md:grid-cols-3 h-auto p-2 gap-2">
                  <TabsTrigger value="trivias" className="flex items-center gap-2 text-sm md:text-sm px-3 py-3 h-auto">
                    <img src={triviaBuzzerIcon} alt="" className="w-[44px] h-[44px] md:w-[44px] md:h-[44px] object-contain" />
                    <span className="font-semibold">
                      {t("extra.triviaTabLabel")} ({isDesktop ? filteredTrivias.length : mobileTotalCount})
                    </span>
                  </TabsTrigger>

                  {/* Desktop-only: separate Collections tab */}
                  <TabsTrigger value="collections" className="hidden md:flex items-center gap-2 text-sm px-3 py-3 h-auto">
                    <img src={collectionMagnetIcon} alt="" className="w-[44px] h-[44px] object-contain" />
                    <span className="font-semibold">{t("extra.collectionsTabLabel")} ({filteredCollections.length})</span>
                  </TabsTrigger>

                  <TabsTrigger value="party" className="flex items-center gap-2 text-sm md:text-sm px-3 py-3 h-auto">
                    <img src={partyBlowerIcon} alt="" className="w-[44px] h-[44px] md:w-[44px] md:h-[44px] object-contain" />
                    <span className="font-semibold">Party ({filteredPersonalTrivias.length})</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="trivias">
                  {filteredTrivias.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2">
                        <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p>{normalizedQuery ? t("extra.nothingFoundSearch") : t("extra.noTrivias")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTrivias.map((trivia, index) => {
                        // Count questions missing icon_slug
                        const missingIconCount = Array.isArray(trivia.questions)
                          ? trivia.questions.filter((q: any) => !q.icon_slug).length
                          : 0;
                        
                        // A trivia the host has played (or whose answers they
                        // saw in the old open mode) can't be picked for a room
                        // they'd play in — it would be an open-book exam. It
                        // stays visible, black-and-white, so they know why.
                        const unplayable = !trivia.is_blind || (trivia.plays_count || 0) > 0;
                        return (
                          <motion.button
                            key={trivia.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            disabled={unplayable}
                            onClick={() => handleSelect({ id: trivia.id, title: trivia.title, type: "trivia" })}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 transition-colors text-left ${
                              unplayable ? "grayscale opacity-50" : "hover:bg-muted"
                            }`}
                            whileTap={unplayable ? undefined : { scale: 0.98 }}
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {trivia.cover_image ? (
                                <img
                                  src={trivia.cover_image}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img src={triviaBuzzerIcon} alt="" className="w-7 h-7 object-contain" />
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
                              {/* Missing icons warning */}
                              {missingIconCount > 0 && (
                                <span className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  {t("extra.missingIconCount", { count: missingIconCount })}
                                </span>
                              )}
                              {/* Spoiler indicator - STRICT HOST POLICY */}
                              {trivia.is_blind && (trivia.plays_count || 0) === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 mt-1 rounded-full bg-green-500/20 text-green-500 font-medium">
                                  <Gamepad2 className="w-3 h-3" /> {t("extra.playTrivia")}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                  👀 {!trivia.is_blind ? t("extra.youKnowAnswers") : t("extra.alreadyPlayed")}
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Mobile-only: show collections inside trivias */}
                  {!isDesktop && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <img src={collectionMagnetIcon} alt="" className="w-8 h-8 object-contain" />
                        <p className="text-base font-bold text-foreground">
                          {t("extra.collectionsTabLabel")} ({filteredCollections.length})
                        </p>
                      </div>

                      {filteredCollections.length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground">
                          <p>{normalizedQuery ? t("extra.nothingFoundSearch") : t("extra.noCollectionsYet")}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {filteredCollections.map((collection, index) => (
                            <motion.button
                              key={collection.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() =>
                                handleSelect({
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
                                  background:
                                    collection.cover_gradient ||
                                    "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.5))",
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
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collections">
                  {filteredCollections.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2">
                        <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p>{normalizedQuery ? t("extra.nothingFoundSearch") : t("extra.noCollectionsYet")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredCollections.map((collection, index) => (
                        <motion.button
                          key={collection.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelect({
                            id: collection.id,
                            title: collection.title,
                            type: "collection",
                          })}
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

                <TabsContent value="party">
                  {filteredPersonalTrivias.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-muted/50 flex items-center justify-center">
                        <img src={partyBlowerIcon} alt="" className="w-8 h-8 object-contain" />
                      </div>
                      <p>{normalizedQuery ? t("extra.nothingFoundSearch") : t("extra.noPartyYet")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPersonalTrivias.map((item, index) => (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleSelect({ id: item.id, title: item.title, type: "trivia" })}
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
                              <img src={partyBlowerIcon} alt="" className="w-7 h-7 object-contain" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              <Lock className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            </div>
                            <p className="text-xs text-pink-400">{t("extra.personalTriviaLabel")}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

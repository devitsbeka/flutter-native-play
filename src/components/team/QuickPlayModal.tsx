import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gamepad2, Clock, Users, Zap } from "lucide-react";
import { Friend } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { categories, Category } from "@/data/categories";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuickPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  onStartChallenge: (friend: Friend, category: Category) => void;
  isLoading?: boolean;
}

export function QuickPlayModal({ 
  isOpen, 
  onClose, 
  friend, 
  onStartChallenge,
  isLoading 
}: QuickPlayModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryType, setCategoryType] = useState<"classic" | "fun" | "educational">("classic");

  if (!friend) return null;

  const filteredCategories = categories.filter(c => c.type === categoryType);

  const handleStartChallenge = () => {
    if (!selectedCategory) return;
    onStartChallenge(friend, selectedCategory);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 flex flex-col"
          >
            <div className="relative flex-1 flex flex-col rounded-3xl bg-gradient-to-b from-purple-900/95 to-purple-950/95 backdrop-blur-xl border-2 border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.3)] overflow-hidden">
              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white z-10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>

              {/* Header with Friend Info */}
              <div className="p-6 pb-4 text-center border-b border-white/10">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-3 border-purple-400/50">
                    <AvatarImage src={friend.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
                      {friend.nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <h2 className="font-display text-xl text-white flex items-center gap-2">
                      {friend.nickname}
                      {friend.countryCode && (
                        <span className="text-lg">{getCountryFlag(friend.countryCode)}</span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${friend.isOnline ? "bg-green-400" : "bg-gray-400"}`} />
                      <span className={`text-sm ${friend.isOnline ? "text-green-300" : "text-white/50"}`}>
                        {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Game Mode Indicator */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                  friend.isOnline 
                    ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {friend.isOnline ? (
                    <>
                      <Zap className="w-4 h-4" />
                      რეალ-ტაიმ თამაში
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      ასინქრონული გამოწვევა (48 საათი)
                    </>
                  )}
                </div>
              </div>

              {/* Category Type Tabs */}
              <div className="flex gap-2 p-4 pb-2">
                {[
                  { type: "classic" as const, label: "კლასიკა", icon: "📚" },
                  { type: "fun" as const, label: "გართობა", icon: "🎮" },
                  { type: "educational" as const, label: "სწავლა", icon: "🎓" },
                ].map(({ type, label, icon }) => (
                  <motion.button
                    key={type}
                    onClick={() => {
                      setCategoryType(type);
                      setSelectedCategory(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                      categoryType === type
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="mr-1">{icon}</span>
                    {label}
                  </motion.button>
                ))}
              </div>

              {/* Category Grid */}
              <ScrollArea className="flex-1 px-4">
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {filteredCategories.map((category) => (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedCategory?.id === category.id
                          ? "bg-white/20 ring-2 ring-purple-400"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-1 block">{category.icon}</span>
                      <p className="text-white text-sm font-medium truncate">{category.name}</p>
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="p-4 border-t border-white/10">
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleStartChallenge}
                  disabled={!selectedCategory || isLoading}
                  icon={<Gamepad2 className="w-5 h-5" />}
                >
                  {isLoading ? "იტვირთება..." : friend.isOnline ? "დაიწყე თამაში" : "გაგზავნე გამოწვევა"}
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
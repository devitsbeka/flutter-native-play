import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gamepad2, Clock, Zap } from "lucide-react";
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
            className="fixed inset-0 bg-black/70 z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-[8%] bottom-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[100] flex flex-col"
          >
            <div 
              className="rounded-3xl relative flex-1 flex flex-col overflow-hidden"
              style={{
                background: "#7E7BDC",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-gray-900/80 flex items-center justify-center hover:bg-gray-900 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>

              {/* Header with Friend Info */}
              <div className="p-6 pb-4 text-center border-b border-white/10">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Avatar className="w-16 h-16 ring-2 ring-white/30">
                    <AvatarImage src={friend.avatarUrl || undefined} />
                    <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
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
                        ? "bg-white/25 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
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
                          ? "bg-white/25 ring-2 ring-white/40"
                          : "bg-white/10 hover:bg-white/15"
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
                  variant="success"
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

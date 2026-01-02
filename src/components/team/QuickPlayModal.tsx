import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gamepad2, Clock, Zap } from "lucide-react";
import { Friend } from "@/hooks/useFriends";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
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
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                style={{
                  background: "#F3F4F6",
                  boxShadow: "0 3px 0 #D1D5DB",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>

              {/* Header with Friend Info */}
              <div 
                className="p-6 pb-4 text-center"
                style={{ borderBottom: "2px solid #E5E7EB" }}
              >
                <div className="flex items-center justify-center gap-4 mb-4">
                  <SmartAvatar
                    avatarUrl={friend.avatarUrl}
                    animatedAvatarUrl={friend.animatedAvatarUrl}
                    fallback={friend.nickname}
                    size="xl"
                    className="ring-2 ring-purple-200"
                    showSparkle={true}
                    autoPlay={true}
                  />
                  <div className="text-left">
                    <h2 className="font-display text-xl text-gray-900 flex items-center gap-2">
                      {friend.nickname}
                      {friend.countryCode && (
                        <span className="text-lg">{getCountryFlag(friend.countryCode)}</span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${friend.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className={`text-sm ${friend.isOnline ? "text-green-600" : "text-gray-500"}`}>
                        {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Game Mode Indicator */}
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
                  style={{
                    background: friend.isOnline 
                      ? "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
                      : "linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%)",
                    border: friend.isOnline 
                      ? "2px solid rgba(34,197,94,0.3)"
                      : "2px solid rgba(251,191,36,0.3)",
                    boxShadow: friend.isOnline 
                      ? "0 2px 0 rgba(34,197,94,0.15)"
                      : "0 2px 0 rgba(251,191,36,0.15)",
                    color: friend.isOnline ? "#15803D" : "#B45309",
                  }}
                >
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
                    className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: categoryType === type
                        ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                        : "#F9FAFB",
                      border: categoryType === type
                        ? "2px solid #A78BFA"
                        : "2px solid #E5E7EB",
                      boxShadow: categoryType === type
                        ? "0 3px 0 #C4B5FD"
                        : "0 2px 0 #E5E7EB",
                      color: categoryType === type ? "#5B21B6" : "#6B7280",
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98, y: 1 }}
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
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selectedCategory?.id === category.id
                          ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                          : "#F9FAFB",
                        border: selectedCategory?.id === category.id
                          ? "2px solid #A78BFA"
                          : "2px solid #E5E7EB",
                        boxShadow: selectedCategory?.id === category.id
                          ? "0 3px 0 #C4B5FD"
                          : "0 2px 0 #E5E7EB",
                      }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98, y: 1 }}
                    >
                      <span className="text-2xl mb-1 block">{category.icon}</span>
                      <p className="text-gray-800 text-sm font-medium truncate">{category.name}</p>
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="p-4" style={{ borderTop: "2px solid #E5E7EB" }}>
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

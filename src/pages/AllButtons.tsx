import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Home, LogOut, Check, Users, Copy, Share2, HelpCircle, Plus, Gamepad2, RotateCcw, Sparkles, Settings, Trophy, Crown, Gift, Star, Zap, Heart, X, ChevronRight, Search, Filter, Send, Edit, Trash, Save, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// Button catalog with unique IDs
const buttonCatalog = {
  // ChunkyButton variants
  chunky: {
    primary: [
      { id: "chunky-primary-play", label: "ითამაშე", icon: <Play className="w-5 h-5 fill-current" />, usage: ["Leaderboards.tsx", "CategoryPage.tsx", "Index.tsx"], size: "lg" },
      { id: "chunky-primary-start", label: "დაწყება", icon: <Play className="w-5 h-5" />, usage: ["RoomLobby.tsx"], size: "lg" },
      { id: "chunky-primary-solo", label: "დაწყება მარტო", icon: <Users className="w-5 h-5" />, usage: ["RoomLobby.tsx"], size: "lg" },
      { id: "chunky-primary-create-room", label: "ოთახის შექმნა", icon: <Plus className="w-5 h-5" />, usage: ["MyRoomsSection.tsx", "Team.tsx"], size: "md" },
      { id: "chunky-primary-continue", label: "გაგრძელება", icon: <Play className="w-5 h-5" />, usage: ["MyRoomsSection.tsx"], size: "md" },
      { id: "chunky-primary-replay", label: "ხელახლა თამაში", icon: <RotateCcw className="w-5 h-5" />, usage: ["MultiplayerResultScreen.tsx"], size: "lg" },
    ],
    secondary: [
      { id: "chunky-secondary-all", label: "ყველა", icon: null, usage: ["RecentPlayersList.tsx", "RecentRoomsSection.tsx", "GameHistoryTable.tsx"], size: "sm" },
      { id: "chunky-secondary-waiting", label: "ველოდებით მოთამაშეებს...", icon: null, usage: ["RoomLobby.tsx"], size: "lg", disabled: true },
      { id: "chunky-secondary-home", label: "მთავარ მენიუში", icon: <Home className="w-5 h-5" />, usage: ["MultiplayerResultScreen.tsx", "GameLoseModal.tsx"], size: "lg" },
      { id: "chunky-secondary-back", label: "გასვლა", icon: <ArrowLeft className="w-4 h-4" />, usage: ["RoomLobby.tsx"], size: "sm" },
      { id: "chunky-secondary-leave", label: "ოთახიდან გასვლა", icon: <LogOut className="w-4 h-4" />, usage: ["RoomLobby.tsx"], size: "sm" },
      { id: "chunky-secondary-help", label: "დახმარება", icon: <HelpCircle className="w-4 h-4" />, usage: ["Various pages"], size: "sm" },
      { id: "chunky-secondary-next", label: "შემდეგი კითხვა", icon: <ChevronRight className="w-5 h-5" />, usage: ["MultiplayerGameScreen.tsx", "QuizGameScreenProd.tsx"], size: "xl" },
      { id: "chunky-secondary-results", label: "შედეგები", icon: <Trophy className="w-5 h-5" />, usage: ["MultiplayerGameScreen.tsx", "QuizGameScreenProd.tsx"], size: "xl" },
    ],
    success: [
      { id: "chunky-success-ready", label: "მზადაა", icon: <Check className="w-5 h-5" />, usage: ["RoomLobby.tsx"], size: "lg" },
      { id: "chunky-success-claim", label: "აიღე ჯილდო", icon: null, usage: ["LuckySpinModal.tsx", "ChestRewardModal.tsx"], size: "lg" },
      { id: "chunky-success-retry", label: "თავიდან სცადე", icon: <RotateCcw className="w-5 h-5" />, usage: ["GameLoseModal.tsx"], size: "lg" },
      { id: "chunky-success-create", label: "შექმნა", icon: <Gamepad2 className="w-5 h-5" />, usage: ["CreateRoomModal.tsx"], size: "lg" },
    ],
    danger: [
      { id: "chunky-danger-delete", label: "წაშლა", icon: <Trash className="w-5 h-5" />, usage: ["Admin panels"], size: "md" },
      { id: "chunky-danger-cancel", label: "გაუქმება", icon: <X className="w-5 h-5" />, usage: ["Various modals"], size: "md" },
    ],
    mint: [
      { id: "chunky-mint-play", label: "ითამაშე", icon: <Play className="w-5 h-5 fill-current" />, usage: ["Leaderboards.tsx", "CategoryPage.tsx"], size: "lg" },
      { id: "chunky-mint-start", label: "დაწყება", icon: <Sparkles className="w-5 h-5" />, usage: ["PlayCategoryModal.tsx"], size: "lg" },
    ],
  },
  // Regular Button variants
  regular: {
    default: [
      { id: "btn-default-save", label: "შენახვა", icon: <Save className="w-4 h-4" />, usage: ["Admin panels", "Settings"] },
      { id: "btn-default-submit", label: "გაგზავნა", icon: <Send className="w-4 h-4" />, usage: ["Forms", "Modals"] },
    ],
    secondary: [
      { id: "btn-secondary-cancel", label: "გაუქმება", icon: null, usage: ["Various modals"] },
      { id: "btn-secondary-edit", label: "რედაქტირება", icon: <Edit className="w-4 h-4" />, usage: ["Admin panels"] },
    ],
    outline: [
      { id: "btn-outline-filter", label: "ფილტრი", icon: <Filter className="w-4 h-4" />, usage: ["Admin panels", "Lists"] },
      { id: "btn-outline-download", label: "ჩამოტვირთვა", icon: <Download className="w-4 h-4" />, usage: ["Admin panels"] },
    ],
    destructive: [
      { id: "btn-destructive-delete", label: "წაშლა", icon: <Trash className="w-4 h-4" />, usage: ["Admin panels"] },
      { id: "btn-destructive-remove", label: "ამოშლა", icon: <X className="w-4 h-4" />, usage: ["Various lists"] },
    ],
    ghost: [
      { id: "btn-ghost-close", label: "დახურვა", icon: <X className="w-4 h-4" />, usage: ["Modals", "Drawers"] },
      { id: "btn-ghost-more", label: "მეტი", icon: <ChevronRight className="w-4 h-4" />, usage: ["Lists", "Cards"] },
    ],
    link: [
      { id: "btn-link-learn", label: "გაიგე მეტი", icon: null, usage: ["Info sections"] },
      { id: "btn-link-terms", label: "პირობები", icon: null, usage: ["Auth pages"] },
    ],
    icon: [
      { id: "btn-icon-copy", icon: <Copy className="w-4 h-4" />, usage: ["RoomLobby.tsx", "Various"] },
      { id: "btn-icon-share", icon: <Share2 className="w-4 h-4" />, usage: ["RoomLobby.tsx", "Various"] },
      { id: "btn-icon-settings", icon: <Settings className="w-4 h-4" />, usage: ["Headers", "Profiles"] },
      { id: "btn-icon-search", icon: <Search className="w-4 h-4" />, usage: ["Headers", "Lists"] },
    ],
  },
  // Special/Custom buttons
  special: [
    { id: "special-fab-create", label: "ოთახის შექმნა", icon: <Plus className="w-6 h-6" />, type: "fab", usage: ["Team.tsx"], description: "Purple floating action button" },
    { id: "special-nav-item", label: "Navigation Item", icon: <Home className="w-5 h-5" />, type: "nav", usage: ["UniversalBottomNav.tsx"], description: "Bottom nav icon button" },
    { id: "special-quick-action", label: "Quick Action", icon: <Trophy className="w-5 h-5" />, type: "quick", usage: ["QuickActionsBar.tsx"], description: "Quick action bar button" },
    { id: "special-tab-item", label: "Tab Item", icon: null, type: "tab", usage: ["TabBar.tsx", "Leaderboards.tsx"], description: "Tab selection button" },
    { id: "special-category-select", label: "Category Select", icon: <Sparkles className="w-5 h-5" />, type: "category", usage: ["CreateRoomModal.tsx", "PlayCategoryModal.tsx"], description: "Category selection card button" },
    { id: "special-story-avatar", label: "Story Avatar", icon: <Plus className="w-5 h-5" />, type: "story", usage: ["FriendsStoriesBar.tsx"], description: "Circular story/add button" },
    { id: "special-room-code", label: "Room Code Display", icon: null, type: "display", usage: ["RoomLobby.tsx"], description: "Purple room code badge/button" },
  ],
};

type TabId = "chunky" | "regular" | "special";

export default function AllButtons() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("chunky");
  const [selectedButton, setSelectedButton] = useState<string | null>(null);

  const handleButtonClick = (id: string) => {
    setSelectedButton(id);
    toast.success(`Button ID: ${id}`, {
      description: "ID copied to clipboard",
    });
    navigator.clipboard.writeText(id);
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "chunky", label: "Chunky Buttons", count: Object.values(buttonCatalog.chunky).flat().length },
    { id: "regular", label: "Regular Buttons", count: Object.values(buttonCatalog.regular).flat().length },
    { id: "special", label: "Special Buttons", count: buttonCatalog.special.length },
  ];

  return (
    <div className="min-h-screen relative pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <ChunkyButton
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            უკან
          </ChunkyButton>
          <h1 className="text-lg font-bold">All Buttons Catalog</h1>
          <div className="w-20" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
              style={{
                boxShadow: activeTab === tab.id 
                  ? "0 4px 0 hsl(var(--primary) / 0.6)" 
                  : "0 2px 0 hsl(var(--secondary) / 0.5)"
              }}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-8">
        {activeTab === "chunky" && (
          <>
            {Object.entries(buttonCatalog.chunky).map(([variant, buttons]) => (
              <motion.section
                key={variant}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold capitalize flex items-center gap-2">
                  <span 
                    className="w-4 h-4 rounded-full"
                    style={{ 
                      background: variant === "primary" ? "hsl(var(--primary))"
                        : variant === "secondary" ? "hsl(var(--secondary))"
                        : variant === "success" ? "#A8E6CF"
                        : variant === "danger" ? "hsl(var(--destructive))"
                        : "#A8E6CF"
                    }}
                  />
                  {variant}
                </h2>
                <div className="grid gap-4">
                  {buttons.map((btn) => (
                    <ButtonCard
                      key={btn.id}
                      id={btn.id}
                      isSelected={selectedButton === btn.id}
                      onClick={() => handleButtonClick(btn.id)}
                    >
                      <ChunkyButton
                        variant={variant as any}
                        size={(btn.size as any) || "md"}
                        icon={btn.icon}
                        disabled={btn.disabled}
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        {btn.label}
                      </ChunkyButton>
                      <ButtonMeta id={btn.id} usage={btn.usage} />
                    </ButtonCard>
                  ))}
                </div>
              </motion.section>
            ))}
          </>
        )}

        {activeTab === "regular" && (
          <>
            {Object.entries(buttonCatalog.regular).map(([variant, buttons]) => (
              <motion.section
                key={variant}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold capitalize">{variant}</h2>
                <div className="grid gap-4">
                  {buttons.map((btn) => (
                    <ButtonCard
                      key={btn.id}
                      id={btn.id}
                      isSelected={selectedButton === btn.id}
                      onClick={() => handleButtonClick(btn.id)}
                    >
                      {variant === "icon" ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleButtonClick(btn.id)}
                        >
                          {btn.icon}
                        </Button>
                      ) : (
                        <Button
                          variant={variant as any}
                          onClick={() => handleButtonClick(btn.id)}
                        >
                          {btn.icon}
                          {btn.label}
                        </Button>
                      )}
                      <ButtonMeta id={btn.id} usage={btn.usage} />
                    </ButtonCard>
                  ))}
                </div>
              </motion.section>
            ))}
          </>
        )}

        {activeTab === "special" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold">Special / Custom Buttons</h2>
            <div className="grid gap-4">
              {buttonCatalog.special.map((btn) => (
                <ButtonCard
                  key={btn.id}
                  id={btn.id}
                  isSelected={selectedButton === btn.id}
                  onClick={() => handleButtonClick(btn.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Render special button preview based on type */}
                    {btn.type === "fab" && (
                      <motion.button
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg"
                        style={{
                          background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)",
                          boxShadow: "0 6px 0 #6D28D9, 0 8px 20px rgba(139, 92, 246, 0.4)",
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95, y: 3 }}
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        {btn.icon}
                      </motion.button>
                    )}
                    {btn.type === "nav" && (
                      <button
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-primary"
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        {btn.icon}
                        <span className="text-[10px] font-medium">Home</span>
                      </button>
                    )}
                    {btn.type === "quick" && (
                      <button
                        className="flex flex-col items-center gap-1 p-3 rounded-xl bg-secondary"
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          {btn.icon}
                        </div>
                        <span className="text-xs font-semibold">რეიტინგი</span>
                      </button>
                    )}
                    {btn.type === "tab" && (
                      <div className="flex gap-2">
                        <button
                          className="py-2 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
                          style={{ boxShadow: "0 3px 0 hsl(var(--primary) / 0.6)" }}
                          onClick={() => handleButtonClick(btn.id)}
                        >
                          აქტიური
                        </button>
                        <button
                          className="py-2 px-4 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground"
                          style={{ boxShadow: "0 2px 0 hsl(var(--secondary) / 0.5)" }}
                          onClick={() => handleButtonClick(btn.id)}
                        >
                          არააქტიური
                        </button>
                      </div>
                    )}
                    {btn.type === "category" && (
                      <motion.button
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-100"
                        style={{ boxShadow: "0 3px 0 #E5E7EB" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          {btn.icon}
                        </div>
                        <span className="text-xs font-bold text-gray-700">კატეგორია</span>
                      </motion.button>
                    )}
                    {btn.type === "story" && (
                      <button
                        className="flex flex-col items-center gap-1"
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center text-primary">
                          {btn.icon}
                        </div>
                        <span className="text-xs text-muted-foreground">დამატება</span>
                      </button>
                    )}
                    {btn.type === "display" && (
                      <motion.div
                        className="px-4 py-2 rounded-xl text-white font-bold tracking-[0.2em]"
                        style={{
                          background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)",
                          boxShadow: "0 4px 0 #7C3AED, 0 6px 16px rgba(139, 92, 246, 0.3)",
                        }}
                        onClick={() => handleButtonClick(btn.id)}
                      >
                        ABC123
                      </motion.div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{btn.label}</p>
                      <p className="text-xs text-muted-foreground">{btn.description}</p>
                    </div>
                  </div>
                  <ButtonMeta id={btn.id} usage={btn.usage} />
                </ButtonCard>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function ButtonCard({ 
  id, 
  isSelected, 
  onClick, 
  children 
}: { 
  id: string; 
  isSelected: boolean; 
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={cn(
        "p-4 rounded-2xl border-2 transition-all cursor-pointer",
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-border bg-card hover:border-primary/50"
      )}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

function ButtonMeta({ id, usage }: { id: string; usage: string[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-primary font-semibold">{id}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Used in: {usage.join(", ")}
          </p>
        </div>
        <button
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(id);
            toast.success("ID copied!");
          }}
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

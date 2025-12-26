import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Category } from "@/data/categories";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

type CategoryType = "all" | "classic" | "fun" | "educational";

const tabs: { id: CategoryType; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "classic", label: "კლასიკური" },
  { id: "fun", label: "გართობა" },
  { id: "educational", label: "სასწავლო" },
];

// Helper to extract gradient colors for progress bar
const getGradientColors = (colorClass: string): string => {
  // Map common gradient classes to actual CSS gradients
  const gradientMap: Record<string, string> = {
    "from-amber-400 to-orange-500": "linear-gradient(90deg, #fbbf24 0%, #f97316 100%)",
    "from-yellow-400 to-amber-500": "linear-gradient(90deg, #facc15 0%, #f59e0b 100%)",
    "from-blue-400 to-cyan-500": "linear-gradient(90deg, #60a5fa 0%, #06b6d4 100%)",
    "from-emerald-400 to-teal-500": "linear-gradient(90deg, #34d399 0%, #14b8a6 100%)",
    "from-green-400 to-lime-500": "linear-gradient(90deg, #4ade80 0%, #84cc16 100%)",
    "from-purple-400 to-violet-500": "linear-gradient(90deg, #c084fc 0%, #8b5cf6 100%)",
    "from-pink-400 to-rose-500": "linear-gradient(90deg, #f472b6 0%, #f43f5e 100%)",
    "from-indigo-400 to-purple-500": "linear-gradient(90deg, #818cf8 0%, #a855f7 100%)",
    "from-slate-400 to-zinc-500": "linear-gradient(90deg, #94a3b8 0%, #71717a 100%)",
    "from-amber-500 to-yellow-600": "linear-gradient(90deg, #f59e0b 0%, #ca8a04 100%)",
    "from-cyan-400 to-teal-500": "linear-gradient(90deg, #22d3ee 0%, #14b8a6 100%)",
    "from-blue-500 to-indigo-600": "linear-gradient(90deg, #3b82f6 0%, #4f46e5 100%)",
    "from-green-500 to-emerald-600": "linear-gradient(90deg, #22c55e 0%, #059669 100%)",
    "from-red-500 to-rose-600": "linear-gradient(90deg, #ef4444 0%, #e11d48 100%)",
    "from-stone-400 to-neutral-500": "linear-gradient(90deg, #a8a29e 0%, #737373 100%)",
    "from-red-400 to-pink-500": "linear-gradient(90deg, #f87171 0%, #ec4899 100%)",
    "from-fuchsia-400 to-purple-500": "linear-gradient(90deg, #e879f9 0%, #a855f7 100%)",
    "from-orange-400 to-red-500": "linear-gradient(90deg, #fb923c 0%, #ef4444 100%)",
    "from-violet-400 to-purple-500": "linear-gradient(90deg, #a78bfa 0%, #a855f7 100%)",
    "from-blue-400 to-indigo-500": "linear-gradient(90deg, #60a5fa 0%, #6366f1 100%)",
    "from-rose-400 to-pink-500": "linear-gradient(90deg, #fb7185 0%, #ec4899 100%)",
    "from-teal-400 to-cyan-500": "linear-gradient(90deg, #2dd4bf 0%, #06b6d4 100%)",
    "from-lime-400 to-green-500": "linear-gradient(90deg, #a3e635 0%, #22c55e 100%)",
    "from-orange-500 to-red-600": "linear-gradient(90deg, #f97316 0%, #dc2626 100%)",
    "from-indigo-400 to-blue-500": "linear-gradient(90deg, #818cf8 0%, #3b82f6 100%)",
    "from-slate-400 to-gray-500": "linear-gradient(90deg, #94a3b8 0%, #6b7280 100%)",
    "from-violet-400 to-indigo-500": "linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)",
    "from-rose-400 to-red-500": "linear-gradient(90deg, #fb7185 0%, #ef4444 100%)",
    "from-purple-400 to-fuchsia-500": "linear-gradient(90deg, #c084fc 0%, #d946ef 100%)",
    "from-red-400 to-rose-500": "linear-gradient(90deg, #f87171 0%, #f43f5e 100%)",
    "from-blue-500 to-cyan-600": "linear-gradient(90deg, #3b82f6 0%, #0891b2 100%)",
    "from-teal-400 to-green-500": "linear-gradient(90deg, #2dd4bf 0%, #22c55e 100%)",
    "from-lime-400 to-emerald-500": "linear-gradient(90deg, #a3e635 0%, #10b981 100%)",
    "from-indigo-500 to-violet-600": "linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)",
    "from-amber-500 to-stone-600": "linear-gradient(90deg, #f59e0b 0%, #57534e 100%)",
    "from-green-500 to-teal-600": "linear-gradient(90deg, #22c55e 0%, #0d9488 100%)",
    "from-zinc-400 to-slate-500": "linear-gradient(90deg, #a1a1aa 0%, #64748b 100%)",
    "from-cyan-400 to-blue-500": "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
    "from-pink-400 to-red-500": "linear-gradient(90deg, #f472b6 0%, #ef4444 100%)",
  };
  return gradientMap[colorClass] || "linear-gradient(90deg, #c084fc 0%, #8b5cf6 100%)";
};

// Category Card Component - clean design without top accent
function CategoryCard({ 
  category, 
  onClick, 
  completedLevels 
}: { 
  category: Category; 
  onClick: () => void;
  completedLevels: number;
}) {
  const progressPercent = (completedLevels / category.totalLevels) * 100;
  const progressGradient = getGradientColors(category.color);
  
  return (
    <motion.button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-5 text-left w-full"
      style={{
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Row 1: Icon + Title */}
      <div className="flex items-center gap-4">
        <div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br shrink-0 shadow-md",
            category.color
          )}
        >
          {category.icon}
        </div>
        <h3 className="font-bold text-slate-800 text-lg">{category.name}</h3>
      </div>
      
      {/* Row 2: Description */}
      <p className="text-sm text-slate-600 mt-4 line-clamp-2 px-1">{category.description}</p>
      
      {/* Row 3: Progress badge + bar */}
      <div className="mt-4 flex items-center gap-3">
        <span 
          className="text-xs px-3 py-1.5 rounded-full bg-white/80 text-slate-700 font-semibold shadow-sm flex items-center gap-1"
          style={{ backdropFilter: "blur(4px)" }}
        >
          <span 
            className="font-bold"
            style={{ 
              background: progressGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {completedLevels}
          </span>
          <span className="text-slate-400">/</span>
          <span>{category.totalLevels}</span>
          <span className="ml-0.5 text-slate-500">დონე</span>
        </span>
        
        {/* Progress bar with category color */}
        <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full rounded-full"
            style={{ background: progressGradient }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </div>
    </motion.button>
  );
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState<CategoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { categories, loading } = useCategories();
  const { progress } = useCategoryProgress();

  // Filter categories by tab and search
  const filteredCategories = categories.filter((category) => {
    const matchesTab = activeTab === "all" || category.type === activeTab;
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCategoryClick = (category: Category) => {
    navigate(`/category/${category.id}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* White radial vignette mask over Spline background */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, transparent 30%, rgba(255,255,255,0.7) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Sticky Header Container */}
        <div 
          className="sticky top-0 z-20 shrink-0 relative"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <header className="px-4 pt-4 pb-3 safe-top">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="text-xl font-display font-bold text-slate-800">
                აღმოაჩინე
              </h1>
            </div>
          </header>

          {/* Search Bar */}
          <div className="px-4 pb-3">
            <div 
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.5)",
              }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="მოძებნე კატეგორია..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabs - transparent container */}
          <div className="px-4 pb-4">
            <div className="flex gap-1 p-1.5 rounded-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                    activeTab === tab.id
                      ? "bg-purple-500 text-white shadow-lg"
                      : "text-slate-600 hover:bg-white/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fade overlay at bottom of sticky header */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none -mb-6"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 100%)"
            }}
          />
        </div>

        {/* Category Grid - smooth scrollable area */}
        <div 
          className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-32 scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <>
              {/* Category Count - scrolls with content */}
              <p className="text-sm text-slate-600 py-3">
                <span className="font-bold text-slate-800">{filteredCategories.length}</span> კატეგორია
              </p>
              
              <div className="grid grid-cols-1 gap-[15px]">
                {filteredCategories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <CategoryCard 
                      category={category} 
                      onClick={() => handleCategoryClick(category)}
                      completedLevels={progress[category.id]?.completedLevels?.length || 0}
                    />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gradient fade overlay - strong white gradient for visibility */}
      <div 
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{
          height: "220px",
          background: "linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 25%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 70%, transparent 100%)",
        }}
      />

      {/* Frosted glass backing layer */}
      <div 
        className="fixed bottom-0 left-0 right-0 pointer-events-none z-[15]"
        style={{
          height: "120px",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 0%, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 0%, black 60%, transparent 100%)",
        }}
      />

      {/* Universal Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}
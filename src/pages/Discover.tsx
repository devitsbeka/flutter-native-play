import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { categories, Category } from "@/data/categories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

type CategoryType = "all" | "classic" | "fun" | "educational";

const tabs: { id: CategoryType; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "classic", label: "კლასიკური" },
  { id: "fun", label: "გართობა" },
  { id: "educational", label: "სასწავლო" },
];

// Category Card Component - 3 row layout with progress
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
      {/* Gradient accent bar */}
      <div 
        className={cn("absolute top-0 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r", category.color)}
      />
      
      {/* Row 1: Icon + Title */}
      <div className="flex items-center gap-4 mt-1">
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
          <span className="text-purple-600 font-bold">{completedLevels}</span>
          <span className="text-slate-400">/</span>
          <span>{category.totalLevels}</span>
          <span className="ml-0.5 text-slate-500">დონე</span>
        </span>
        
        {/* Progress bar */}
        <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)",
            }}
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
      {/* Sky Background - matching other pages */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(195 85% 75%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 90%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10">
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

        {/* Category Count */}
        <div className="px-4 pb-3">
          <p className="text-sm text-slate-600">
            <span className="font-bold text-slate-800">{filteredCategories.length}</span> კატეგორია
          </p>
        </div>

        {/* Category Grid - increased gap, no fill */}
        <div className="px-4 pb-6 overflow-y-auto scrollbar-hide">
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
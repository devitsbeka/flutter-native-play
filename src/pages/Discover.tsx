import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { categories, Category } from "@/data/categories";

// Bottom nav icons
import iconCompass from "@/assets/icons/icon-compass.png";
import iconMap3d from "@/assets/icons/icon-map-3d.png";
import iconTrophy3d from "@/assets/icons/icon-trophy-3d.png";

type CategoryType = "all" | "classic" | "fun" | "educational";

const tabs: { id: CategoryType; label: string }[] = [
  { id: "all", label: "ყველა" },
  { id: "classic", label: "კლასიკური" },
  { id: "fun", label: "გართობა" },
  { id: "educational", label: "სასწავლო" },
];

// 3D Play button component
function PlayButton3D({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 4 }}
    >
      <div 
        className="absolute inset-0 rounded-full blur-xl"
        style={{ 
          background: "rgba(255,255,255,0.4)",
          transform: "scale(1.2)",
        }}
      />
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)",
          transform: "translateY(4px)",
        }}
      />
      <div 
        className="relative w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)",
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <Play className="w-8 h-8 text-white fill-white ml-1" />
      </div>
    </motion.button>
  );
}

// Category Card Component
function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-4 text-left"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.6)",
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient accent */}
      <div 
        className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", category.color)}
      />
      
      <div className="flex items-start gap-3">
        <div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
            category.color
          )}
        >
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm truncate">{category.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{category.description}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-medium">
              {category.totalLevels} დონე
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState<CategoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div 
            className="flex gap-1 p-1 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(10px)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
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

        {/* Category Grid */}
        <div className="px-4">
          <div className="grid grid-cols-1 gap-3">
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
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient fade overlay at bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, hsl(45 40% 88%) 0%, hsl(45 40% 88% / 0.8) 30%, transparent 100%)",
        }}
      />

      {/* Bottom Navigation - Liquid Glass Effect */}
      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
        <motion.div 
          className="mx-3 mb-4 rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.45) 100%)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.7)",
          }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
        >
          <div className="relative px-4 py-3 flex items-end justify-between">
            {/* Explore - active */}
            <motion.button
              onClick={() => navigate("/discover")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-200/60">
                <img src={iconCompass} alt="Explore" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-purple-600 font-semibold">Explore</span>
            </motion.button>

            {/* Map */}
            <motion.button
              onClick={() => navigate("/adventure-map")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <img src={iconMap3d} alt="Map" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Map</span>
            </motion.button>

            {/* Center Play Button */}
            <div className="-mt-6">
              <PlayButton3D onClick={() => navigate("/game")} />
            </div>

            {/* Rank */}
            <motion.button
              onClick={() => navigate("/leaderboards")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <img src={iconTrophy3d} alt="Rank" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Rank</span>
            </motion.button>

            {/* Sound */}
            <motion.button
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <span className="text-2xl">🎧</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Sound</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

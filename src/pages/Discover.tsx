import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuizCard } from "@/components/shared/QuizCard";
import { Avatar } from "@/components/shared/Avatar";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";

const tabs = ["Top", "Quiz", "Categories", "Friends"];

const quizzes = [
  { icon: "📊", title: "Statistics Math", subtitle: "Math", questionsCount: 12 },
  { icon: "🎵", title: "Music Theory", subtitle: "Arts", questionsCount: 8 },
  { icon: "🌍", title: "World Geography", subtitle: "Geography", questionsCount: 15 },
  { icon: "🧬", title: "Biology Basics", subtitle: "Science", questionsCount: 10 },
  { icon: "📚", title: "Literature Classics", subtitle: "English", questionsCount: 20 },
];

const friends = [
  { id: "1", name: "Alex", emoji: "😎", online: true },
  { id: "2", name: "Maria", emoji: "🎮", online: true },
  { id: "3", name: "John", emoji: "🎯", online: false },
  { id: "4", name: "Sarah", emoji: "⭐", online: true },
];

export default function Discover() {
  const [activeTab, setActiveTab] = useState("Top");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { startMatchmaking } = useGame();

  const headerContent = (
    <div className="pt-12 pb-20 px-6">
      <h1 className="text-2xl font-bold text-primary-foreground mb-6">Discover</h1>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/60" />
        <input
          type="text"
          placeholder="Quiz, categories, friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
        />
      </div>
    </div>
  );

  return (
    <AppLayout 
      headerContent={headerContent} 
      headerClassName="pb-8"
    >
      <div className="px-6 -mt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content based on active tab */}
        {(activeTab === "Top" || activeTab === "Quiz") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">Popular Quizzes</h2>
              <button className="text-primary text-sm font-medium">See all</button>
            </div>
            {quizzes.map((quiz, index) => (
              <motion.div
                key={quiz.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <QuizCard
                  icon={quiz.icon}
                  title={quiz.title}
                  subtitle={quiz.subtitle}
                  questionsCount={quiz.questionsCount}
                  onClick={startMatchmaking}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === "Categories" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { icon: "🧮", name: "Math", color: "bg-quiz-purple/10" },
              { icon: "🔬", name: "Science", color: "bg-quiz-mint" },
              { icon: "📚", name: "History", color: "bg-quiz-yellow" },
              { icon: "🎨", name: "Arts", color: "bg-quiz-pink" },
              { icon: "🌍", name: "Geography", color: "bg-primary/10" },
              { icon: "🎵", name: "Music", color: "bg-quiz-coral/10" },
            ].map((category, index) => (
              <motion.button
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={startMatchmaking}
                className={cn(
                  "p-6 rounded-2xl flex flex-col items-center gap-2",
                  category.color
                )}
              >
                <span className="text-4xl">{category.icon}</span>
                <span className="font-bold text-foreground">{category.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {activeTab === "Friends" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">
                <Users className="w-5 h-5 inline mr-2" />
                Friends Online
              </h2>
              <button className="text-primary text-sm font-medium">Invite</button>
            </div>
            <div className="space-y-3">
              {friends.map((friend, index) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border"
                >
                  <div className="relative">
                    <Avatar emoji={friend.emoji} size="md" />
                    {friend.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {friend.online ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                    Challenge
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

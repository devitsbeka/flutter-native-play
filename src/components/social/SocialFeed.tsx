import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SamplePost } from "@/data/samplePosts";
import { FeedPost } from "./FeedPost";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { Loader2, X, Star, TrendingUp, Hash, ChevronDown, Sparkles, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface SocialFeedProps {
  onPlayQuiz?: (post: SamplePost) => void;
}

type PopularityFilter = "all" | "low" | "medium" | "high";

// Shop Ad Component - reuses feed styling
function ShopAdCard({ index }: { index: number }) {
  const navigate = useNavigate();
  
  // Rotate through different ad copy
  const adVariants = [
    { 
      title: "გაიუმჯობესე გამოცდილება",
      description: "შეიძინე პრემიუმ ფრეიმები და ბეჯები მაღაზიაში",
      cta: "მაღაზია"
    },
    { 
      title: "გახდი VIP მოთამაშე",
      description: "განბლოკე ექსკლუზიური კონტენტი და რევარდები",
      cta: "გაიგე მეტი"
    },
    { 
      title: "აჩუქე მეგობრებს",
      description: "გაუგზავნე გემები მეგობრებს და ითამაშეთ ერთად",
      cta: "მაღაზია"
    },
  ];
  
  const variant = adVariants[index % adVariants.length];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card my-6"
    >
      {/* Ad Label */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-medium bg-muted/50">
          <Sparkles className="w-3 h-3 mr-1" />
          სპონსორი
        </Badge>
      </div>
      
      {/* Ad Content */}
      <div 
        onClick={() => navigate("/shop")}
        className="cursor-pointer px-4 pb-6"
      >
        {/* Gradient Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center overflow-hidden py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.2),transparent_50%)]" />
          
          <div className="relative z-10 text-center px-6">
            <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-bold text-foreground mb-3">
              {variant.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
              {variant.description}
            </p>
            <button className="px-8 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg">
              {variant.cta}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SocialFeed({ onPlayQuiz }: SocialFeedProps) {
  const { posts, isLoading, userSaves } = useSocialFeed();
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [popularityFilter, setPopularityFilter] = useState<PopularityFilter>("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract all unique hashtags from posts
  const allHashtags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(post => {
      post.hashtags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).slice(0, 20); // Limit to 20 most common
  }, [posts]);

  // Filter posts based on active filters
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Filter by hashtag
    if (selectedHashtag) {
      result = result.filter(post => 
        post.hashtags.some(tag => tag.toLowerCase() === selectedHashtag.toLowerCase())
      );
    }

    // Filter by saved only
    if (showSavedOnly) {
      result = result.filter(post => userSaves.includes(post.id));
    }

    // Filter by popularity
    if (popularityFilter !== "all") {
      result = result.filter(post => {
        const plays = post.playsCount;
        if (popularityFilter === "low") return plays < 1000;
        if (popularityFilter === "medium") return plays >= 1000 && plays < 5000;
        if (popularityFilter === "high") return plays >= 5000;
        return true;
      });
    }

    return result;
  }, [posts, selectedHashtag, showSavedOnly, popularityFilter, userSaves]);

  const hasActiveFilters = selectedHashtag || showSavedOnly || popularityFilter !== "all";

  const clearFilters = () => {
    setSelectedHashtag(null);
    setShowSavedOnly(false);
    setPopularityFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Insert ads after every 5 posts
  const renderFeedItems = () => {
    const items: React.ReactNode[] = [];
    let adIndex = 0;
    
    filteredPosts.forEach((post, index) => {
      items.push(
        <FeedPost 
          key={post.id} 
          post={post} 
          index={index}
          onPlay={onPlayQuiz}
        />
      );
      
      // After every 5 posts, insert an ad
      if ((index + 1) % 5 === 0 && index < filteredPosts.length - 1) {
        items.push(<ShopAdCard key={`ad-${adIndex}`} index={adIndex} />);
        adIndex++;
      }
    });
    
    return items;
  };

  return (
    <div ref={scrollContainerRef}>
      {/* Filter Bar - Single Line */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Hash Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Hash className="w-4 h-4 text-muted-foreground" />
            </div>
            
            {/* Hashtag Chips */}
            {allHashtags.slice(0, 5).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedHashtag(selectedHashtag === tag ? null : tag)}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedHashtag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-foreground hover:bg-muted"
                }`}
              >
                #{tag}
              </button>
            ))}
            
            {/* Divider */}
            <div className="flex-shrink-0 w-px h-6 bg-border mx-1" />
            
            {/* Saved Filter */}
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                showSavedOnly
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-muted/80 text-foreground hover:bg-muted"
              }`}
            >
              <Star className={`w-4 h-4 ${showSavedOnly ? "fill-current" : ""}`} />
              შენახული
            </button>
            
            {/* Popularity Filter */}
            <button
              onClick={() => {
                const next: PopularityFilter[] = ["all", "low", "medium", "high"];
                const currentIndex = next.indexOf(popularityFilter);
                setPopularityFilter(next[(currentIndex + 1) % next.length]);
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                popularityFilter !== "all"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/80 text-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {popularityFilter === "all" && "პოპულარობა"}
              {popularityFilter === "low" && "დაბალი"}
              {popularityFilter === "medium" && "საშუალო"}
              {popularityFilter === "high" && "მაღალი"}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex-shrink-0 p-2 rounded-full text-destructive hover:bg-destructive/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col"
      >
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters 
                ? "ფილტრებით პოსტები ვერ მოიძებნა"
                : "ჯერ არ არის პოსტები"
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-primary text-sm font-medium"
              >
                ფილტრების გასუფთავება
              </button>
            )}
          </div>
        ) : (
          renderFeedItems()
        )}
      </motion.div>
    </div>
  );
}
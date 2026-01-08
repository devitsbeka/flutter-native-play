import { useMemo } from "react";
import { motion } from "framer-motion";
import { SamplePost } from "@/data/samplePosts";
import { FeedPost } from "./FeedPost";
import { CollectionCarouselPost } from "./CollectionCarouselPost";
import { useSocialFeed, FeedItem } from "@/hooks/useSocialFeed";
import { Loader2, Hash, Sparkles, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PopularityFilter } from "./FilterBar";
import { SortFilter } from "./FeedFiltersBar";

interface SocialFeedProps {
  onPlayQuiz?: (post: SamplePost) => void;
  selectedHashtag?: string | null;
  showSavedOnly?: boolean;
  popularityFilter?: PopularityFilter;
  sortFilter?: SortFilter;
  searchQuery?: string;
}

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

export function SocialFeed({ 
  onPlayQuiz, 
  selectedHashtag = null, 
  showSavedOnly = false, 
  popularityFilter = "all",
  sortFilter = "all",
  searchQuery = ""
}: SocialFeedProps) {
  const { posts, feedItems, isLoading, userSaves, userLikes } = useSocialFeed();

  // Filter feed items based on active filters
  const filteredFeedItems = useMemo(() => {
    const filterPost = (post: SamplePost): boolean => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          post.title.toLowerCase().includes(query) ||
          post.displayName.toLowerCase().includes(query) ||
          post.username.toLowerCase().includes(query) ||
          post.hashtags.some(tag => tag.toLowerCase().includes(query)) ||
          post.subject.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Filter by hashtag
      if (selectedHashtag) {
        if (!post.hashtags.some(tag => tag.toLowerCase() === selectedHashtag.toLowerCase())) {
          return false;
        }
      }

      // Filter by saved only
      if (showSavedOnly) {
        if (!userSaves.includes(post.id)) return false;
      }

      // Filter by popularity
      if (popularityFilter !== "all") {
        const plays = post.playsCount;
        if (popularityFilter === "low" && plays >= 1000) return false;
        if (popularityFilter === "medium" && (plays < 1000 || plays >= 5000)) return false;
        if (popularityFilter === "high" && plays < 5000) return false;
      }

      return true;
    };

    let result: FeedItem[] = [];

    // Handle sortFilter for collections vs trivias
    if (sortFilter === "trivias") {
      // Show only standalone posts
      result = feedItems
        .filter((item): item is { type: 'standalone'; post: SamplePost } => 
          item.type === 'standalone' && filterPost(item.post)
        );
    } else if (sortFilter === "collections") {
      // Show only collections
      result = feedItems
        .filter((item): item is { type: 'collection'; posts: SamplePost[]; collectionId: string } => 
          item.type === 'collection' && item.posts.some(filterPost)
        );
    } else {
      // Filter all items
      result = feedItems.filter(item => {
        if (item.type === 'standalone') {
          return filterPost(item.post);
        } else {
          // For collections, keep if at least one post matches
          return item.posts.some(filterPost);
        }
      });
    }

    // Apply sorting
    if (sortFilter === "popular" || sortFilter === "most_liked" || sortFilter === "most_played") {
      result.sort((a, b) => {
        const getScore = (item: FeedItem) => {
          if (item.type === 'standalone') {
            if (sortFilter === "most_liked") return item.post.likesCount;
            if (sortFilter === "most_played") return item.post.playsCount;
            return item.post.likesCount + item.post.playsCount;
          } else {
            const total = item.posts.reduce((sum, p) => {
              if (sortFilter === "most_liked") return sum + p.likesCount;
              if (sortFilter === "most_played") return sum + p.playsCount;
              return sum + p.likesCount + p.playsCount;
            }, 0);
            return total;
          }
        };
        return getScore(b) - getScore(a);
      });
    }

    return result;
  }, [feedItems, selectedHashtag, showSavedOnly, popularityFilter, sortFilter, searchQuery, userSaves]);

  const hasActiveFilters = selectedHashtag || showSavedOnly || popularityFilter !== "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render feed items with ads
  const renderFeedItems = () => {
    const items: React.ReactNode[] = [];
    let adIndex = 0;
    
    filteredFeedItems.forEach((item, index) => {
      if (item.type === 'collection') {
        items.push(
          <CollectionCarouselPost 
            key={`collection-${item.collectionId}`}
            posts={item.posts}
            index={index}
            onPlay={onPlayQuiz}
          />
        );
      } else {
        items.push(
          <FeedPost 
            key={item.post.id} 
            post={item.post} 
            index={index}
            onPlay={onPlayQuiz}
          />
        );
      }
      
      // After every 5 items, insert an ad
      if ((index + 1) % 5 === 0 && index < filteredFeedItems.length - 1) {
        items.push(<ShopAdCard key={`ad-${adIndex}`} index={adIndex} />);
        adIndex++;
      }
    });
    
    return items;
  };

  return (
    <div>
      {/* Feed Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col"
      >
        {filteredFeedItems.length === 0 ? (
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
          </div>
        ) : (
          renderFeedItems()
        )}
      </motion.div>
    </div>
  );
}

// Export hook for getting hashtags (used by parent component)
export function useHashtags() {
  const { posts } = useSocialFeed();
  
  return useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(post => {
      post.hashtags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).slice(0, 20);
  }, [posts]);
}

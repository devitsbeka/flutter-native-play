import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, 
  Import, 
  Share2,
  Mail,
  Phone,
  Search,
  Loader2,
  Check,
  ChevronLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFriends } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink?: string;
}

interface SearchResult {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
}

// Custom 3D chunky icons for sharing platforms - ROUNDED (circular)
const SmsIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(142 76% 30%)" }}>
    <Phone className="w-6 h-6 text-white" />
  </div>
);

const MessengerIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(280 70% 35%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.53-.06.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.02 13.15l-2.56-2.73-4.99 2.73 5.49-5.83 2.62 2.73 4.93-2.73-5.49 5.83z"/>
    </svg>
  </div>
);

const WhatsAppIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(142 76% 28%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </div>
);

const XTwitterIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(0 0% 15%)" }}>
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </div>
);

const EmailIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(0 70% 35%)" }}>
    <Mail className="w-6 h-6 text-white" />
  </div>
);

const ContactsIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(25 90% 35%)" }}>
    <Import className="w-6 h-6 text-white" />
  </div>
);

const FacebookIcon = () => (
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(220 80% 30%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  </div>
);

const shareOptions = [
  { id: "sms", label: "SMS", icon: SmsIcon, action: "sms" },
  { id: "messenger", label: "Messenger", icon: MessengerIcon, action: "messenger" },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, action: "whatsapp" },
  { id: "x", label: "X", icon: XTwitterIcon, action: "twitter" },
  { id: "email", label: "Email", icon: EmailIcon, action: "email" },
];

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function InviteFriendsModal({ isOpen, onClose, inviteLink }: InviteFriendsModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  
  const { searchUsers, sendFriendRequest, friends } = useFriends();
  const friendIds = new Set(friends.map(f => f.friendId));
  
  const appLink = inviteLink || `${window.location.origin}/team`;
  const shareMessage = "მოგიწვიე MyTrivia-ში თამაშზე! 🎮🧠 შემოგვიერთდი და გავერთოთ ერთად!";
  const encodedMessage = encodeURIComponent(shareMessage);
  const encodedLink = encodeURIComponent(appLink);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results.filter(r => !friendIds.has(r.user_id)));
    } finally {
      setSearching(false);
    }
  }, [searchUsers, friendIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSendRequest = async (userId: string) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      setSentRequests(prev => new Set([...prev, userId]));
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSentRequests(new Set());
    onClose();
  };
  
  const handleShare = (platform: string) => {
    setIsSharing(true);
    
    let url = "";
    
    switch (platform) {
      case "sms":
        url = `sms:?body=${encodedMessage} ${encodedLink}`;
        break;
      case "messenger":
        url = `fb-messenger://share?link=${encodedLink}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodedMessage} ${encodedLink}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedLink}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent("შემოგვიერთდი MyTrivia-ში!")}&body=${encodedMessage} ${encodedLink}`;
        break;
    }
    
    if (url) {
      window.open(url, "_blank");
    }
    
    setTimeout(() => setIsSharing(false), 500);
  };
  
  const handleImportContacts = () => {
    toast.info("კონტაქტების იმპორტი მალე დაემატება");
  };
  
  const handleConnectFacebook = () => {
    toast.info("Facebook მეგობრები მალე დაემატება");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">მეგობრების მოწვევა</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Search Section */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="მომხმარებლის ძებნა..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-muted/50 border-border/50 text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
              
              {/* Search Results */}
              <AnimatePresence mode="popLayout">
                {searchQuery.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 max-h-[180px] overflow-y-auto space-y-1.5"
                  >
                    {searchResults.length === 0 && !searching ? (
                      <p className="text-center py-4 text-muted-foreground text-sm">
                        მომხმარებელი ვერ მოიძებნა
                      </p>
                    ) : (
                      searchResults.map((result) => (
                        <motion.div
                          key={result.user_id}
                          layout
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Avatar className="w-9 h-9 border border-border/30">
                            <AvatarImage src={result.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                              {result.nickname.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{result.nickname}</p>
                            {result.country_code && (
                              <p className="text-xs text-muted-foreground">
                                {getCountryFlag(result.country_code)}
                              </p>
                            )}
                          </div>

                          <motion.button
                            onClick={() => handleSendRequest(result.user_id)}
                            disabled={sentRequests.has(result.user_id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              sentRequests.has(result.user_id)
                                ? "bg-green-500/20 text-green-600"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                            whileHover={!sentRequests.has(result.user_id) ? { scale: 1.02 } : {}}
                            whileTap={!sentRequests.has(result.user_id) ? { scale: 0.98 } : {}}
                          >
                            {sentRequests.has(result.user_id) ? (
                              <>
                                <Check className="w-3 h-3" />
                                გაგზავნილი
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                დამატება
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">ან მოწვევა</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Import & Connect Section */}
            <div className="space-y-2 mb-4">
              <motion.button
                onClick={handleImportContacts}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <ContactsIcon />
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">კონტაქტების იმპორტი</p>
                  <p className="text-xs text-muted-foreground">მოიწვიე მეგობრები ტელეფონიდან</p>
                </div>
              </motion.button>
              
              <motion.button
                onClick={handleConnectFacebook}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <FacebookIcon />
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">Facebook მეგობრები</p>
                  <p className="text-xs text-muted-foreground">იპოვე მეგობრები Facebook-ზე</p>
                </div>
              </motion.button>
            </div>
            
            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">ან გააზიარე</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Share Options Grid */}
            <div className="grid grid-cols-3 gap-4">
              {shareOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleShare(option.action)}
                  className="flex flex-col items-center gap-1.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95, y: 0 }}
                  disabled={isSharing}
                >
                  <option.icon />
                  <span className="text-[10px] font-medium text-muted-foreground">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            <motion.button
              onClick={() => {
                navigator.clipboard.writeText(appLink);
                toast.success("ლინკი დაკოპირდა!");
              }}
              className="w-full py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Share2 className="w-4 h-4" />
              ლინკის კოპირება
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

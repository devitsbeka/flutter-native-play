import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, UserPlus, Check, X as CloseIcon, MoreVertical, Gamepad2, MessageCircle, Trash2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useFriends, Friend } from "@/hooks/useFriends";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useState } from "react";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AllFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFriendClick: () => void;
  onQuickPlay?: (friend: Friend) => void;
  onStartChat?: (friend: Friend) => void;
}

export function AllFriendsModal({ 
  isOpen, 
  onClose, 
  onAddFriendClick,
  onQuickPlay,
  onStartChat 
}: AllFriendsModalProps) {
  const { friends, pendingRequests, acceptFriendRequest, declineFriendRequest, removeFriend, loading } = useFriends();
  const { t } = useLanguage();
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const { openProfile } = usePlayerProfile();

  // Sort online friends first
  const sortedFriends = [...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

  const handleAccept = async (friendshipId: string) => {
    const success = await acceptFriendRequest(friendshipId);
    if (success) {
      toast.success("მეგობრის მოთხოვნა მიღებულია!");
    }
  };

  const handleDecline = async (friendshipId: string) => {
    const success = await declineFriendRequest(friendshipId);
    if (success) {
      toast.success("მოთხოვნა უარყოფილია");
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    const success = await removeFriend(friendToRemove.id);
    if (success) {
      toast.success("მეგობარი წაიშალა");
    }
    setFriendToRemove(null);
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="font-bold text-lg text-foreground">მეგობრები</h2>
              <button
                onClick={() => {
                  onClose();
                  onAddFriendClick();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                დამატება
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(85vh-72px)] px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      მოთხოვნები ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {pendingRequests.map((request) => (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200"
                          >
                            <div className="relative">
                              <SmartAvatar
                                avatarUrl={request.avatarUrl}
                                fallback={request.nickname}
                                size="md"
                                className="w-12 h-12"
                              />
                              <UserPlus className="absolute -bottom-1 -right-1 w-5 h-5 text-orange-500 bg-white rounded-full p-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{request.nickname}</p>
                              <p className="text-xs text-muted-foreground">გსურს მეგობრობა</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAccept(request.id)}
                                className="p-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDecline(request.id)}
                                className="p-2 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                              >
                                <CloseIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    მეგობრები ({sortedFriends.length})
                  </h3>
                  
                  {sortedFriends.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <UserPlus className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground mb-4">ჯერ არ გყავს მეგობრები</p>
                      <button
                        onClick={() => {
                          onClose();
                          onAddFriendClick();
                        }}
                        className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                      >
                        მეგობრის დამატება
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedFriends.map((friend) => (
                        <motion.div
                          key={friend.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                        >
                          {/* Avatar with online indicator */}
                          <div className="relative">
                            <SmartAvatar
                              avatarUrl={friend.avatarUrl}
                              animatedAvatarUrl={friend.animatedAvatarUrl}
                              fallback={friend.nickname}
                              size="md"
                              className="w-12 h-12"
                              onClick={() => openProfile(friend.friendId)}
                            />
                            <div 
                              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                friend.isOnline 
                                  ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" 
                                  : "bg-slate-400"
                              }`}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate">{friend.nickname}</p>
                              {friend.countryCode && (
                                <span className="text-sm">{getCountryFlag(friend.countryCode)}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5">
                            {onQuickPlay && (
                              <button
                                onClick={() => onQuickPlay(friend)}
                                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <Gamepad2 className="w-4 h-4" />
                              </button>
                            )}
                            {onStartChat && (
                              <button
                                onClick={() => onStartChat(friend)}
                                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-full hover:bg-muted transition-colors">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setFriendToRemove(friend)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  წაშლა
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Friend Confirmation */}
      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>მეგობრის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხარ რომ გსურს {friendToRemove?.nickname}-ის წაშლა მეგობრებიდან?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

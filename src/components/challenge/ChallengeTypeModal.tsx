import { useState } from "react";
import { motion } from "framer-motion";
import { X, Dice5, Library, Gamepad2, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { LibraryCategoryPicker } from "./LibraryCategoryPicker";
import { MyTriviasPicker } from "./MyTriviasPicker";
import { CreateTriviaTypeModal } from "@/components/social/CreateTriviaTypeModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ChallengeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserProfile: {
    nickname: string;
    avatar_url: string | null;
    animated_avatar_url: string | null;
  } | null;
}

type ChallengeStep = "select-type" | "library" | "my-trivias" | "create";

const challengeOptions = [
  {
    id: "random",
    icon: Dice5,
    title: "შემთხვევითი",
    description: "რანდომ კატეგორია",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    id: "library",
    icon: Library,
    title: "ბიბლიოთეკა",
    description: "აირჩიე კატეგორია",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "my-trivias",
    icon: Gamepad2,
    title: "ჩემი ტრივია",
    description: "ტრივია/კოლექცია",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "create",
    icon: Sparkles,
    title: "შექმნა",
    description: "ახალი ტრივია",
    gradient: "from-pink-500 to-rose-600",
  },
];

export function ChallengeTypeModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserProfile,
}: ChallengeTypeModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ChallengeStep>("select-type");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleOptionSelect = async (optionId: string) => {
    switch (optionId) {
      case "random":
        await handleRandomChallenge();
        break;
      case "library":
        setStep("library");
        break;
      case "my-trivias":
        setStep("my-trivias");
        break;
      case "create":
        setCreateModalOpen(true);
        break;
    }
  };

  const handleRandomChallenge = async () => {
    try {
      // Fetch a random category
      const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name, icon")
        .eq("is_active", true);

      if (error) throw error;

      if (!categories || categories.length === 0) {
        toast.error("კატეგორიები ვერ მოიძებნა");
        return;
      }

      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      await createChallengeRoom(randomCategory.id, randomCategory.name);
    } catch (err) {
      console.error("Error creating random challenge:", err);
      toast.error("შეცდომა მოხდა");
    }
  };

  const handleCategorySelect = async (category: { id: string; name: string }) => {
    await createChallengeRoom(category.id, category.name);
  };

  const handleTriviaSelect = async (trivia: { id: string; title: string; type: "trivia" | "collection" }) => {
    // For user-created trivias, we'll create a room with reference to the trivia
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
        return;
      }

      // Generate room code using the database function
      const { data: codeData } = await supabase.rpc("generate_room_code");
      const roomCode = codeData || generateRoomCode();
      
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          room_code: roomCode,
          host_user_id: user.id,
          challenged_user_id: targetUserId,
          room_name: trivia.title,
          game_type: "async",
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation to target user
      await supabase.from("game_invitations").insert({
        room_id: room.id,
        sender_id: user.id,
        receiver_id: targetUserId,
        status: "pending",
      });

      toast.success(`${targetUserProfile?.nickname}-ს გამოწვევა გაიგზავნა!`);
      onClose();
      navigate(`/team?room=${room.room_code}`);
    } catch (err) {
      console.error("Error creating trivia challenge:", err);
      toast.error("შეცდომა მოხდა");
    }
  };

  const createChallengeRoom = async (categoryId: string, categoryName: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      if (!user) {
        toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
        return;
      }

      // Generate room code using the database function
      const { data: codeData } = await supabase.rpc("generate_room_code");
      const roomCode = codeData || generateRoomCode();

      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          room_code: roomCode,
          host_user_id: user.id,
          challenged_user_id: targetUserId,
          category_id: categoryId,
          category_name: categoryName,
          game_type: "async",
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation to target user
      await supabase.from("game_invitations").insert({
        room_id: room.id,
        sender_id: user.id,
        receiver_id: targetUserId,
        status: "pending",
      });

      toast.success(`${targetUserProfile?.nickname}-ს გამოწვევა გაიგზავნა!`);
      onClose();
      navigate(`/team?room=${room.room_code}`);
    } catch (err) {
      console.error("Error creating challenge room:", err);
      toast.error("შეცდომა მოხდა");
    }
  };

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleBack = () => {
    setStep("select-type");
  };

  const handleClose = () => {
    setStep("select-type");
    onClose();
  };

  const handleCreateSingle = () => {
    setCreateModalOpen(false);
    navigate("/create-trivia?challenge=" + targetUserId);
    onClose();
  };

  const handleCreateCollection = () => {
    setCreateModalOpen(false);
    navigate("/create-collection?challenge=" + targetUserId);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-sm p-0 gap-0 border-0 bg-card rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {step !== "select-type" && (
                <motion.button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4 rotate-45" />
                </motion.button>
              )}
              <h2 className="font-bold text-foreground">
                {step === "select-type" && "⚔️ გამოწვევა"}
                {step === "library" && "📚 კატეგორია"}
                {step === "my-trivias" && "🎯 ჩემი ტრივია"}
              </h2>
            </div>
            <motion.button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-4">
            {step === "select-type" && (
              <>
                {/* Target User Info */}
                {targetUserProfile && (
                  <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/50">
                    <SmartAvatar
                      avatarUrl={targetUserProfile.avatar_url}
                      animatedAvatarUrl={targetUserProfile.animated_avatar_url}
                      fallback={targetUserProfile.nickname}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-foreground">
                        {targetUserProfile.nickname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        გამოწვევის ტიპი აირჩიე
                      </p>
                    </div>
                  </div>
                )}

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {challengeOptions.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${option.gradient} text-white text-left overflow-hidden`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <option.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">{option.title}</p>
                          <p className="text-xs text-white/80">{option.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {step === "library" && (
              <LibraryCategoryPicker onSelect={handleCategorySelect} />
            )}

            {step === "my-trivias" && (
              <MyTriviasPicker onSelect={handleTriviaSelect} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Trivia Modal */}
      <CreateTriviaTypeModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSelectSingle={handleCreateSingle}
        onSelectCollection={handleCreateCollection}
      />
    </>
  );
}

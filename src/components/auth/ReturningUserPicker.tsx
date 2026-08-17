import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lock, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import { useNavigate } from "react-router-dom";

interface LastUserData {
  nickname: string;
  avatar_url: string | null;
  animated_avatar_url: string | null;
  identifier: string;
}

interface ReturningUserPickerProps {
  user: LastUserData;
  onSignIn: (password: string) => Promise<void>;
  onAddUser: () => void;
  onSwitchUser: () => void;
}

export function ReturningUserPicker({ user, onSignIn, onAddUser, onSwitchUser }: ReturningUserPickerProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      await onSignIn(password);
    } catch (err: any) {
      setError(err?.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = user.avatar_url || null;

  return (
    <div
      className="h-[100dvh] overflow-y-auto safe-bleed flex flex-col items-center justify-center p-6 relative z-10"
      style={{
        background: "linear-gradient(180deg, #0f0f23 0%, #1a1a3e 50%, #2d1b4e 100%)",
      }}
    >
      <div className="absolute top-6 left-0 right-0 flex items-center justify-center px-6">
        <button onClick={() => navigate(-1)} className="absolute left-6 p-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <MyTriviaLiveLogo responsive textColor="light" />
      </div>

      <div className="flex items-center justify-center gap-12 md:gap-20">
        {/* User avatar */}
        <motion.div
          className="flex flex-col items-center cursor-pointer"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          onClick={() => !showPassword && setShowPassword(true)}
        >
          <div className="relative">
            <div
              className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
              style={{
                boxShadow: "0 0 40px rgba(156, 106, 222, 0.3), 0 0 80px rgba(156, 106, 222, 0.1)",
              }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.nickname} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-white/80">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {!showPassword && (
              <motion.div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lock className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>
          <h3 className="mt-4 text-xl md:text-2xl font-bold text-white capitalize">
            {user.nickname}
          </h3>
        </motion.div>

        {/* Add user button */}
        <motion.div
          className="flex flex-col items-center cursor-pointer"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", delay: 0.15 }}
          onClick={onAddUser}
        >
          <div className="w-[90px] h-[90px] md:w-28 md:h-28 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center hover:border-white/50 transition-colors">
            <Plus className="w-8 h-8 md:w-10 md:h-10 text-white/40" />
          </div>
          <h3 className="mt-4 text-lg md:text-xl font-medium text-white/50">
            {t("extra.addUser")}
          </h3>
        </motion.div>
      </div>

      {/* Password input area */}
      <AnimatePresence>
        {showPassword && (
          <motion.div
            className="mt-8 w-full max-w-xs flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="password"
                placeholder={t("extra.passwordPlaceholder")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !password}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("extra.signInBtn")}
            </ChunkyButton>
            <button
              onClick={() => { setShowPassword(false); setPassword(""); setError(""); }}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              {t("extra.backBtn")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Switch user link at bottom */}
      <motion.button
        className="absolute bottom-8 safe-bottom text-sm text-white/40 hover:text-white/70 transition-colors"
        onClick={onSwitchUser}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {t("extra.signInOtherAccount")}
      </motion.button>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ArrowLeft, Users, Bell, Sparkles } from "lucide-react";
import { SplineGlobe } from "@/components/home/SplineGlobe";

export default function Team() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Spline Background */}
      <SplineGlobe />
      
      {/* White Radial Mask */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, transparent 15%, hsl(0 0% 100% / 0.75) 40%, hsl(0 0% 100% / 0.9) 60%, hsl(0 0% 100% / 0.95) 100%)",
        }}
      />
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </motion.button>

      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center mb-8 shadow-xl"
      >
        <Users className="w-16 h-16 text-secondary-foreground" />
      </motion.div>

      {/* Coming Soon Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary uppercase tracking-wide">
            Coming Soon
          </span>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Team Battles
        </h1>
        <p className="text-muted-foreground max-w-sm">
          Team up with friends and compete against other teams in epic trivia battles. 
          Real-time multiplayer is on the way!
        </p>
      </motion.div>

      {/* Features Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-sm space-y-3 mb-8"
      >
        {[
          "Create or join teams with friends",
          "Real-time team vs team battles",
          "Team leaderboards and rankings",
          "Weekly team tournaments",
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-center gap-3 bg-card/50 rounded-xl p-3 border border-border"
          >
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">{feature}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Notify Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 w-full max-w-sm"
      >
        <ChunkyButton
          variant="secondary"
          size="lg"
          className="w-full"
          icon={<Bell className="w-5 h-5" />}
        >
          Notify Me When Ready
        </ChunkyButton>
      </motion.div>
    </div>
  );
}

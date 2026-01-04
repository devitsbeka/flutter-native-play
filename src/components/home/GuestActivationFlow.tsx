import { motion } from "framer-motion";
import { User, Camera, Sparkles, Wand2, Play } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

const steps = [
  { id: "signup", title: "რეგისტრაცია", icon: User },
  { id: "photo", title: "ფოტო", icon: Camera },
  { id: "avatar", title: "ავატარი", icon: Sparkles },
  { id: "animate", title: "ანიმაცია", icon: Wand2 },
];

export function GuestActivationFlow() {
  const { startOnboarding } = useOnboarding();

  return (
    <motion.div 
      className="flex flex-col items-center w-full px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main CTA Card */}
      <motion.button
        onClick={startOnboarding}
        className="relative w-full max-w-xs rounded-3xl p-6 mb-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 70% 50%) 100%)",
          boxShadow: "0 8px 32px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
        
        {/* Play icon */}
        <motion.div 
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play className="w-8 h-8 text-white fill-white" />
        </motion.div>
        
        <h2 className="text-white text-xl font-bold mb-1">დაიწყე თამაში</h2>
        <p className="text-white/80 text-sm">შექმენი ანგარიში და ითამაშე</p>
      </motion.button>

      {/* Steps Progress */}
      <div className="flex items-center justify-center gap-3 w-full max-w-xs">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isFirst = index === 0;
          
          return (
            <div key={step.id} className="flex items-center">
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Circle */}
                <div 
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center relative
                    ${isFirst 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                    }
                  `}
                  style={{
                    boxShadow: isFirst 
                      ? "0 4px 12px hsl(var(--primary) / 0.3)" 
                      : "none",
                  }}
                >
                  <Icon className="w-5 h-5" />
                  
                  {/* Number badge */}
                  <span 
                    className={`
                      absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold
                      flex items-center justify-center
                      ${isFirst 
                        ? "bg-primary-foreground text-primary" 
                        : "bg-border text-muted-foreground"
                      }
                    `}
                  >
                    {index + 1}
                  </span>
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    text-[10px] font-medium mt-1.5
                    ${isFirst ? "text-primary" : "text-muted-foreground"}
                  `}
                >
                  {step.title}
                </span>
              </motion.div>
              
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="w-2 h-px bg-border mx-1 mt-[-14px]" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Subtitle */}
      <p className="text-muted-foreground text-xs mt-4">
        4 მარტივი ნაბიჯი 🎮
      </p>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Check, User, Camera, Sparkles, Wand2 } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface ActivationStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
}

export function GuestActivationFlow() {
  const { startOnboarding } = useOnboarding();

  // For logged-out users, all steps are incomplete
  const steps: ActivationStep[] = [
    {
      id: "signup",
      title: "რეგისტრაცია",
      subtitle: "შექმენი ანგარიში",
      icon: <User className="w-5 h-5" />,
      completed: false,
      active: true,
    },
    {
      id: "photo",
      title: "ფოტო",
      subtitle: "ატვირთე სელფი",
      icon: <Camera className="w-5 h-5" />,
      completed: false,
      active: false,
    },
    {
      id: "avatar",
      title: "ავატარი",
      subtitle: "AI გენერაცია",
      icon: <Sparkles className="w-5 h-5" />,
      completed: false,
      active: false,
    },
    {
      id: "animate",
      title: "ანიმაცია",
      subtitle: "გააცოცხლე",
      icon: <Wand2 className="w-5 h-5" />,
      completed: false,
      active: false,
    },
  ];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Steps row */}
      <div className="flex items-center justify-center gap-1 mb-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <motion.button
              onClick={() => step.active && startOnboarding()}
              disabled={!step.active}
              className={`
                relative flex flex-col items-center
                ${step.active ? "cursor-pointer" : "cursor-default"}
              `}
              whileHover={step.active ? { scale: 1.05 } : {}}
              whileTap={step.active ? { scale: 0.95 } : {}}
            >
              {/* Circle */}
              <motion.div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center relative
                  ${step.completed 
                    ? "bg-emerald-500 text-white" 
                    : step.active 
                      ? "bg-white text-purple-600 shadow-lg ring-2 ring-purple-400/50" 
                      : "bg-white/60 text-gray-400"
                  }
                `}
                style={{
                  boxShadow: step.active 
                    ? "0 4px 0 #C084FC, 0 8px 20px rgba(168, 85, 247, 0.25)" 
                    : step.completed
                      ? "0 4px 0 #059669, 0 8px 20px rgba(16, 185, 129, 0.25)"
                      : "0 2px 8px rgba(0,0,0,0.08)",
                }}
                animate={step.active ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {step.completed ? (
                  <Check className="w-6 h-6" />
                ) : (
                  step.icon
                )}
                
                {/* Step number badge */}
                <div 
                  className={`
                    absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold
                    flex items-center justify-center
                    ${step.completed 
                      ? "bg-emerald-600 text-white" 
                      : step.active 
                        ? "bg-purple-600 text-white" 
                        : "bg-gray-300 text-gray-500"
                    }
                  `}
                >
                  {index + 1}
                </div>
              </motion.div>
              
              {/* Label */}
              <span 
                className={`
                  text-[11px] font-semibold mt-2 leading-tight text-center
                  ${step.completed 
                    ? "text-emerald-600" 
                    : step.active 
                      ? "text-purple-600" 
                      : "text-gray-400"
                  }
                `}
              >
                {step.title}
              </span>
            </motion.button>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div 
                className={`
                  w-4 h-0.5 mx-0.5 mt-[-18px]
                  ${step.completed ? "bg-emerald-400" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Call to action */}
      <motion.button
        onClick={startOnboarding}
        className="px-8 py-3 rounded-full font-bold text-white text-base"
        style={{
          background: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
          boxShadow: "0 4px 0 #7C3AED, 0 8px 24px rgba(168, 85, 247, 0.35)",
        }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 2 }}
      >
        🚀 დაიწყე თამაში
      </motion.button>
      
      {/* Subtitle */}
      <p className="text-gray-500 text-sm mt-3 text-center">
        4 ნაბიჯი სრულ აქტივაციამდე
      </p>
    </div>
  );
}

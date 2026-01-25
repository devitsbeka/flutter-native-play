import { motion } from "framer-motion";
import { Sparkles, Zap, Gift, Image, Ban, Star, Loader2 } from "lucide-react";
import crown3d from "@/assets/icons/crown-3d.png";
import { VIP_BENEFITS } from "@/hooks/useVipStatus";
import { useProPurchase } from "@/hooks/useProPurchase";

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  "⭐": <Star className="w-5 h-5 text-amber-500" />,
  "🎰": <Gift className="w-5 h-5 text-purple-500" />,
  "🎨": <Image className="w-5 h-5 text-pink-500" />,
  "⚡": <Zap className="w-5 h-5 text-yellow-500" />,
  "👑": <img src={crown3d} alt="Crown" className="w-5 h-5 object-contain" />,
  "🚫": <Ban className="w-5 h-5 text-red-500" />,
};

export function ShopProSidebar() {
  const { initiateProCheckout, isProcessing } = useProPurchase();

  const handleActivatePro = async () => {
    await initiateProCheckout("pro");
  };

  return (
    <div 
      className="sticky top-4 p-5 rounded-3xl space-y-4 overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(251,191,36,0.08) 50%, rgba(147,51,234,0.12) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px -4px rgba(147,51,234,0.25), 0 0 0 1px rgba(251,191,36,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(251,191,36,0.2)',
      }}
    >
      {/* Shimmer overlay */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        animate={{ 
          x: ['-100%', '200%'],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          repeatDelay: 2,
          ease: "easeInOut"
        }}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.15) 50%, transparent 100%)',
          width: '50%',
        }}
      />

      {/* Crown Header */}
      <div className="flex items-center gap-3 relative z-10">
        <motion.div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #9333EA 0%, #FBBF24 100%)',
            boxShadow: '0 4px 20px rgba(147,51,234,0.4)'
          }}
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <img src={crown3d} alt="Crown" className="w-8 h-8 object-contain" />
        </motion.div>
        <div>
          <h3 
            className="font-bold text-xl"
            style={{
              background: 'linear-gradient(135deg, #9333EA 0%, #FBBF24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            გახდი PRO
          </h3>
          <p className="text-sm text-muted-foreground">გახსენი ყველა შესაძლებლობა</p>
        </div>
        <Sparkles className="w-5 h-5 text-amber-400 ml-auto" />
      </div>

      {/* Benefits List */}
      <div className="space-y-2.5 relative z-10">
        {VIP_BENEFITS.map((benefit, index) => (
          <motion.div 
            key={benefit.title}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ 
              scale: 1.02, 
              x: 4,
              boxShadow: '0 4px 12px rgba(147,51,234,0.15), inset 0 1px 0 rgba(255,255,255,0.8)'
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-50 to-amber-50">
              {BENEFIT_ICONS[benefit.icon] || <span className="text-lg">{benefit.icon}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-700">{benefit.title}</p>
              <p className="text-xs text-muted-foreground truncate">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button 
        className="w-full py-3.5 rounded-xl font-bold text-white relative overflow-hidden disabled:opacity-70"
        style={{ 
          background: 'linear-gradient(135deg, #9333EA 0%, #D97706 50%, #FBBF24 100%)',
          boxShadow: '0 4px 20px rgba(147,51,234,0.4), 0 2px 8px rgba(251,191,36,0.3)'
        }}
        whileHover={{ scale: isProcessing ? 1 : 1.02 }}
        whileTap={{ scale: isProcessing ? 1 : 0.98 }}
        onClick={handleActivatePro}
        disabled={isProcessing}
      >
        {/* Button shimmer */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            repeatDelay: 1,
            ease: "easeInOut"
          }}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            width: '50%',
          }}
        />
        
        {/* Pulse ring */}
        <motion.div 
          className="absolute inset-0 rounded-xl"
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(251,191,36,0.4)', 
              '0 0 0 8px rgba(251,191,36,0)', 
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              მუშავდება...
            </>
          ) : (
            <>
              <img src={crown3d} alt="Crown" className="w-6 h-6 object-contain" />
              PRO-ს გააქტიურება
            </>
          )}
        </span>
      </motion.button>

      {/* Decorative elements */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
      />
      <div 
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)' }}
      />
    </div>
  );
}

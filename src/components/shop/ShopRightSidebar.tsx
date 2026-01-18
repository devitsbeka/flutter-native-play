import { motion } from "framer-motion";
import { Crown, Sparkles, Zap, Gift, Image, Ban, Star, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VIP_BENEFITS } from "@/hooks/useVipStatus";
import { useVipStatus } from "@/hooks/useVipStatus";

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  "⭐": <Star className="w-4 h-4 text-amber-500" />,
  "🎰": <Gift className="w-4 h-4 text-purple-500" />,
  "🎨": <Image className="w-4 h-4 text-pink-500" />,
  "⚡": <Zap className="w-4 h-4 text-yellow-500" />,
  "👑": <Crown className="w-4 h-4 text-amber-600" />,
  "🚫": <Ban className="w-4 h-4 text-red-500" />,
};

export function ShopRightSidebar() {
  const navigate = useNavigate();
  const { isVip } = useVipStatus();

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-full border-l border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* PRO Benefits Widget - Only show if not VIP */}
        {!isVip && (
          <motion.div 
            className="relative p-4 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(251,191,36,0.08) 50%, rgba(147,51,234,0.12) 100%)',
              boxShadow: '0 4px 24px -4px rgba(147,51,234,0.25), 0 0 0 1px rgba(251,191,36,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Shimmer overlay */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.15) 50%, transparent 100%)',
                width: '50%',
              }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 relative z-10 mb-3">
              <motion.div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #9333EA 0%, #FBBF24 100%)',
                  boxShadow: '0 4px 16px rgba(147,51,234,0.4)'
                }}
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Crown className="w-5 h-5 text-white drop-shadow-md" />
              </motion.div>
              <div className="flex-1">
                <h3 
                  className="font-bold text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #9333EA 0%, #FBBF24 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  გახდი PRO
                </h3>
                <p className="text-xs text-muted-foreground">გახსენი ყველა შესაძლებლობა</p>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            {/* Benefits List */}
            <div className="space-y-2 relative z-10 mb-3">
              {VIP_BENEFITS.map((benefit, index) => (
                <motion.div 
                  key={benefit.title}
                  className="flex items-center gap-2.5 p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-50 to-amber-50">
                    {BENEFIT_ICONS[benefit.icon] || <span className="text-sm">{benefit.icon}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-slate-700">{benefit.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button 
              className="w-full py-2.5 rounded-xl font-bold text-white text-sm relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, #9333EA 0%, #D97706 50%, #FBBF24 100%)',
                boxShadow: '0 4px 16px rgba(147,51,234,0.4), 0 2px 6px rgba(251,191,36,0.3)'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/vip')}
            >
              <motion.div 
                className="absolute inset-0 pointer-events-none"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  width: '50%',
                }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                PRO-ს გააქტიურება
              </span>
            </motion.button>

            {/* Decorative elements */}
            <div 
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
            />
            <div 
              className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)' }}
            />
          </motion.div>
        )}

        {/* Weekly Challenge Widget */}
        <motion.div 
          className="p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">კვირის გამოწვევა</h3>
              <p className="text-xs text-muted-foreground">მოიგე 10 თამაში</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">პროგრესი</span>
              <span className="font-medium">3/10</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '30%' }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">ჯილდო: 500 მონეტა + 50 ლარი</p>
          </div>
        </motion.div>

        {/* Quick Stats Widget */}
        <motion.div 
          className="p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="font-semibold text-sm mb-3">დღის სტატისტიკა</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-primary">12</p>
              <p className="text-xs text-muted-foreground">თამაშები</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-green-500">8</p>
              <p className="text-xs text-muted-foreground">მოგებები</p>
            </div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

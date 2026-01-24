import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Sparkles, Gift, TrendingUp, ArrowRight, Trophy, Star, Shield, Lock } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';

// Import actual guest-facing components
import { GuestActivationFlow } from '@/components/home/GuestActivationFlow';

// Mock wrapper for mobile preview
function MobileFrame({ 
  children, 
  title,
  description 
}: { 
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center">
      <div className="mb-3 text-center">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      
      {/* iPhone-like frame */}
      <div 
        className="relative bg-gray-900 rounded-[40px] p-3 shadow-2xl"
        style={{ width: 390, height: 844 }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20" />
        
        {/* Screen */}
        <div 
          className="w-full h-full bg-background rounded-[32px] overflow-hidden relative"
        >
          {/* Status bar mock */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-sm z-10 flex items-end justify-between px-6 pb-1">
            <span className="text-xs font-medium">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-4 h-2.5 border border-current rounded-sm">
                <div className="w-2/3 h-full bg-current rounded-sm" />
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="w-full h-full overflow-y-auto pt-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal preview wrapper - renders content inline without portal
function ModalPreview({ 
  children,
  title,
  description 
}: { 
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center">
      <div className="mb-3 text-center">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      
      {/* iPhone-like frame */}
      <div 
        className="relative bg-gray-900 rounded-[40px] p-3 shadow-2xl"
        style={{ width: 390, height: 844 }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20" />
        
        {/* Screen with modal overlay */}
        <div 
          className="w-full h-full bg-background rounded-[32px] overflow-hidden relative flex items-center justify-center"
        >
          {/* Dimmed background */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Modal content - direct children, no portals */}
          <div className="relative z-10 w-full px-4 max-h-full overflow-y-auto py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== INLINE MODAL PREVIEWS =====
// These are static previews that render inline without AnimatePresence/portals

// Stat component for modal previews
function StatBox({ icon, value, label, highlight }: { icon: React.ReactNode; value: number; label: string; highlight?: boolean }) {
  return (
    <div 
      className="rounded-xl p-3 text-center"
      style={{
        background: highlight 
          ? "linear-gradient(180deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.08) 100%)"
          : "linear-gradient(180deg, rgba(147,51,234,0.08) 0%, rgba(147,51,234,0.03) 100%)",
        border: highlight 
          ? "2px solid rgba(251,191,36,0.4)"
          : "2px solid rgba(147,51,234,0.2)",
        boxShadow: highlight 
          ? "0 3px 0 rgba(251,191,36,0.2)"
          : "0 3px 0 rgba(147,51,234,0.1)",
      }}
    >
      <div className="flex justify-center mb-1">
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function RegisterPromptPreview() {
  return (
    <div 
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
        boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
        border: "3px solid rgba(255, 255, 255, 0.95)",
      }}
    >
      {/* Header */}
      <div className="pt-8 pb-4 px-6 text-center">
        <div className="mx-auto mb-3 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
            boxShadow: "0 5px 0 #C4B5FD",
          }}
        >
          <span className="text-4xl">✨</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900">შესანიშნავი პროგრესი!</h2>
        <p className="text-sm text-gray-500 mt-1">არ დაკარგო შენი მიღწევები</p>
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBox
            icon={<Trophy className="h-6 w-6 text-primary" />}
            value={5}
            label="დონე გავლილი"
          />
          <StatBox
            icon={<Star className="h-6 w-6 text-amber-500 fill-amber-500" />}
            value={12}
            label="ვარსკვლავი"
            highlight
          />
        </div>

        <div className="space-y-2 mb-4">
          <div 
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)",
              border: "2px solid rgba(34,197,94,0.3)",
              boxShadow: "0 3px 0 rgba(34,197,94,0.15)",
            }}
          >
            <Shield className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-gray-800">პროგრესი შენახული სამუდამოდ</p>
          </div>
          <div 
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "linear-gradient(180deg, rgba(147,51,234,0.1) 0%, rgba(147,51,234,0.05) 100%)",
              border: "2px solid rgba(147,51,234,0.3)",
              boxShadow: "0 3px 0 rgba(147,51,234,0.15)",
            }}
          >
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium text-gray-800">ლიდერბორდში მონაწილეობა</p>
          </div>
        </div>

        <div className="space-y-2">
          <ChunkyButton variant="success" size="lg" className="w-full" icon={<Sparkles className="w-5 h-5" />}>
            უფასო რეგისტრაცია
          </ChunkyButton>
          <button className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            მოგვიანებით
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestMaxPlaysPreview() {
  return (
    <div 
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
        boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
        border: "3px solid rgba(255, 255, 255, 0.95)",
      }}
    >
      {/* Header */}
      <div className="pt-8 pb-4 px-6 text-center">
        <div className="mx-auto mb-3 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
            boxShadow: "0 5px 0 #C4B5FD",
          }}
        >
          <span className="text-4xl">🎮</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900">მოგეწონა?</h2>
        <p className="text-sm text-gray-500 mt-1">შექმენი ანგარიში გასაგრძელებლად</p>
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBox
            icon={<Trophy className="h-6 w-6 text-primary" />}
            value={3}
            label="დონე გავლილი"
          />
          <StatBox
            icon={<Star className="h-6 w-6 text-amber-500 fill-amber-500" />}
            value={8}
            label="ვარსკვლავი"
            highlight
          />
        </div>

        <div className="space-y-2 mb-4">
          <div 
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.05) 100%)",
              border: "2px solid rgba(168,85,247,0.3)",
              boxShadow: "0 3px 0 rgba(168,85,247,0.15)",
            }}
          >
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium text-gray-800">შექმენი უნიკალური ავატარი</p>
          </div>
          
          <div 
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)",
              border: "2px solid rgba(34,197,94,0.3)",
              boxShadow: "0 3px 0 rgba(34,197,94,0.15)",
            }}
          >
            <Trophy className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-gray-800">შეინახე პროგრესი სამუდამოდ</p>
          </div>

          <div 
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
              border: "2px solid rgba(59,130,246,0.3)",
              boxShadow: "0 3px 0 rgba(59,130,246,0.15)",
            }}
          >
            <Lock className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm font-medium text-gray-800">გახსენი ყველა ფუნქცია</p>
          </div>
        </div>

        <ChunkyButton variant="success" size="lg" className="w-full" icon={<Sparkles className="w-5 h-5" />}>
          წავედით!
        </ChunkyButton>
      </div>
    </div>
  );
}

function GuestJoinPreview() {
  const benefits = [
    { icon: Sparkles, text: 'Custom 3D ავატარი', color: 'text-purple-400' },
    { icon: Gift, text: 'ყოველდღიური ჯილდოები', color: 'text-yellow-400' },
    { icon: TrendingUp, text: 'პროგრესის თრექინგი', color: 'text-green-400' },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">შემოგვიერთდი!</h2>
        <p className="text-purple-200/80">შეიყვანე შენი სახელი თამაშისთვის</p>
      </div>

      {/* Nickname Input */}
      <div className="mb-6">
        <Input
          value="Player123"
          readOnly
          placeholder="შენი სახელი..."
          maxLength={20}
          className="w-full h-14 text-lg text-center bg-white/10 border-2 rounded-2xl text-white placeholder:text-purple-300/50 border-purple-400/30"
        />
      </div>

      {/* Join as Guest Button */}
      <ChunkyButton
        variant="primary"
        size="lg"
        className="w-full mb-6"
        icon={<ArrowRight className="w-5 h-5" />}
      >
        თამაშში შესვლა
      </ChunkyButton>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-purple-400/30" />
        <span className="text-purple-300/60 text-sm">ან</span>
        <div className="flex-1 h-px bg-purple-400/30" />
      </div>

      {/* Signup CTA */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="p-4">
          <span className="text-white font-medium block mb-3">შექმენი ანგარიში</span>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                <span className="text-white/80">{benefit.text}</span>
              </div>
            ))}

            <ChunkyButton
              variant="secondary"
              size="md"
              className="w-full mt-4"
              icon={<Sparkles className="w-4 h-4" />}
            >
              ანგარიშის შექმნა
            </ChunkyButton>
          </div>
        </div>
      </div>

      {/* Game Code Display */}
      <div className="mt-6 text-center">
        <p className="text-purple-300/60 text-sm">
          თამაშის კოდი: <span className="font-mono font-bold text-purple-200">1234</span>
        </p>
      </div>
    </div>
  );
}

export default function AdminGuestShowcase() {
  const [activeTab, setActiveTab] = useState('onboarding');

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold">Guest Experience Preview</h1>
        <p className="text-muted-foreground mt-1">
          Mobile breakpoint designs for guest-facing pages and onboarding
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b border-border/50">
          <TabsList>
            <TabsTrigger value="onboarding">Onboarding Flow</TabsTrigger>
            <TabsTrigger value="modals">Guest Modals</TabsTrigger>
            <TabsTrigger value="components">UI Components</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Onboarding Flow Tab */}
          <TabsContent value="onboarding" className="h-full m-0 p-6">
            <ScrollArea className="h-full">
              <div className="flex gap-8 pb-6">
                <MobileFrame 
                  title="Guest Activation Flow"
                  description="Initial onboarding CTA"
                >
                  <div className="p-4 pt-8">
                    <GuestActivationFlow />
                  </div>
                </MobileFrame>

                <MobileFrame 
                  title="Guest Progress Banner"
                  description="Shown when guest has progress"
                >
                  <div className="p-4 pt-8">
                    <div className="space-y-4">
                      <div className="h-32 bg-muted/30 rounded-xl flex items-center justify-center text-muted-foreground text-sm">
                        Page Content
                      </div>
                      {/* Static banner preview */}
                      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-amber-600">პროგრესი არ არის შენახული!</p>
                            <div className="flex gap-4 mt-1 text-sm">
                              <span>🏆 5 დონე</span>
                              <span>⭐ 12 ვარსკვლავი</span>
                            </div>
                          </div>
                          <button className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">
                            💾
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </MobileFrame>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* Guest Modals Tab */}
          <TabsContent value="modals" className="h-full m-0 p-6">
            <ScrollArea className="h-full">
              <div className="flex gap-8 pb-6">
                <ModalPreview
                  title="Register Prompt Modal"
                  description="Shown after guest progress"
                >
                  <RegisterPromptPreview />
                </ModalPreview>

                <ModalPreview
                  title="Max Plays Modal"
                  description="When guest reaches play limit"
                >
                  <GuestMaxPlaysPreview />
                </ModalPreview>

                {/* Guest Join has special purple background */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="mb-3 text-center">
                    <h3 className="font-semibold text-sm text-foreground">Guest Join Modal</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">TV game guest join flow</p>
                  </div>
                  
                  <div 
                    className="relative bg-gray-900 rounded-[40px] p-3 shadow-2xl"
                    style={{ width: 390, height: 844 }}
                  >
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20" />
                    
                    <div 
                      className="w-full h-full rounded-[32px] overflow-hidden relative flex items-center justify-center p-4"
                      style={{ background: 'linear-gradient(to bottom right, rgb(88, 28, 135), rgb(67, 56, 202))' }}
                    >
                      <GuestJoinPreview />
                    </div>
                  </div>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* UI Components Tab */}
          <TabsContent value="components" className="h-full m-0 p-6">
            <ScrollArea className="h-full">
              <div className="flex gap-8 pb-6">
                <MobileFrame
                  title="Home Screen (Guest)"
                  description="Main screen without auth"
                >
                  <div className="p-4 pt-8 space-y-4">
                    {/* Mock home content */}
                    <div className="text-center py-8">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center text-4xl mb-4">
                        🎮
                      </div>
                      <h2 className="text-xl font-bold">MyTrivia</h2>
                      <p className="text-muted-foreground text-sm mt-1">სტუმარი</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-24 bg-primary/10 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-2xl">
                          🎯
                        </div>
                        <div>
                          <p className="font-semibold">დაიწყე თამაში</p>
                          <p className="text-xs text-muted-foreground">3 თამაში დარჩენილია</p>
                        </div>
                      </div>
                      
                      <div className="h-16 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-600">დარეგისტრირდი პროგრესის შესანახად</span>
                        <span className="text-lg">→</span>
                      </div>
                    </div>
                  </div>
                </MobileFrame>

                <MobileFrame
                  title="Category Selection (Guest)"
                  description="Limited categories view"
                >
                  <div className="p-4 pt-8 space-y-3">
                    <h2 className="text-lg font-bold mb-4">აირჩიე კატეგორია</h2>
                    
                    {['🌍 გეოგრაფია', '🏛️ ისტორია', '🎬 კინო', '⚽ სპორტი'].map((cat, i) => (
                      <div 
                        key={i}
                        className="h-16 bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3"
                      >
                        <span className="text-2xl">{cat.split(' ')[0]}</span>
                        <span className="font-medium">{cat.split(' ')[1]}</span>
                      </div>
                    ))}
                    
                    <div className="h-16 bg-muted/50 rounded-xl p-4 flex items-center gap-3 opacity-50">
                      <span className="text-2xl">🔒</span>
                      <span className="font-medium text-muted-foreground">მეტი კატეგორია...</span>
                    </div>
                  </div>
                </MobileFrame>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

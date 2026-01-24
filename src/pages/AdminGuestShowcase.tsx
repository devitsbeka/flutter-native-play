import { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import actual guest-facing components
import { GuestActivationFlow } from '@/components/home/GuestActivationFlow';
import { GuestMaxPlaysModal } from '@/components/home/GuestMaxPlaysModal';
import { GuestProgressBanner } from '@/components/home/GuestProgressBanner';
import { RegisterPromptModal } from '@/components/home/RegisterPromptModal';
import { GuestJoinModal } from '@/components/controller/GuestJoinModal';

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

// Modal preview wrapper - centers modal content
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
          
          {/* Modal content */}
          <div className="relative z-10 w-full px-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminGuestShowcase() {
  const [activeTab, setActiveTab] = useState('onboarding');

  // Mock handlers
  const noop = () => {};

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
                      {/* Force show the banner for preview */}
                      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
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
                  <RegisterPromptModal
                    isOpen={true}
                    onClose={noop}
                    onRegister={noop}
                  />
                </ModalPreview>

                <ModalPreview
                  title="Max Plays Modal"
                  description="When guest reaches play limit"
                >
                  <GuestMaxPlaysModal
                    isOpen={true}
                    onClose={noop}
                    onRegister={noop}
                  />
                </ModalPreview>

                <ModalPreview
                  title="Guest Join Modal"
                  description="TV game guest join flow"
                >
                  <GuestJoinModal
                    isOpen={true}
                    code="1234"
                    onJoinAsGuest={async () => {}}
                    onClose={noop}
                  />
                </ModalPreview>
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

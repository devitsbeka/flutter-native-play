import { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import ACTUAL guest-facing components
import { GuestActivationFlow } from '@/components/home/GuestActivationFlow';
import { GuestProgressBanner } from '@/components/home/GuestProgressBanner';
import { RegisterPromptModal } from '@/components/home/RegisterPromptModal';
import { GuestMaxPlaysModal } from '@/components/home/GuestMaxPlaysModal';
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

// Modal preview frame with dimmed background
function ModalPreviewFrame({ 
  children,
  title,
  description,
  darkBg = false
}: { 
  children: React.ReactNode;
  title: string;
  description?: string;
  darkBg?: boolean;
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
          className={`w-full h-full rounded-[32px] overflow-hidden relative flex items-center justify-center ${darkBg ? '' : 'bg-background'}`}
          style={darkBg ? { background: 'linear-gradient(to bottom right, rgb(88, 28, 135), rgb(67, 56, 202))' } : undefined}
        >
          {/* Dimmed background for modals */}
          {!darkBg && <div className="absolute inset-0 bg-black/50" />}
          
          {/* Modal content */}
          <div className="relative z-10 w-full px-4 max-h-full overflow-y-auto py-8">
            {children}
          </div>
        </div>
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
          Live preview of actual guest-facing components at mobile breakpoint (390×844)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b border-border/50">
          <TabsList>
            <TabsTrigger value="onboarding">Onboarding Flow</TabsTrigger>
            <TabsTrigger value="modals">Guest Modals</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Onboarding Flow Tab */}
          <TabsContent value="onboarding" className="h-full m-0 p-6">
            <ScrollArea className="h-full">
              <div className="flex gap-8 pb-6">
                <MobileFrame 
                  title="Guest Activation Flow"
                  description="Initial onboarding CTA (actual component)"
                >
                  <div className="p-4 pt-8">
                    <GuestActivationFlow />
                  </div>
                </MobileFrame>

                <MobileFrame 
                  title="Guest Progress Banner"
                  description="Shown when guest has progress (actual component)"
                >
                  <div className="p-4 pt-8 space-y-4">
                    <div className="h-32 bg-muted/30 rounded-xl flex items-center justify-center text-muted-foreground text-sm">
                      Page Content Above
                    </div>
                    {/* Actual GuestProgressBanner component */}
                    <GuestProgressBanner />
                    <div className="text-xs text-center text-muted-foreground">
                      (Banner shows when guest has saved progress)
                    </div>
                  </div>
                </MobileFrame>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>

          {/* Guest Modals Tab - Using inline prop for actual components */}
          <TabsContent value="modals" className="h-full m-0 p-6">
            <ScrollArea className="h-full">
              <div className="flex gap-8 pb-6">
                <ModalPreviewFrame
                  title="Register Prompt Modal"
                  description="Prompts guest to register (actual component)"
                >
                  <RegisterPromptModal
                    isOpen={true}
                    onClose={() => {}}
                    onRegister={() => {}}
                    inline
                  />
                </ModalPreviewFrame>

                <ModalPreviewFrame
                  title="Guest Max Plays Modal"
                  description="Shown when guest reaches play limit (actual component)"
                >
                  <GuestMaxPlaysModal
                    isOpen={true}
                    onClose={() => {}}
                    onRegister={() => {}}
                    inline
                  />
                </ModalPreviewFrame>

                <ModalPreviewFrame
                  title="Guest Join Modal"
                  description="Join multiplayer game as guest (actual component)"
                  darkBg
                >
                  <GuestJoinModal
                    isOpen={true}
                    onClose={() => {}}
                    onJoinAsGuest={() => Promise.resolve()}
                    code="1234"
                    inline
                  />
                </ModalPreviewFrame>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

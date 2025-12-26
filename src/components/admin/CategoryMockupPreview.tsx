import { cn } from '@/lib/utils';

interface CategoryMockupPreviewProps {
  name: string;
  icon: string;
  color: string;
  description?: string;
  totalLevels?: number;
}

export function CategoryMockupPreview({
  name,
  icon,
  color,
  description,
  totalLevels = 20,
}: CategoryMockupPreviewProps) {
  return (
    <div className="flex flex-col items-center">
      {/* iPhone Frame */}
      <div className="relative w-[280px] h-[400px] bg-black rounded-[40px] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-background rounded-[32px] overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-10 pb-4">
            <h2 className="text-lg font-bold text-foreground">კატეგორიები</h2>
          </div>

          {/* Category Card Preview */}
          <div className="px-4">
            <div className={cn(
              "p-4 rounded-2xl bg-gradient-to-br relative overflow-hidden",
              color
            )}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full border-4 border-white" />
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full border-4 border-white" />
              </div>

              <div className="relative z-10 flex items-start gap-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <span className="text-3xl">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">
                    {name || 'კატეგორიის სახელი'}
                  </h3>
                  <p className="text-white/70 text-sm mt-0.5 line-clamp-2">
                    {description || 'აღწერა აქ გამოჩნდება'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded">
                      {totalLevels} დონე
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Other category placeholders */}
            <div className="mt-3 space-y-2 opacity-30">
              <div className="h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500" />
              <div className="h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">აპლიკაციაში ჩვენება</p>
    </div>
  );
}

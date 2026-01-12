import { Filter, Image, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Category {
  id: string;
  uuid?: string;
  name: string;
  icon?: string;
}

interface IconReviewFiltersProps {
  categories: Category[];
  categoryFilter: string | null;
  setCategoryFilter: (id: string | null) => void;
  showOnlyWithoutIcons: boolean;
  setShowOnlyWithoutIcons: (value: boolean) => void;
  stats: {
    total: number;
    withIcons: number;
    withoutIcons: number;
  };
}

export function IconReviewFilters({
  categories,
  categoryFilter,
  setCategoryFilter,
  showOnlyWithoutIcons,
  setShowOnlyWithoutIcons,
  stats
}: IconReviewFiltersProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Filter className="w-5 h-5" />
          {(categoryFilter || showOnlyWithoutIcons) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>ფილტრები</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">სულ</div>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 text-center">
              <div className="flex items-center justify-center gap-1">
                <Image className="w-4 h-4 text-green-500" />
                <span className="text-2xl font-bold text-green-500">{stats.withIcons}</span>
              </div>
              <div className="text-xs text-muted-foreground">აიკონით</div>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 text-center">
              <div className="flex items-center justify-center gap-1">
                <ImageOff className="w-4 h-4 text-orange-500" />
                <span className="text-2xl font-bold text-orange-500">{stats.withoutIcons}</span>
              </div>
              <div className="text-xs text-muted-foreground">აიკონის გარეშე</div>
            </div>
          </div>

          {/* Only without icons toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <Label htmlFor="without-icons" className="cursor-pointer">
              მხოლოდ აიკონის გარეშე
            </Label>
            <Switch
              id="without-icons"
              checked={showOnlyWithoutIcons}
              onCheckedChange={setShowOnlyWithoutIcons}
            />
          </div>

          {/* Category filter */}
          <div className="space-y-2">
            <Label>კატეგორია</Label>
            <Select
              value={categoryFilter || 'all'}
              onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="ყველა კატეგორია" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა კატეგორია</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={(cat as any).uuid || cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

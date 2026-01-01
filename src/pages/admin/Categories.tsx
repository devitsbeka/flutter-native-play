import { useState } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminCategories, AdminCategory } from '@/hooks/useAdminCategories';
import { CategoryMockupPreview } from '@/components/admin/CategoryMockupPreview';
import { IconPicker } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';

const CATEGORY_TYPES = [
  { value: 'classic', label: 'კლასიკური' },
  { value: 'fun', label: 'გართობა' },
  { value: 'educational', label: 'საგანმანათლებლო' },
];

const EMOJI_OPTIONS = [
  '📚', '🏰', '📜', '🌍', '🔬', '⚽', '🎨', '⛪', '🤔', '🏺',
  '🗣️', '🏛️', '💰', '⚔️', '🏗️', '🎬', '🎵', '🍲', '🦁', '📱',
  '📺', '🎮', '🎌', '📲', '👗', '🤯', '🔍', '⭐', '😂', '🍜',
  '🧮', '💻', '🚀', '🍇', '🌿', '🧠', '🏥', '⚛️', '🧪', '🧬',
];

const GRADIENT_PRESETS = [
  { value: 'from-blue-400 to-cyan-500', label: 'ცისფერი' },
  { value: 'from-violet-400 to-purple-500', label: 'იასამნისფერი' },
  { value: 'from-amber-400 to-orange-500', label: 'ნარინჯისფერი' },
  { value: 'from-emerald-400 to-teal-500', label: 'მწვანე' },
  { value: 'from-rose-400 to-pink-500', label: 'ვარდისფერი' },
  { value: 'from-red-400 to-orange-500', label: 'წითელი' },
];

export default function AdminCategories() {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useAdminCategories();
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [iconSlugError, setIconSlugError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    icon: '📚',
    icon_slug: '',
    color: 'from-blue-400 to-cyan-500',
    description: '',
    total_levels: 20,
    type: 'classic',
    is_active: true,
    sort_order: 0,
  });

  // Validate icon_slug exists in the icon_library
  const validateIconSlug = async (slug: string): Promise<boolean> => {
    if (!slug.trim()) return true; // Empty is valid (will use emoji fallback)
    
    const { data, error } = await supabase
      .from('icon_library')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) {
      console.error('Error validating icon slug:', error);
      return false;
    }
    
    return !!data;
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      name: '',
      icon: '📚',
      icon_slug: '',
      color: 'from-blue-400 to-cyan-500',
      description: '',
      total_levels: 20,
      type: 'classic',
      is_active: true,
      sort_order: 0,
    });
    setIconSlugError(null);
  };

  const openAddDialog = () => {
    resetForm();
    setEditingCategory(null);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (category: AdminCategory) => {
    setFormData({
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      icon_slug: (category as any).icon_slug || '',
      color: category.color,
      description: category.description || '',
      total_levels: category.total_levels,
      type: category.type,
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setEditingCategory(category);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate icon_slug if provided
    if (formData.icon_slug.trim()) {
      setIconSlugError(null);
      const isValid = await validateIconSlug(formData.icon_slug);
      if (!isValid) {
        setIconSlugError(`აიკონი "${formData.icon_slug}" არ მოიძებნა ბიბლიოთეკაში`);
        toast.error('აიკონი ვერ მოიძებნა', {
          description: `"${formData.icon_slug}" არ არსებობს აიკონების ბიბლიოთეკაში. გთხოვთ აირჩიოთ სხვა აიკონი.`
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      setIsAddDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleToggleActive = async (category: AdminCategory) => {
    await updateCategory(category.id, { is_active: !category.is_active });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.category_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <FolderOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">კატეგორიები</h1>
              <p className="text-sm text-muted-foreground">{categories.length} კატეგორია</p>
            </div>
          </div>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            დამატება
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ძიება..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Compact Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredCategories.map((category) => (
            <Card 
              key={category.id} 
              className={cn(
                "transition-all hover:shadow-sm overflow-hidden",
                !category.is_active && "opacity-50"
              )}
            >
              <CardContent className="p-0">
                <div className={cn(
                  "h-2 bg-gradient-to-r",
                  category.color
                )} />
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br text-xl",
                      category.color
                    )}>
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{category.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {category.category_id}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {CATEGORY_TYPES.find(t => t.value === category.type)?.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {category.total_levels} დონე
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-0.5 mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleActive(category)}
                    >
                      {category.is_active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeleteTarget(category)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {search ? 'კატეგორიები ვერ მოიძებნა' : 'დაამატეთ პირველი კატეგორია'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog with Split Layout */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg">
              {editingCategory ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-h-[calc(90vh-140px)] overflow-hidden">
            {/* Form Side */}
            <ScrollArea className="h-[500px] border-r">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ID (slug)</Label>
                    <Input
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      placeholder="geography"
                      disabled={!!editingCategory}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">სახელი</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="გეოგრაფია"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">აიკონი</Label>
                  <Tabs defaultValue={formData.icon_slug ? "library" : "emoji"} className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="emoji">ემოჯი</TabsTrigger>
                      <TabsTrigger value="library">ბიბლიოთეკა (9K)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emoji" className="mt-2">
                      <div className="flex flex-wrap gap-1 p-2 border rounded-lg max-h-24 overflow-y-auto">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormData({ ...formData, icon: emoji, icon_slug: '' })}
                            className={cn(
                              "text-xl p-1 rounded hover:bg-muted transition-colors",
                              formData.icon === emoji && !formData.icon_slug && "bg-primary/20 ring-2 ring-primary"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="library" className="mt-2">
                      <IconPicker
                        value={formData.icon_slug}
                        onChange={(slug) => {
                          setFormData({ ...formData, icon_slug: slug });
                          setIconSlugError(null); // Clear error when user selects from picker
                        }}
                      />
                      {iconSlugError && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <p className="text-xs text-destructive">{iconSlugError}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ფერი</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: preset.value })}
                        className={cn(
                          "h-8 rounded-lg bg-gradient-to-r transition-all",
                          preset.value,
                          formData.color === preset.value && "ring-2 ring-primary ring-offset-2"
                        )}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ტიპი</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">დონეები</Label>
                    <Input
                      type="number"
                      value={formData.total_levels}
                      onChange={(e) => setFormData({ ...formData, total_levels: parseInt(e.target.value) || 20 })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">აღწერა</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="კატეგორიის აღწერა..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Preview Side */}
            <div className="bg-muted/30 flex items-center justify-center p-6">
              <CategoryMockupPreview
                name={formData.name}
                icon={formData.icon}
                color={formData.color}
                description={formData.description}
                totalLevels={formData.total_levels}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              გაუქმება
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !formData.category_id || !formData.name}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingCategory ? 'შენახვა' : 'დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხარ?</AlertDialogTitle>
            <AlertDialogDescription>
              კატეგორია "{deleteTarget?.name}" წაიშლება სამუდამოდ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
}

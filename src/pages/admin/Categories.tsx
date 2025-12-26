import { useState } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  '🔭', '🪨', '🌱', '🤖', '👨‍💻'
];

export default function AdminCategories() {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useAdminCategories();
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    icon: '📚',
    color: 'from-blue-400 to-cyan-500',
    description: '',
    total_levels: 20,
    type: 'classic',
    is_active: true,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      category_id: '',
      name: '',
      icon: '📚',
      color: 'from-blue-400 to-cyan-500',
      description: '',
      total_levels: 20,
      type: 'classic',
      is_active: true,
      sort_order: 0,
    });
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">კატეგორიები</h1>
              <p className="text-muted-foreground">მართეთ თამაშის კატეგორიები</p>
            </div>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            დამატება
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="მოძებნე კატეგორია..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className={cn(!category.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{category.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.category_id}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {CATEGORY_TYPES.find(t => t.value === category.type)?.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {category.total_levels} დონე
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-1 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(category)}
                  >
                    {category.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(category)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {search ? 'კატეგორიები ვერ მოიძებნა' : 'კატეგორიები არ არის'}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID (slug)</Label>
                <Input
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  placeholder="geography"
                  disabled={!!editingCategory}
                />
              </div>
              <div className="space-y-2">
                <Label>სახელი</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="გეოგრაფია"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>აიკონი</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={cn(
                      "text-2xl p-1 rounded hover:bg-muted transition-colors",
                      formData.icon === emoji && "bg-primary/20 ring-2 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ტიპი</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>დონეების რაოდენობა</Label>
                <Input
                  type="number"
                  value={formData.total_levels}
                  onChange={(e) => setFormData({ ...formData, total_levels: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ფერი (gradient)</Label>
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="from-blue-400 to-cyan-500"
              />
              <div className={`h-10 rounded-lg bg-gradient-to-br ${formData.color}`} />
            </div>

            <div className="space-y-2">
              <Label>აღწერა</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="კატეგორიის მოკლე აღწერა..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              გაუქმება
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.category_id || !formData.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              კატეგორია "{deleteTarget?.name}" წაიშლება სამუდამოდ. ეს მოქმედება შეუქცევადია.
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

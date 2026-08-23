import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw,
  Clock,
  Target,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/lib/toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface GenerationJob {
  id: string;
  name: string;
  status: string;
  target_count: number;
  generated_count: number;
  approved_count: number;
  duplicate_count: number;
  error_count: number;
  categories: { id: string; name: string; quantity: number }[];
  current_category_index: number;
  difficulty_distribution: { easy: number; medium: number; hard: number };
  batch_size: number;
  interval_minutes: number;
  auto_approve: boolean;
  started_at: string | null;
  completed_at: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export function AutoGenerationPanel({ categories }: { categories: Category[] }) {
  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [jobName, setJobName] = useState('');
  const [targetCount, setTargetCount] = useState(1000);
  const [hoursToComplete, setHoursToComplete] = useState(12);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState({ easy: 33, medium: 34, hard: 33 });
  const [autoApprove, setAutoApprove] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch active jobs
  useEffect(() => {
    fetchJobs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('generation_jobs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_jobs'
      }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .in('status', ['pending', 'running', 'paused'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveJobs(data.map(job => ({
        ...job,
        categories: job.categories as unknown as { id: string; name: string; quantity: number }[],
        difficulty_distribution: job.difficulty_distribution as unknown as { easy: number; medium: number; hard: number }
      })) as GenerationJob[]);
    }
  };

  const calculateInterval = () => {
    const totalMinutes = hoursToComplete * 60;
    const batches = Math.ceil(targetCount / batchSize);
    return Math.max(1, Math.floor(totalMinutes / batches));
  };

  const distributeAcrossCategories = () => {
    const selected = categories.filter(c => selectedCategories.includes(c.id));
    if (selected.length === 0) return [];
    
    const perCategory = Math.floor(targetCount / selected.length);
    const remainder = targetCount % selected.length;
    
    return selected.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      quantity: perCategory + (index < remainder ? 1 : 0)
    }));
  };

  const handleCreateJob = async () => {
    if (selectedCategories.length === 0) {
      toast.error('აირჩიეთ მინიმუმ ერთი კატეგორია');
      return;
    }

    if (!jobName.trim()) {
      toast.error('შეიყვანეთ სამუშაოს სახელი');
      return;
    }

    setIsCreating(true);
    try {
      const categoriesWithQuantity = distributeAcrossCategories();
      const intervalMinutes = calculateInterval();

      const { data, error } = await supabase
        .from('generation_jobs')
        .insert({
          name: jobName,
          status: 'running',
          target_count: targetCount,
          categories: categoriesWithQuantity,
          difficulty_distribution: difficultyDistribution,
          batch_size: batchSize,
          interval_minutes: intervalMinutes,
          auto_approve: autoApprove,
          started_at: new Date().toISOString(),
          next_run_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('გენერაციის სამუშაო შექმნილია და დაიწყო!');
      setShowCreateForm(false);
      resetForm();
      
      // Trigger first batch immediately
      await supabase.functions.invoke('run-generation-job');
      
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error('შეცდომა: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePauseResume = async (job: GenerationJob) => {
    const newStatus = job.status === 'running' ? 'paused' : 'running';
    const { error } = await supabase
      .from('generation_jobs')
      .update({ 
        status: newStatus,
        next_run_at: newStatus === 'running' ? new Date().toISOString() : null
      })
      .eq('id', job.id);

    if (error) {
      toast.error('შეცდომა სტატუსის ცვლილებისას');
    } else {
      toast.success(newStatus === 'running' ? 'გაგრძელდა' : 'შეჩერებულია');
      if (newStatus === 'running') {
        await supabase.functions.invoke('run-generation-job');
      }
    }
  };

  const handleCancel = async (jobId: string) => {
    const { error } = await supabase
      .from('generation_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) {
      toast.error('შეცდომა გაუქმებისას');
    } else {
      toast.success('სამუშაო გაუქმებულია');
      fetchJobs();
    }
  };

  const resetForm = () => {
    setJobName('');
    setTargetCount(1000);
    setHoursToComplete(12);
    setSelectedCategories([]);
    setAutoApprove(false);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.id));
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <div className="space-y-4">
      {/* Active Jobs */}
      <AnimatePresence mode="sync">
        {activeJobs.map(job => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-medium">{job.name}</span>
                    <Badge variant={job.status === 'running' ? 'default' : 'secondary'}>
                      {job.status === 'running' ? 'მიმდინარე' : 'შეჩერებული'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePauseResume(job)}
                    >
                      {job.status === 'running' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleCancel(job.id)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Progress 
                  value={(job.generated_count / job.target_count) * 100} 
                  className="h-2 mb-2"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{job.generated_count} / {job.target_count} კითხვა</span>
                  <span>{Math.round((job.generated_count / job.target_count) * 100)}%</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="w-3 h-3" />
                    {job.approved_count} დამტკიცებული
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <AlertCircle className="w-3 h-3" />
                    {job.duplicate_count} დუბლიკატი
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {job.interval_minutes} წთ ინტერვალი
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Layers className="w-3 h-3" />
                    კატეგორია {job.current_category_index + 1}/{job.categories.length}
                  </div>
                </div>

                {job.next_run_at && job.status === 'running' && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    შემდეგი ბატჩი: {new Date(job.next_run_at).toLocaleTimeString('ka-GE')}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Create New Job Button / Form */}
      {!showCreateForm ? (
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="w-full"
          variant="outline"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          ახალი ავტო-გენერაცია
        </Button>
      ) : (
        <Card className="relative z-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ავტომატური გენერაციის კონფიგურაცია
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job Name */}
            <div>
              <Label>სამუშაოს სახელი</Label>
              <Input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="მაგ: 1000 კითხვა - იანვარი"
              />
            </div>

            {/* Target Count & Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>მიზნობრივი რაოდენობა</Label>
                <Input
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  min={10}
                  max={10000}
                />
              </div>
              <div>
                <Label>საათები დასასრულებლად</Label>
                <Input
                  type="number"
                  value={hoursToComplete}
                  onChange={(e) => setHoursToComplete(Number(e.target.value))}
                  min={1}
                  max={168}
                />
              </div>
            </div>

            {/* Calculated Info */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span>ინტერვალი ბატჩებს შორის:</span>
                <span className="font-medium">{calculateInterval()} წუთი</span>
              </div>
              <div className="flex justify-between">
                <span>თითო კატეგორიაში:</span>
                <span className="font-medium">
                  ~{selectedCategories.length > 0 ? Math.round(targetCount / selectedCategories.length) : 0} კითხვა
                </span>
              </div>
            </div>

            {/* Categories Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>კატეგორიები</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={selectAllCategories}>
                    ყველა
                  </Button>
                  <Button size="sm" variant="ghost" onClick={deselectAllCategories}>
                    გასუფთავება
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(category => (
                    <div 
                      key={category.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <Checkbox 
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <span className="text-sm truncate">{category.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                არჩეული: {selectedCategories.length} კატეგორია
              </p>
            </div>

            {/* Difficulty Distribution */}
            <div>
              <Label className="mb-2 block">სირთულის განაწილება</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm w-20 text-green-500">მარტივი</span>
                  <Slider
                    value={[difficultyDistribution.easy]}
                    onValueChange={([v]) => setDifficultyDistribution(prev => ({ ...prev, easy: v }))}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-10">{difficultyDistribution.easy}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm w-20 text-yellow-500">საშუალო</span>
                  <Slider
                    value={[difficultyDistribution.medium]}
                    onValueChange={([v]) => setDifficultyDistribution(prev => ({ ...prev, medium: v }))}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-10">{difficultyDistribution.medium}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm w-20 text-red-500">რთული</span>
                  <Slider
                    value={[difficultyDistribution.hard]}
                    onValueChange={([v]) => setDifficultyDistribution(prev => ({ ...prev, hard: v }))}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-10">{difficultyDistribution.hard}%</span>
                </div>
              </div>
            </div>

            {/* Auto Approve */}
            <div className="flex items-center justify-between">
              <div>
                <Label>ავტო-დამტკიცება</Label>
                <p className="text-xs text-muted-foreground">ვალიდური კითხვები ავტომატურად დამტკიცდება</p>
              </div>
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings2 className="w-4 h-4 mr-2" />
                  დამატებითი პარამეტრები
                  {showAdvanced ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <div>
                  <Label>ბატჩის ზომა</Label>
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    min={1}
                    max={20}
                  />
                  <p className="text-xs text-muted-foreground mt-1">კითხვების რაოდენობა ერთ ბატჩში</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-border/50 sticky bottom-0 bg-card z-50">
              <Button 
                type="button"
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Cancel clicked');
                  setShowCreateForm(false);
                }}
                className="flex-1"
              >
                გაუქმება
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Start clicked');
                  handleCreateJob();
                }}
                disabled={isCreating || selectedCategories.length === 0}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    იქმნება...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    დაწყება
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

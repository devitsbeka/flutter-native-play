import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Play,
  Pause,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Zap,
  Pencil,
  Save,
  Settings2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { AdminCategory } from "@/hooks/useAdminCategories";
import { cn } from "@/lib/utils";

interface GeneratedQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  category_id: string;
  category_name: string;
  status: "pending" | "approved" | "dismissed";
}

interface CategorySelection {
  category: AdminCategory;
  selected: boolean;
  quantity: number;
}

interface ProcessingStep {
  id: string;
  text: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
}

interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

interface AiMagicRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AdminCategory[];
}

const CHUNK_SIZE = 10; // Questions per API call
const DELAY_BETWEEN_CHUNKS = 500; // ms between API calls to avoid rate limits

// Normalize text for comparison
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Calculate similarity between two strings (Jaccard similarity)
const calculateSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(normalizeText(str1).split(" "));
  const set2 = new Set(normalizeText(str2).split(" "));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

export function AiMagicRefillModal({ isOpen, onClose, categories }: AiMagicRefillModalProps) {
  const [categorySelections, setCategorySelections] = useState<CategorySelection[]>(() =>
    categories.map((cat) => ({ category: cat, selected: false, quantity: 10 }))
  );
  const [globalQuantity, setGlobalQuantity] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, approved: 0, dismissed: 0, pending: 0, duplicates: 0 });
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution>({
    easy: 33,
    medium: 34,
    hard: 33,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: string;
  } | null>(null);
  const abortRef = useRef(false);
  const existingQuestionsRef = useRef<Map<string, string[]>>(new Map());
  const generatedTextsRef = useRef<Set<string>>(new Set());

  // Update selections when categories change
  useState(() => {
    setCategorySelections(categories.map((cat) => ({ category: cat, selected: false, quantity: globalQuantity })));
  });

  const selectedCount = categorySelections.filter((c) => c.selected).length;
  const totalQuestionsToGenerate = categorySelections
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + c.quantity, 0);

  const toggleCategory = (categoryId: string) => {
    setCategorySelections((prev) =>
      prev.map((c) => (c.category.id === categoryId ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = categorySelections.every((c) => c.selected);
    setCategorySelections((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
  };

  const updateQuantity = (categoryId: string, quantity: number) => {
    setCategorySelections((prev) =>
      prev.map((c) => (c.category.id === categoryId ? { ...c, quantity: Math.max(1, Math.min(500, quantity)) } : c))
    );
  };

  const applyGlobalQuantity = () => {
    setCategorySelections((prev) => prev.map((c) => (c.selected ? { ...c, quantity: globalQuantity } : c)));
  };

  const addStep = (text: string, status: ProcessingStep["status"] = "pending", detail?: string): string => {
    const id = crypto.randomUUID();
    setSteps((prev) => [...prev, { id, text, status, detail }]);
    return id;
  };

  const updateStep = (id: string, updates: Partial<ProcessingStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Check if a question is a duplicate
  const isDuplicate = (questionText: string, categoryId: string): boolean => {
    const normalized = normalizeText(questionText);
    
    // Check if exact duplicate in generated texts
    if (generatedTextsRef.current.has(normalized)) {
      return true;
    }
    
    // Check against existing questions in this category
    const existingQuestions = existingQuestionsRef.current.get(categoryId) || [];
    for (const existing of existingQuestions) {
      if (calculateSimilarity(questionText, existing) > 0.85) {
        return true;
      }
    }
    
    return false;
  };

  // Fetch existing questions for selected categories
  const fetchExistingQuestions = async (categoryIds: string[]): Promise<void> => {
    existingQuestionsRef.current.clear();
    
    for (const categoryId of categoryIds) {
      const { data } = await supabase
        .from("questions")
        .select("question_text")
        .eq("category_id", categoryId);
      
      if (data) {
        existingQuestionsRef.current.set(
          categoryId,
          data.map((q) => q.question_text)
        );
      }
    }
  };

  // Calculate how many questions of each difficulty to generate based on distribution
  const getDifficultyForQuestion = (index: number, total: number): string => {
    const easyCount = Math.round((difficultyDistribution.easy / 100) * total);
    const mediumCount = Math.round((difficultyDistribution.medium / 100) * total);
    
    if (index < easyCount) return "easy";
    if (index < easyCount + mediumCount) return "medium";
    return "hard";
  };

  const generateQuestionsForCategory = async (
    category: AdminCategory,
    quantity: number,
    onProgress: (generated: number, duplicates: number) => void
  ): Promise<{ questions: GeneratedQuestion[]; duplicateCount: number }> => {
    const questions: GeneratedQuestion[] = [];
    let duplicateCount = 0;
    const chunks = Math.ceil(quantity / CHUNK_SIZE);
    let questionIndex = 0;

    for (let i = 0; i < chunks; i++) {
      if (abortRef.current || isPaused) break;

      const chunkSize = Math.min(CHUNK_SIZE, quantity - i * CHUNK_SIZE);
      const targetDifficulty = getDifficultyForQuestion(questionIndex, quantity);

      try {
        const { data, error } = await supabase.functions.invoke("generate-category-trivia", {
          body: {
            category: category.name,
            categoryId: category.id,
            level: Math.floor(Math.random() * 20) + 1,
            count: chunkSize,
            difficulty: targetDifficulty,
          },
        });

        if (error) throw error;

        for (const q of data.questions || []) {
          const questionText = q.question || q.question_text;
          
          // Check for duplicates
          if (isDuplicate(questionText, category.id)) {
            duplicateCount++;
            continue;
          }
          
          // Mark as seen
          generatedTextsRef.current.add(normalizeText(questionText));
          
          // Assign difficulty based on distribution
          const assignedDifficulty = getDifficultyForQuestion(questionIndex, quantity);
          questionIndex++;
          
          questions.push({
            id: crypto.randomUUID(),
            question_text: questionText,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers || [],
            difficulty: q.difficulty || assignedDifficulty,
            category_id: category.id,
            category_name: category.name,
            status: "pending" as const,
          });
        }

        onProgress(questions.length, duplicateCount);

        // Add delay between chunks to avoid rate limiting
        if (i < chunks - 1) {
          await delay(DELAY_BETWEEN_CHUNKS);
        }
      } catch (err) {
        console.error(`Error generating chunk ${i + 1} for ${category.name}:`, err);
        // Continue with next chunk even if this one fails
      }
    }

    return { questions, duplicateCount };
  };

  const runGeneration = async () => {
    setIsRunning(true);
    setIsPaused(false);
    abortRef.current = false;
    setSteps([]);
    setGeneratedQuestions([]);
    setStats({ total: 0, approved: 0, dismissed: 0, pending: 0, duplicates: 0 });
    generatedTextsRef.current.clear();

    const selectedCategories = categorySelections.filter((c) => c.selected);

    // Step 1: Initialize
    const initStepId = addStep("🔄 იწყება გენერაცია...", "running");
    await delay(300);
    updateStep(initStepId, { status: "done", text: "✅ გენერაცია დაიწყო" });

    // Step 2: Fetch existing questions for duplicate detection
    const fetchStepId = addStep("📥 იტვირთება არსებული კითხვები დუბლიკატების შესამოწმებლად...", "running");
    await fetchExistingQuestions(selectedCategories.map((c) => c.category.id));
    const totalExisting = Array.from(existingQuestionsRef.current.values()).reduce((sum, arr) => sum + arr.length, 0);
    updateStep(fetchStepId, { status: "done", text: `✅ ჩაიტვირთა ${totalExisting} არსებული კითხვა` });

    // Step 3: Calculate totals
    const calcStepId = addStep(
      `📊 გაანგარიშება: ${selectedCategories.length} კატეგორია, ${totalQuestionsToGenerate} კითხვა`,
      "running"
    );
    await delay(200);
    updateStep(calcStepId, { status: "done" });

    let totalGenerated = 0;
    let totalDuplicates = 0;

    for (let i = 0; i < selectedCategories.length; i++) {
      if (abortRef.current) break;

      const { category, quantity } = selectedCategories[i];
      const categoryStepId = addStep(
        `🎯 ${category.icon} ${category.name}: 0/${quantity} კითხვა (0 დუბლიკატი)`,
        "running"
      );

      const { questions, duplicateCount } = await generateQuestionsForCategory(
        category,
        quantity,
        (generated, dups) => {
          updateStep(categoryStepId, {
            text: `🎯 ${category.icon} ${category.name}: ${generated}/${quantity} კითხვა (${dups} დუბლიკატი)`,
          });
        }
      );

      // Add questions to state as they're generated
      setGeneratedQuestions((prev) => [...prev, ...questions]);
      totalGenerated += questions.length;
      totalDuplicates += duplicateCount;

      updateStep(categoryStepId, {
        status: questions.length > 0 ? "done" : "error",
        text: `${questions.length > 0 ? "✅" : "❌"} ${category.icon} ${category.name}: ${questions.length} უნიკალური (${duplicateCount} დუბლიკატი გამოტოვებულია)`,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        total: prev.total + questions.length,
        pending: prev.pending + questions.length,
        duplicates: prev.duplicates + duplicateCount,
      }));
    }

    // Final step
    addStep(
      `🎉 დასრულდა! ${totalGenerated} უნიკალური კითხვა, ${totalDuplicates} დუბლიკატი გამოტოვდა`,
      "done"
    );

    setIsRunning(false);
  };

  const stopGeneration = () => {
    abortRef.current = true;
    setIsRunning(false);
    addStep("⏹️ გენერაცია შეჩერებულია", "done");
  };

  const approveQuestion = async (question: GeneratedQuestion) => {
    try {
      const { error } = await supabase.from("questions").insert({
        category_id: question.category_id,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        difficulty: question.difficulty,
        is_active: true,
        level_number: Math.floor(Math.random() * 20) + 1,
      });

      if (error) throw error;

      setGeneratedQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? { ...q, status: "approved" } : q))
      );
      setStats((prev) => ({
        ...prev,
        approved: prev.approved + 1,
        pending: prev.pending - 1,
      }));
    } catch (err) {
      console.error("Error approving question:", err);
    }
  };

  const dismissQuestion = (questionId: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "dismissed" } : q))
    );
    setStats((prev) => ({
      ...prev,
      dismissed: prev.dismissed + 1,
      pending: prev.pending - 1,
    }));
  };

  const approveAllPending = async () => {
    const pendingQuestions = generatedQuestions.filter((q) => q.status === "pending");
    for (const question of pendingQuestions) {
      await approveQuestion(question);
    }
  };

  const startEditing = (question: GeneratedQuestion) => {
    setEditingQuestionId(question.id);
    setEditForm({
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: [...question.incorrect_answers],
      difficulty: question.difficulty,
    });
  };

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!editingQuestionId || !editForm) return;
    
    setGeneratedQuestions((prev) =>
      prev.map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              question_text: editForm.question_text,
              correct_answer: editForm.correct_answer,
              incorrect_answers: editForm.incorrect_answers,
              difficulty: editForm.difficulty,
            }
          : q
      )
    );
    setEditingQuestionId(null);
    setEditForm(null);
  };

  const updateIncorrectAnswer = (index: number, value: string) => {
    if (!editForm) return;
    const newAnswers = [...editForm.incorrect_answers];
    newAnswers[index] = value;
    setEditForm({ ...editForm, incorrect_answers: newAnswers });
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const updateDifficultySlider = (values: number[]) => {
    const easy = values[0];
    const medium = values[1] - values[0];
    const hard = 100 - values[1];
    setDifficultyDistribution({ easy, medium, hard });
  };

  // Group questions by category
  const questionsByCategory = generatedQuestions.reduce((acc, q) => {
    if (!acc[q.category_id]) {
      acc[q.category_id] = [];
    }
    acc[q.category_id].push(q);
    return acc;
  }, {} as Record<string, GeneratedQuestion[]>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            AI Magic Refill
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Category Selection */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {categorySelections.every((c) => c.selected) ? "მოხსნა ყველა" : "არჩევა ყველა"}
                </Button>
                <Badge variant="secondary">{selectedCount} არჩეული</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={globalQuantity}
                  onChange={(e) => setGlobalQuantity(parseInt(e.target.value) || 10)}
                  className="w-24 h-8"
                />
                <Button variant="outline" size="sm" onClick={applyGlobalQuantity}>
                  გამოყენება ყველაზე
                </Button>
              </div>

              {/* Difficulty Distribution Settings */}
              <Collapsible open={showSettings} onOpenChange={setShowSettings}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      სირთულის განაწილება
                    </span>
                    {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-500">მარტივი: {difficultyDistribution.easy}%</span>
                    <span className="text-amber-500">საშუალო: {difficultyDistribution.medium}%</span>
                    <span className="text-red-500">რთული: {difficultyDistribution.hard}%</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${difficultyDistribution.easy}%` }} 
                      />
                      <div 
                        className="bg-amber-500 h-full" 
                        style={{ width: `${difficultyDistribution.medium}%` }} 
                      />
                      <div 
                        className="bg-red-500 h-full" 
                        style={{ width: `${difficultyDistribution.hard}%` }} 
                      />
                    </div>
                  </div>
                  <Slider
                    value={[difficultyDistribution.easy, difficultyDistribution.easy + difficultyDistribution.medium]}
                    onValueChange={updateDifficultySlider}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => setDifficultyDistribution({ easy: 33, medium: 34, hard: 33 })}
                    >
                      თანაბარი
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => setDifficultyDistribution({ easy: 50, medium: 30, hard: 20 })}
                    >
                      მარტივი+
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={() => setDifficultyDistribution({ easy: 20, medium: 30, hard: 50 })}
                    >
                      რთული+
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {categorySelections.map(({ category, selected, quantity }) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      selected ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleCategory(category.id)} />
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br",
                        category.color
                      )}
                    >
                      {category.icon}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{category.name}</span>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => updateQuantity(category.id, parseInt(e.target.value) || 10)}
                      className="w-16 h-7 text-xs"
                      disabled={!selected}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t space-y-2">
              <div className="text-xs text-muted-foreground text-center">
                სულ დასაგენერირებელი: <strong>{totalQuestionsToGenerate}</strong> კითხვა
              </div>
              {!isRunning ? (
                <Button
                  className="w-full"
                  onClick={runGeneration}
                  disabled={selectedCount === 0}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  გაშვება
                </Button>
              ) : (
                <Button variant="destructive" className="w-full" onClick={stopGeneration}>
                  <Pause className="h-4 w-4 mr-2" />
                  გაჩერება
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Status & Results */}
          <div className="w-1/2 flex flex-col">
            {/* Stats Bar */}
            <div className="p-3 border-b bg-muted/30">
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div>
                  <div className="font-bold text-lg">{stats.total}</div>
                  <div className="text-muted-foreground">სულ</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-amber-500">{stats.pending}</div>
                  <div className="text-muted-foreground">მოლოდინში</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-emerald-500">{stats.approved}</div>
                  <div className="text-muted-foreground">დამატებული</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-red-500">{stats.dismissed}</div>
                  <div className="text-muted-foreground">უარყოფილი</div>
                </div>
                <div>
                  <div className="font-bold text-lg text-orange-500">{stats.duplicates}</div>
                  <div className="text-muted-foreground">დუბლიკატი</div>
                </div>
              </div>
            </div>

            {/* CoT Steps */}
            {steps.length > 0 && (
              <div className="p-3 border-b max-h-48 overflow-y-auto bg-muted/10">
                <div className="space-y-1.5">
                  {steps.map((step) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex items-center gap-2 text-xs p-1.5 rounded",
                        step.status === "running" && "bg-blue-500/10 text-blue-600",
                        step.status === "done" && "text-muted-foreground",
                        step.status === "error" && "bg-red-500/10 text-red-600"
                      )}
                    >
                      {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>{step.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Questions */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {stats.pending > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                    onClick={approveAllPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    ყველას დამატება ({stats.pending})
                  </Button>
                )}

                {Object.entries(questionsByCategory).map(([categoryId, questions]) => {
                  const category = categories.find((c) => c.id === categoryId);
                  const isExpanded = expandedCategories.has(categoryId);
                  const pendingCount = questions.filter((q) => q.status === "pending").length;
                  const approvedCount = questions.filter((q) => q.status === "approved").length;

                  return (
                    <div key={categoryId} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategoryExpand(categoryId)}
                        className="w-full flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">{category?.icon}</span>
                        <span className="flex-1 text-sm font-medium text-left">
                          {category?.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {questions.length}
                        </Badge>
                        {pendingCount > 0 && (
                          <Badge className="bg-amber-500 text-xs">{pendingCount}</Badge>
                        )}
                        {approvedCount > 0 && (
                          <Badge className="bg-emerald-500 text-xs">{approvedCount}</Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
                              {questions.map((q) => (
                                <div
                                  key={q.id}
                                  className={cn(
                                    "p-2 rounded text-xs border",
                                    q.status === "approved" && "bg-emerald-500/10 border-emerald-500/30",
                                    q.status === "dismissed" && "bg-red-500/10 border-red-500/30 opacity-50",
                                    q.status === "pending" && "bg-card"
                                  )}
                                >
                                  {editingQuestionId === q.id && editForm ? (
                                    // Edit Mode
                                    <div className="space-y-2">
                                      <Input
                                        value={editForm.question_text}
                                        onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                                        placeholder="კითხვა"
                                        className="h-7 text-xs"
                                      />
                                      <div className="flex gap-1 items-center">
                                        <span className="text-emerald-600 text-xs">✓</span>
                                        <Input
                                          value={editForm.correct_answer}
                                          onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                          placeholder="სწორი პასუხი"
                                          className="h-7 text-xs flex-1"
                                        />
                                      </div>
                                      {editForm.incorrect_answers.map((ans, idx) => (
                                        <div key={idx} className="flex gap-1 items-center">
                                          <span className="text-red-500 text-xs">✗</span>
                                          <Input
                                            value={ans}
                                            onChange={(e) => updateIncorrectAnswer(idx, e.target.value)}
                                            placeholder={`არასწორი ${idx + 1}`}
                                            className="h-7 text-xs flex-1"
                                          />
                                        </div>
                                      ))}
                                      <div className="flex gap-1 items-center">
                                        <span className="text-xs text-muted-foreground">სირთულე:</span>
                                        <select
                                          value={editForm.difficulty}
                                          onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                                          className="h-7 text-xs rounded border px-2 bg-background"
                                        >
                                          <option value="easy">მარტივი</option>
                                          <option value="medium">საშუალო</option>
                                          <option value="hard">რთული</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-1 mt-2">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-6 text-xs"
                                          onClick={saveEditing}
                                        >
                                          <Save className="h-3 w-3 mr-1" />
                                          შენახვა
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-xs"
                                          onClick={cancelEditing}
                                        >
                                          გაუქმება
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View Mode
                                    <>
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium mb-1 flex-1">{q.question_text}</p>
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-[10px] shrink-0",
                                            q.difficulty === "easy" && "bg-emerald-500/20 text-emerald-600",
                                            q.difficulty === "medium" && "bg-amber-500/20 text-amber-600",
                                            q.difficulty === "hard" && "bg-red-500/20 text-red-600"
                                          )}
                                        >
                                          {q.difficulty === "easy" ? "მარტივი" : q.difficulty === "medium" ? "საშუალო" : "რთული"}
                                        </Badge>
                                      </div>
                                      <p className="text-emerald-600">✓ {q.correct_answer}</p>
                                      <div className="text-muted-foreground mt-1">
                                        {q.incorrect_answers.map((ans, idx) => (
                                          <span key={idx}>✗ {ans}{idx < q.incorrect_answers.length - 1 ? " | " : ""}</span>
                                        ))}
                                      </div>
                                      {q.status === "pending" && (
                                        <div className="flex gap-1 mt-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-xs"
                                            onClick={() => startEditing(q)}
                                          >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            რედაქტირება
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-xs"
                                            onClick={() => approveQuestion(q)}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            დამატება
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-xs text-red-500"
                                            onClick={() => dismissQuestion(q.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {generatedQuestions.length === 0 && !isRunning && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">აირჩიეთ კატეგორიები და დააჭირეთ "გაშვება"</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

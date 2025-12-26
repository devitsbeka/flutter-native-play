import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Play,
  Square,
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
  Rocket,
  Target,
  Copy,
  CheckCheck,
  Ban,
  Wand2,
  Brain,
  Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AdminCategory } from "@/hooks/useAdminCategories";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { QuestionPreviewMockup } from "./QuestionPreviewMockup";

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

const CHUNK_SIZE = 10;
const DELAY_BETWEEN_CHUNKS = 500;

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(normalizeText(str1).split(" "));
  const set2 = new Set(normalizeText(str2).split(" "));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

export function AiMagicRefillModal({ isOpen, onClose, categories }: AiMagicRefillModalProps) {
  const [categorySelections, setCategorySelections] = useState<CategorySelection[]>([]);
  const [globalQuantity, setGlobalQuantity] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, approved: 0, dismissed: 0, pending: 0, duplicates: 0 });
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution>({
    easy: 33,
    medium: 34,
    hard: 33,
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: string;
  } | null>(null);
  const [currentBatch, setCurrentBatch] = useState({ current: 0, total: 0 });
  const [previewQuestion, setPreviewQuestion] = useState<GeneratedQuestion | null>(null);
  const abortRef = useRef(false);
  const existingQuestionsRef = useRef<Map<string, string[]>>(new Map());
  const generatedTextsRef = useRef<Set<string>>(new Set());

  // Fix: Properly initialize categorySelections when categories change
  useEffect(() => {
    if (categories.length > 0) {
      setCategorySelections(categories.map((cat) => ({ 
        category: cat, 
        selected: false, 
        quantity: globalQuantity 
      })));
    }
  }, [categories]);

  const selectedCount = categorySelections.filter((c) => c.selected).length;
  const totalQuestionsToGenerate = categorySelections
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + c.quantity, 0);

  const filteredSelections = categorySelections.filter((c) =>
    c.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (categoryId: string) => {
    setCategorySelections((prev) =>
      prev.map((c) => (c.category.id === categoryId ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = filteredSelections.every((c) => c.selected);
    const filteredIds = new Set(filteredSelections.map((c) => c.category.id));
    setCategorySelections((prev) =>
      prev.map((c) => (filteredIds.has(c.category.id) ? { ...c, selected: !allSelected } : c))
    );
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

  const isDuplicate = (questionText: string, categoryId: string): boolean => {
    const normalized = normalizeText(questionText);
    if (generatedTextsRef.current.has(normalized)) return true;
    
    const existingQuestions = existingQuestionsRef.current.get(categoryId) || [];
    for (const existing of existingQuestions) {
      if (calculateSimilarity(questionText, existing) > 0.85) return true;
    }
    return false;
  };

  const fetchExistingQuestions = async (categoryIds: string[]): Promise<void> => {
    existingQuestionsRef.current.clear();
    for (const categoryId of categoryIds) {
      const { data } = await supabase
        .from("questions")
        .select("question_text")
        .eq("category_id", categoryId);
      if (data) {
        existingQuestionsRef.current.set(categoryId, data.map((q) => q.question_text));
      }
    }
  };

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
      if (abortRef.current) break;
      setCurrentBatch((prev) => ({ ...prev, current: prev.current + 1 }));

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
          if (isDuplicate(questionText, category.id)) {
            duplicateCount++;
            continue;
          }
          generatedTextsRef.current.add(normalizeText(questionText));
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
            status: "pending",
          });
        }

        onProgress(questions.length, duplicateCount);
        if (i < chunks - 1) await delay(DELAY_BETWEEN_CHUNKS);
      } catch (err) {
        console.error(`Error generating chunk ${i + 1} for ${category.name}:`, err);
      }
    }
    return { questions, duplicateCount };
  };

  const runGeneration = async () => {
    setIsRunning(true);
    abortRef.current = false;
    setSteps([]);
    setGeneratedQuestions([]);
    setStats({ total: 0, approved: 0, dismissed: 0, pending: 0, duplicates: 0 });
    generatedTextsRef.current.clear();

    const selectedCategories = categorySelections.filter((c) => c.selected);
    const totalBatches = selectedCategories.reduce(
      (sum, c) => sum + Math.ceil(c.quantity / CHUNK_SIZE),
      0
    );
    setCurrentBatch({ current: 0, total: totalBatches });

    const initStepId = addStep("Initializing AI generation...", "running");
    await delay(300);
    updateStep(initStepId, { status: "done", text: "✓ Generation started" });

    const fetchStepId = addStep("Loading existing questions for duplicate detection...", "running");
    await fetchExistingQuestions(selectedCategories.map((c) => c.category.id));
    const totalExisting = Array.from(existingQuestionsRef.current.values()).reduce((sum, arr) => sum + arr.length, 0);
    updateStep(fetchStepId, { status: "done", text: `✓ Loaded ${totalExisting} existing questions` });

    let totalGenerated = 0;
    let totalDuplicates = 0;

    for (let i = 0; i < selectedCategories.length; i++) {
      if (abortRef.current) break;

      const { category, quantity } = selectedCategories[i];
      const categoryStepId = addStep(
        `${category.icon} ${category.name}: Generating 0/${quantity}...`,
        "running"
      );

      const { questions, duplicateCount } = await generateQuestionsForCategory(
        category,
        quantity,
        (generated, dups) => {
          updateStep(categoryStepId, {
            text: `${category.icon} ${category.name}: ${generated}/${quantity} (${dups} duplicates skipped)`,
          });
        }
      );

      setGeneratedQuestions((prev) => [...prev, ...questions]);
      totalGenerated += questions.length;
      totalDuplicates += duplicateCount;

      updateStep(categoryStepId, {
        status: questions.length > 0 ? "done" : "error",
        text: `${questions.length > 0 ? "✓" : "✗"} ${category.icon} ${category.name}: ${questions.length} unique (${duplicateCount} duplicates skipped)`,
      });

      setStats((prev) => ({
        ...prev,
        total: prev.total + questions.length,
        pending: prev.pending + questions.length,
        duplicates: prev.duplicates + duplicateCount,
      }));
    }

    addStep(
      abortRef.current 
        ? `⏹ Stopped. Generated ${totalGenerated} questions.`
        : `🎉 Complete! ${totalGenerated} unique questions, ${totalDuplicates} duplicates skipped`,
      "done"
    );
    setIsRunning(false);
  };

  const stopGeneration = () => {
    abortRef.current = true;
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
      setStats((prev) => ({ ...prev, approved: prev.approved + 1, pending: prev.pending - 1 }));
    } catch (err) {
      console.error("Error approving question:", err);
    }
  };

  const dismissQuestion = (questionId: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "dismissed" } : q))
    );
    setStats((prev) => ({ ...prev, dismissed: prev.dismissed + 1, pending: prev.pending - 1 }));
  };

  const approveAllPending = async () => {
    const pendingQuestions = generatedQuestions.filter((q) => q.status === "pending");
    for (const question of pendingQuestions) {
      await approveQuestion(question);
    }
  };

  const dismissAllPending = () => {
    const pendingQuestions = generatedQuestions.filter((q) => q.status === "pending");
    pendingQuestions.forEach((q) => dismissQuestion(q.id));
  };

  // Category-level approve/dismiss
  const approveCategoryPending = async (categoryId: string) => {
    const pendingQuestions = generatedQuestions.filter(
      (q) => q.category_id === categoryId && q.status === "pending"
    );
    for (const question of pendingQuestions) {
      await approveQuestion(question);
    }
  };

  const dismissCategoryPending = (categoryId: string) => {
    const pendingQuestions = generatedQuestions.filter(
      (q) => q.category_id === categoryId && q.status === "pending"
    );
    pendingQuestions.forEach((q) => dismissQuestion(q.id));
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
          ? { ...q, ...editForm }
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
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const questionsByCategory = generatedQuestions.reduce((acc, q) => {
    if (!acc[q.category_id]) acc[q.category_id] = [];
    acc[q.category_id].push(q);
    return acc;
  }, {} as Record<string, GeneratedQuestion[]>);

  const progressPercent = currentBatch.total > 0 ? (currentBatch.current / currentBatch.total) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 border-b bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Wand2 className="h-7 w-7 text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="h-3 w-3 text-white" />
              </motion.div>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                AI Magic Refill
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate unique trivia questions with AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left Panel - Category Selection */}
          <div className="w-[400px] border-r flex flex-col bg-muted/20">
            {/* Search & Global Controls */}
            <div className="p-4 space-y-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={filteredSelections.every((c) => c.selected) ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSelectAll}
                  className="flex-1"
                >
                  {filteredSelections.every((c) => c.selected) ? (
                    <>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <Badge variant="secondary" className="h-8 px-3">
                  {selectedCount} selected
                </Badge>
              </div>

              {/* Global Quantity */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-background border">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Qty:</span>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={globalQuantity}
                    onChange={(e) => setGlobalQuantity(parseInt(e.target.value) || 10)}
                    className="h-7 border-0 bg-transparent p-0 text-center font-medium"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={applyGlobalQuantity}>
                  Apply to selected
                </Button>
              </div>

              {/* Difficulty Distribution */}
              <div className="p-3 rounded-lg bg-background border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Difficulty Distribution</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-emerald-500 rounded-l-full"
                    style={{ width: `${difficultyDistribution.easy}%` }}
                  />
                  <motion.div
                    className="bg-amber-500"
                    style={{ width: `${difficultyDistribution.medium}%` }}
                  />
                  <motion.div
                    className="bg-red-500 rounded-r-full"
                    style={{ width: `${difficultyDistribution.hard}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="text-emerald-600">Easy {difficultyDistribution.easy}%</span>
                  <span className="text-amber-600">Medium {difficultyDistribution.medium}%</span>
                  <span className="text-red-600">Hard {difficultyDistribution.hard}%</span>
                </div>
                <div className="flex gap-1 pt-1">
                  {[
                    { label: "Balanced", easy: 33, medium: 34, hard: 33 },
                    { label: "Easy+", easy: 50, medium: 30, hard: 20 },
                    { label: "Hard+", easy: 20, medium: 30, hard: 50 },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex-1 h-7 text-xs",
                        difficultyDistribution.easy === preset.easy &&
                          difficultyDistribution.medium === preset.medium &&
                          "bg-muted"
                      )}
                      onClick={() =>
                        setDifficultyDistribution({
                          easy: preset.easy,
                          medium: preset.medium,
                          hard: preset.hard,
                        })
                      }
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredSelections.map(({ category, selected, quantity }) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                      selected
                        ? "bg-gradient-to-r from-violet-500/10 to-purple-500/10 ring-1 ring-purple-500/30"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleCategory(category.id)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-500"
                    />
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-105",
                        selected ? "shadow-purple-500/20" : ""
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${category.color || "#8b5cf6"}, ${category.color || "#a855f7"})`,
                      }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {existingQuestionsRef.current.get(category.id)?.length || 0} existing
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateQuantity(category.id, parseInt(e.target.value) || 10);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "w-16 h-8 text-center text-sm font-medium",
                        !selected && "opacity-40"
                      )}
                      disabled={!selected}
                    />
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-background/50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total to generate:</span>
                <span className="font-bold text-lg">
                  <AnimatedCounter value={totalQuestionsToGenerate} />
                </span>
              </div>

              {!isRunning ? (
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-lg shadow-purple-500/25"
                  onClick={runGeneration}
                  disabled={selectedCount === 0}
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Generate Questions
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="w-full h-12 text-base font-semibold"
                  onClick={stopGeneration}
                >
                  <Square className="h-5 w-5 mr-2" />
                  Stop Generation
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Results & Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Stats Bar */}
            <div className="p-4 border-b bg-gradient-to-r from-muted/30 to-muted/10">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Total", value: stats.total, color: "text-foreground", icon: Brain },
                  { label: "Pending", value: stats.pending, color: "text-amber-500", icon: Target },
                  { label: "Approved", value: stats.approved, color: "text-emerald-500", icon: Check },
                  { label: "Dismissed", value: stats.dismissed, color: "text-red-500", icon: Ban },
                  { label: "Duplicates", value: stats.duplicates, color: "text-orange-500", icon: Copy },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="text-center p-3 rounded-xl bg-background/80 border"
                  >
                    <div className={cn("text-2xl font-bold", stat.color)}>
                      <AnimatedCounter value={stat.value} />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <stat.icon className="h-3 w-3" />
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              {isRunning && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Batch {currentBatch.current} of {currentBatch.total}
                    </span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Processing Steps */}
            {steps.length > 0 && (
              <div className="px-4 py-3 border-b bg-muted/10 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {steps.map((step) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex items-center gap-2 text-xs py-1",
                        step.status === "running" && "text-purple-600",
                        step.status === "done" && "text-muted-foreground",
                        step.status === "error" && "text-red-500"
                      )}
                    >
                      {step.status === "running" && (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      )}
                      <span className="truncate">{step.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Questions */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Bulk Actions */}
                {stats.pending > 0 && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                      onClick={approveAllPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve All ({stats.pending})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-500 border-red-500/50 hover:bg-red-500/10"
                      onClick={dismissAllPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Dismiss All
                    </Button>
                  </div>
                )}

                {/* Floating Preview Mockup */}
                <AnimatePresence>
                  {previewQuestion && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="sticky top-0 z-10 mb-4"
                    >
                      <div className="bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 rounded-2xl p-4 border border-purple-500/20">
                        <div className="flex items-start gap-4">
                          <QuestionPreviewMockup question={previewQuestion} className="scale-75 origin-top-left -my-8 -mx-2" />
                          <div className="flex-1 min-w-0 pt-2">
                            <p className="text-xs text-muted-foreground mb-1">Preview</p>
                            <p className="font-medium text-sm truncate">{previewQuestion.question_text}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {previewQuestion.category_name}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px]",
                                  previewQuestion.difficulty === "easy" && "bg-emerald-500/20 text-emerald-600",
                                  previewQuestion.difficulty === "medium" && "bg-amber-500/20 text-amber-600",
                                  previewQuestion.difficulty === "hard" && "bg-red-500/20 text-red-600"
                                )}
                              >
                                {previewQuestion.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Questions by Category */}
                {Object.entries(questionsByCategory).map(([categoryId, questions]) => {
                  const category = categories.find((c) => c.id === categoryId);
                  const isExpanded = expandedCategories.has(categoryId);
                  const pendingCount = questions.filter((q) => q.status === "pending").length;
                  const approvedCount = questions.filter((q) => q.status === "approved").length;

                  return (
                    <div key={categoryId} className="border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 p-3 bg-muted/30">
                        <button
                          onClick={() => toggleCategoryExpand(categoryId)}
                          className="flex-1 flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <span className="text-xl">{category?.icon}</span>
                          <span className="flex-1 font-medium text-left">{category?.name}</span>
                          <Badge variant="secondary">{questions.length}</Badge>
                          {pendingCount > 0 && (
                            <Badge className="bg-amber-500">{pendingCount} pending</Badge>
                          )}
                          {approvedCount > 0 && (
                            <Badge className="bg-emerald-500">{approvedCount} approved</Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {/* Category-level bulk actions */}
                        {pendingCount > 0 && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                approveCategoryPending(categoryId);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              All
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissCategoryPending(categoryId);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                              {questions.map((q) => (
                                <div
                                  key={q.id}
                                  onMouseEnter={() => setPreviewQuestion(q)}
                                  onMouseLeave={() => setPreviewQuestion(null)}
                                  className={cn(
                                    "p-3 rounded-lg border transition-all cursor-pointer",
                                    q.status === "approved" && "bg-emerald-500/5 border-emerald-500/30",
                                    q.status === "dismissed" && "bg-red-500/5 border-red-500/30 opacity-50",
                                    q.status === "pending" && "bg-card hover:shadow-sm hover:ring-2 hover:ring-purple-500/30",
                                    previewQuestion?.id === q.id && "ring-2 ring-purple-500"
                                  )}
                                >
                                  {editingQuestionId === q.id && editForm ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={editForm.question_text}
                                        onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                                        placeholder="Question"
                                        className="text-sm"
                                      />
                                      <div className="flex gap-2 items-center">
                                        <span className="text-emerald-600 text-xs">✓</span>
                                        <Input
                                          value={editForm.correct_answer}
                                          onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                                          placeholder="Correct answer"
                                          className="text-sm"
                                        />
                                      </div>
                                      {editForm.incorrect_answers.map((ans, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                          <span className="text-red-500 text-xs">✗</span>
                                          <Input
                                            value={ans}
                                            onChange={(e) => updateIncorrectAnswer(idx, e.target.value)}
                                            placeholder={`Wrong ${idx + 1}`}
                                            className="text-sm"
                                          />
                                        </div>
                                      ))}
                                      <div className="flex gap-2 mt-2">
                                        <Button size="sm" onClick={saveEditing}>
                                          <Save className="h-3 w-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start gap-2">
                                        <p className="flex-1 text-sm font-medium">{q.question_text}</p>
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-[10px] shrink-0",
                                            q.difficulty === "easy" && "bg-emerald-500/20 text-emerald-600",
                                            q.difficulty === "medium" && "bg-amber-500/20 text-amber-600",
                                            q.difficulty === "hard" && "bg-red-500/20 text-red-600"
                                          )}
                                        >
                                          {q.difficulty}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-emerald-600 mt-1">✓ {q.correct_answer}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {q.incorrect_answers.map((ans, idx) => (
                                          <span key={idx}>
                                            ✗ {ans}{idx < q.incorrect_answers.length - 1 ? " • " : ""}
                                          </span>
                                        ))}
                                      </p>
                                      {q.status === "pending" && (
                                        <div className="flex gap-2 mt-3">
                                          <Button size="sm" variant="ghost" onClick={() => startEditing(q)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Edit
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-emerald-500 hover:bg-emerald-600"
                                            onClick={() => approveQuestion(q)}
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
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

                {/* Empty State with Preview */}
                {generatedQuestions.length === 0 && !isRunning && (
                  <div className="flex flex-col items-center py-8">
                    {/* Preview Mockup */}
                    <QuestionPreviewMockup question={null} className="mb-6 scale-90" />
                    
                    <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto text-center">
                      Select categories from the left panel and click "Generate Questions" to start
                    </p>
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

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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

interface AiMagicRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AdminCategory[];
}

const CHUNK_SIZE = 10; // Questions per API call
const DELAY_BETWEEN_CHUNKS = 500; // ms between API calls to avoid rate limits

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
  const [stats, setStats] = useState({ total: 0, approved: 0, dismissed: 0, pending: 0 });
  const abortRef = useRef(false);

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

  const generateQuestionsForCategory = async (
    category: AdminCategory,
    quantity: number,
    onProgress: (generated: number) => void
  ): Promise<GeneratedQuestion[]> => {
    const questions: GeneratedQuestion[] = [];
    const chunks = Math.ceil(quantity / CHUNK_SIZE);

    for (let i = 0; i < chunks; i++) {
      if (abortRef.current || isPaused) break;

      const chunkSize = Math.min(CHUNK_SIZE, quantity - i * CHUNK_SIZE);

      try {
        const { data, error } = await supabase.functions.invoke("generate-category-trivia", {
          body: {
            category: category.name,
            categoryId: category.id,
            level: Math.floor(Math.random() * 20) + 1,
            count: chunkSize,
          },
        });

        if (error) throw error;

        const newQuestions: GeneratedQuestion[] = (data.questions || []).map((q: any) => ({
          id: crypto.randomUUID(),
          question_text: q.question || q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers || [],
          difficulty: q.difficulty || "medium",
          category_id: category.id,
          category_name: category.name,
          status: "pending" as const,
        }));

        questions.push(...newQuestions);
        onProgress(questions.length);

        // Add delay between chunks to avoid rate limiting
        if (i < chunks - 1) {
          await delay(DELAY_BETWEEN_CHUNKS);
        }
      } catch (err) {
        console.error(`Error generating chunk ${i + 1} for ${category.name}:`, err);
        // Continue with next chunk even if this one fails
      }
    }

    return questions;
  };

  const runGeneration = async () => {
    setIsRunning(true);
    setIsPaused(false);
    abortRef.current = false;
    setSteps([]);
    setGeneratedQuestions([]);

    const selectedCategories = categorySelections.filter((c) => c.selected);

    // Step 1: Initialize
    const initStepId = addStep("🔄 იწყება გენერაცია...", "running");
    await delay(300);
    updateStep(initStepId, { status: "done", text: "✅ გენერაცია დაიწყო" });

    // Step 2: Calculate totals
    const calcStepId = addStep(
      `📊 გაანგარიშება: ${selectedCategories.length} კატეგორია, ${totalQuestionsToGenerate} კითხვა`,
      "running"
    );
    await delay(200);
    updateStep(calcStepId, { status: "done" });

    let totalGenerated = 0;

    for (let i = 0; i < selectedCategories.length; i++) {
      if (abortRef.current) break;

      const { category, quantity } = selectedCategories[i];
      const categoryStepId = addStep(
        `🎯 ${category.icon} ${category.name}: 0/${quantity} კითხვა`,
        "running"
      );

      const questions = await generateQuestionsForCategory(category, quantity, (generated) => {
        updateStep(categoryStepId, {
          text: `🎯 ${category.icon} ${category.name}: ${generated}/${quantity} კითხვა`,
        });
      });

      // Add questions to state as they're generated
      setGeneratedQuestions((prev) => [...prev, ...questions]);
      totalGenerated += questions.length;

      updateStep(categoryStepId, {
        status: questions.length > 0 ? "done" : "error",
        text: `${questions.length > 0 ? "✅" : "❌"} ${category.icon} ${category.name}: ${questions.length}/${quantity} კითხვა`,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        total: prev.total + questions.length,
        pending: prev.pending + questions.length,
      }));
    }

    // Final step
    const finalStepId = addStep(
      `🎉 დასრულდა! სულ დაგენერირდა ${totalGenerated} კითხვა`,
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
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
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
                                  <p className="font-medium mb-1">{q.question_text}</p>
                                  <p className="text-emerald-600">✓ {q.correct_answer}</p>
                                  {q.status === "pending" && (
                                    <div className="flex gap-1 mt-2">
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

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizPlayerAvatar, QuizPlayerAvatarState } from "@/components/ui/quiz-player-avatar";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizPowerUpButton, PowerUpType } from "@/components/ui/quiz-power-up-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { QuizGameScreen } from "@/components/game/QuizGameScreen";

const georgianLabels = ["ა", "ბ", "გ", "დ"];

const colorPalette = [
  { name: "Default Gradient Start", hex: "#D9D8FF" },
  { name: "Default Gradient End", hex: "#ABABE3" },
  { name: "Default Border", hex: "#7E7ADB" },
  { name: "Default Shadow", hex: "#6A69B4" },
  { name: "Selected/Next BG", hex: "#EDECFF" },
  { name: "Selected/Next Border", hex: "#B9B6FF" },
  { name: "Correct BG", hex: "#83F7DA" },
  { name: "Correct Border", hex: "#39CBA6" },
  { name: "Wrong BG", hex: "#FF7575" },
  { name: "Wrong Border", hex: "#EF4343" },
  { name: "Text Primary", hex: "#514F7F" },
  { name: "Text Secondary", hex: "#46447E" },
];

const gameColors = [
  { name: "Quiz Purple", hex: "#7E7ADB" },
  { name: "Button BG", hex: "#474DAE" },
  { name: "Border", hex: "#605CCB" },
  { name: "Shadow", hex: "#6562D2" },
  { name: "Timer", hex: "#CD5C3A" },
  { name: "Difficulty", hex: "#FF7F25" },
  { name: "Gold Score", hex: "#F2C860" },
  { name: "Active Border", hex: "#83F7DA" },
];

const Styleguide = () => {
  const navigate = useNavigate();
  const [interactiveState, setInteractiveState] = useState<QuizAnswerState>("default");
  const [demoState, setDemoState] = useState<QuizAnswerState>("default");

  // Player Avatar demo state
  const [avatarState, setAvatarState] = useState<QuizPlayerAvatarState>("default");
  const [avatarScore, setAvatarScore] = useState(230);

  // Progress Dots demo state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>([]);

  // Power-Up demo state
  const [powerUpCounts, setPowerUpCounts] = useState({
    "5050": 2,
    freeze: 1,
    replace: 3,
    hint: 4,
  });

  const cycleState = () => {
    const states: QuizAnswerState[] = ["default", "selected", "correct", "wrong", "next"];
    const currentIndex = states.indexOf(interactiveState);
    const nextIndex = (currentIndex + 1) % states.length;
    setInteractiveState(states[nextIndex]);
  };

  const handleAnswerClick = () => {
    if (demoState !== "default") return;
    setDemoState("loading");
    setTimeout(() => {
      const isCorrect = Math.random() > 0.5;
      setDemoState(isCorrect ? "correct" : "wrong");
      setTimeout(() => {
        setDemoState("default");
      }, 1500);
    }, 1000);
  };

  const handleAvatarDemo = () => {
    setAvatarState("loading");
    setTimeout(() => {
      const isCorrect = Math.random() > 0.5;
      setAvatarState(isCorrect ? "correct" : "wrong");
      if (isCorrect) setAvatarScore(prev => prev + 10);
      setTimeout(() => setAvatarState("default"), 1500);
    }, 1000);
  };

  const handleProgressDemo = () => {
    if (currentQuestion >= 6) {
      setCurrentQuestion(0);
      setResults([]);
      return;
    }
    const result = Math.random() > 0.5 ? "correct" : "wrong";
    setResults(prev => [...prev, result]);
    setCurrentQuestion(prev => prev + 1);
  };

  const handlePowerUpClick = (type: PowerUpType) => {
    if (powerUpCounts[type] > 0) {
      setPowerUpCounts(prev => ({ ...prev, [type]: prev[type] - 1 }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-3xl font-bold text-white">🎨 Styleguide</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="game-screen" className="w-full">
          <TabsList className="mb-8 bg-white/10">
            <TabsTrigger value="game-screen" className="data-[state=active]:bg-white/20 text-white">
              Game Screen
            </TabsTrigger>
            <TabsTrigger value="buttons" className="data-[state=active]:bg-white/20 text-white">
              Buttons
            </TabsTrigger>
            <TabsTrigger value="game-ui" className="data-[state=active]:bg-white/20 text-white">
              Game UI
            </TabsTrigger>
            <TabsTrigger value="colors" className="data-[state=active]:bg-white/20 text-white">
              Colors
            </TabsTrigger>
          </TabsList>

          {/* GAME SCREEN TAB */}
          <TabsContent value="game-screen" className="space-y-6">
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Complete Quiz Game Screen
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Interactive demo of the complete quiz game experience. Answer questions, use power-ups, and compete!
              </p>
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: "700px" }}>
                <QuizGameScreen onBack={() => navigate(-1)} />
              </div>
            </section>
          </TabsContent>

          {/* BUTTONS TAB */}
          <TabsContent value="buttons" className="space-y-12">
            {/* Quiz Answer Buttons Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Quiz Answer Buttons
              </h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <p className="text-white/60 text-sm mb-2">Default State (Click to test loading → result flow)</p>
                  <QuizAnswerButton
                    state={demoState}
                    label={georgianLabels[0]}
                    text={demoState === "loading" ? "" : demoState === "correct" ? "სწორია! ✓" : demoState === "wrong" ? "არასწორია ✗" : "პასუხი (Default)"}
                    onClick={handleAnswerClick}
                  />
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Selected State</p>
                  <QuizAnswerButton
                    state="selected"
                    label={georgianLabels[1]}
                    text="პასუხი (Selected)"
                  />
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Correct State</p>
                  <QuizAnswerButton
                    state="correct"
                    label={georgianLabels[2]}
                    text="პასუხი (Correct)"
                  />
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Wrong State</p>
                  <QuizAnswerButton
                    state="wrong"
                    label={georgianLabels[3]}
                    text="პასუხი (Wrong)"
                  />
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Next/Continue State</p>
                  <QuizAnswerButton
                    state="next"
                    text="შემდეგი (Next)"
                    showLabel={false}
                  />
                </div>
              </div>
            </section>

            {/* Interactive Demo */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Interactive Demo
              </h2>
              <p className="text-white/60 text-sm mb-4">Click the button to cycle through states</p>
              <div className="max-w-md">
                <QuizAnswerButton
                  state={interactiveState}
                  label="ა"
                  text={`Current: ${interactiveState}`}
                  onClick={cycleState}
                  showLabel={interactiveState !== "next"}
                />
              </div>
            </section>

            {/* Chunky Buttons Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Chunky Buttons
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
                <ChunkyButton variant="primary">Primary</ChunkyButton>
                <ChunkyButton variant="secondary">Secondary</ChunkyButton>
                <ChunkyButton variant="success">Success</ChunkyButton>
                <ChunkyButton variant="danger">Danger</ChunkyButton>
                <ChunkyButton variant="ghost">Ghost</ChunkyButton>
                <ChunkyButton variant="purple">Purple</ChunkyButton>
              </div>
            </section>

            {/* Standard Buttons Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Standard Buttons
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </section>
          </TabsContent>

          {/* GAME UI TAB */}
          <TabsContent value="game-ui" className="space-y-12">
            {/* Player Avatars */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Player Avatars
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Click the first avatar to see the interactive demo
              </p>
              <div className="flex items-start gap-8 p-8 bg-[#7E7ADB] rounded-2xl flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <QuizPlayerAvatar
                    avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=player1"
                    score={avatarScore}
                    position="left"
                    state={avatarState}
                  />
                  <button
                    onClick={handleAvatarDemo}
                    className="text-xs text-white/70 hover:text-white"
                  >
                    Click to demo
                  </button>
                </div>

                <QuizPlayerAvatar
                  avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=player2"
                  score={321}
                  position="right"
                  state="default"
                />

                <QuizPlayerAvatar
                  score={0}
                  position="left"
                  state="loading"
                />

                <QuizPlayerAvatar
                  avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=correct"
                  score={450}
                  position="left"
                  state="correct"
                />

                <QuizPlayerAvatar
                  avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=wrong"
                  score={180}
                  position="right"
                  state="wrong"
                />
              </div>
            </section>

            {/* Question Card */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Question Card
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-[#7E7ADB] rounded-2xl">
                  <QuizQuestionCard
                    imageUrl="https://images.unsplash.com/photo-1568702846914-96b305d2uj38?w=400&h=400&fit=crop"
                    questionText="Who was the last pharaoh of Egypt, known for her beauty?"
                    timeRemaining={10}
                    difficulty="medium"
                    state="default"
                  />
                </div>

                <div className="p-8 bg-[#7E7ADB] rounded-2xl">
                  <QuizQuestionCard
                    imageUrl=""
                    questionText=""
                    timeRemaining={0}
                    difficulty="easy"
                    state="loading"
                  />
                </div>
              </div>
            </section>

            {/* Progress Dots */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Progress Dots
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Click to advance through questions
              </p>
              <div className="space-y-6">
                <div 
                  className="p-6 bg-[#7E7ADB] rounded-2xl cursor-pointer"
                  onClick={handleProgressDemo}
                >
                  <QuizProgressDots
                    total={6}
                    current={currentQuestion}
                    results={results}
                  />
                  <p className="text-center text-white/70 text-sm mt-4">
                    Question {Math.min(currentQuestion + 1, 6)} of 6 • Click to {currentQuestion >= 6 ? "reset" : "advance"}
                  </p>
                </div>

                <div className="p-6 bg-[#7E7ADB] rounded-2xl">
                  <p className="text-white/70 text-sm mb-3">All correct:</p>
                  <QuizProgressDots
                    total={6}
                    current={6}
                    results={["correct", "correct", "correct", "correct", "correct", "correct"]}
                  />
                </div>

                <div className="p-6 bg-[#7E7ADB] rounded-2xl">
                  <p className="text-white/70 text-sm mb-3">Mixed results:</p>
                  <QuizProgressDots
                    total={6}
                    current={4}
                    results={["correct", "wrong", "correct", "wrong"]}
                  />
                </div>
              </div>
            </section>

            {/* Power-Up Buttons */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Power-Up Buttons
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Click power-ups to use them (count decreases)
              </p>

              <div className="space-y-6">
                {/* Individual Power-Ups */}
                <div className="p-8 bg-[#7E7ADB] rounded-2xl">
                  <p className="text-white/70 text-sm mb-4">Individual States:</p>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex flex-col items-center gap-2">
                      <QuizPowerUpButton type="5050" count={2} state="default" />
                      <span className="text-white/70 text-xs">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QuizPowerUpButton type="freeze" count={0} state="disabled" />
                      <span className="text-white/70 text-xs">Disabled</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QuizPowerUpButton type="replace" count={3} state="loading" />
                      <span className="text-white/70 text-xs">Loading</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <QuizPowerUpButton type="hint" count={5} state="active" />
                      <span className="text-white/70 text-xs">Active</span>
                    </div>
                  </div>
                </div>

                {/* Power-Up Bar */}
                <div className="p-8 bg-[#7E7ADB] rounded-2xl">
                  <p className="text-white/70 text-sm mb-4">Interactive Power-Up Bar:</p>
                  <QuizPowerUpBar
                    powerUps={[
                      { type: "5050", count: powerUpCounts["5050"] },
                      { type: "freeze", count: powerUpCounts.freeze },
                      { type: "replace", count: powerUpCounts.replace },
                      { type: "hint", count: powerUpCounts.hint },
                    ]}
                    onPowerUpClick={handlePowerUpClick}
                  />
                  <button
                    onClick={() => setPowerUpCounts({ "5050": 2, freeze: 1, replace: 3, hint: 4 })}
                    className="mt-4 text-xs text-white/70 hover:text-white mx-auto block"
                  >
                    Reset counts
                  </button>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* COLORS TAB */}
          <TabsContent value="colors" className="space-y-12">
            {/* Color Palette Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Quiz Button Colors
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {colorPalette.map((color) => (
                  <motion.div
                    key={color.hex}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-16 h-16 rounded-xl shadow-lg border border-white/10"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-white/80 text-xs font-mono">{color.hex}</span>
                    <span className="text-white/50 text-xs text-center leading-tight">
                      {color.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Game Colors Section */}
            <section>
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
                Game UI Colors
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gameColors.map((color) => (
                  <motion.div
                    key={color.hex}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-16 h-16 rounded-xl shadow-lg border border-white/10"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-white/80 text-xs font-mono">{color.hex}</span>
                    <span className="text-white/50 text-xs text-center leading-tight">
                      {color.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Styleguide;

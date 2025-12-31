import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QuizAnswerButton, QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";

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

const Styleguide = () => {
  const navigate = useNavigate();
  const [interactiveState, setInteractiveState] = useState<QuizAnswerState>("default");

  const cycleState = () => {
    const states: QuizAnswerState[] = ["default", "selected", "correct", "wrong", "next"];
    const currentIndex = states.indexOf(interactiveState);
    const nextIndex = (currentIndex + 1) % states.length;
    setInteractiveState(states[nextIndex]);
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

      <div className="max-w-2xl mx-auto space-y-12">
        {/* Quiz Answer Buttons Section */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
            Quiz Answer Buttons
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-sm mb-2">Default State</p>
              <QuizAnswerButton
                state="default"
                label={georgianLabels[0]}
                text="პასუხი (Default)"
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
          <QuizAnswerButton
            state={interactiveState}
            label="ა"
            text={`Current: ${interactiveState}`}
            onClick={cycleState}
            showLabel={interactiveState !== "next"}
          />
        </section>

        {/* Chunky Buttons Section */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
            Chunky Buttons
          </h2>
          <div className="grid grid-cols-2 gap-4">
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

        {/* Color Palette Section */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/20 pb-2">
            Color Palette
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
      </div>
    </div>
  );
};

export default Styleguide;

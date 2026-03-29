"use client";
import { useState } from "react";
import Link from "next/link";

const steps = [
  {
    id: 1,
    title: "What's your skin type?",
    subtitle: "We'll use this to tailor ingredient recommendations for you.",
    type: "single",
    options: ["Oily", "Dry", "Combination", "Sensitive", "Normal"],
  },
  {
    id: 2,
    title: "Any skin conditions?",
    subtitle: "Select all that apply. This helps us flag ingredients that may trigger flare-ups.",
    type: "multi",
    options: ["Rosacea", "Eczema", "Psoriasis", "Fungal Acne", "Hormonal Acne", "None"],
  },
  {
    id: 3,
    title: "Are you on any skincare medications?",
    subtitle: "Some medications require avoiding certain ingredients.",
    type: "single",
    options: ["Accutane (Isotretinoin)", "Tretinoin / Retinoids", "Antibiotics", "None", "Prefer not to say"],
  },
  {
    id: 4,
    title: "What are your main skin concerns?",
    subtitle: "Select all that apply.",
    type: "multi",
    options: ["Acne", "Aging / Fine lines", "Dryness", "Hyperpigmentation", "Sensitivity", "Uneven texture"],
  },
  {
    id: 5,
    title: "Any known ingredient sensitivities?",
    subtitle: "We'll flag these in every product you look up.",
    type: "multi",
    options: ["Fragrance", "Alcohol", "Essential Oils", "Sulfates", "Silicones", "None"],
  },
];

export default function Welcome() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({});

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const toggle = (option: string) => {
    const current = selections[step.id] || [];
    if (step.type === "single") {
      setSelections({ ...selections, [step.id]: [option] });
    } else {
      if (current.includes(option)) {
        setSelections({ ...selections, [step.id]: current.filter((o) => o !== option) });
      } else {
        setSelections({ ...selections, [step.id]: [...current, option] });
      }
    }
  };

  const isSelected = (option: string) => (selections[step.id] || []).includes(option);

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <p className="text-sm text-stone-400">Step {currentStep + 1} of {steps.length}</p>
      </nav>

      {/* Progress bar */}
      <div className="w-full h-1 bg-stone-200">
        <div
          className="h-1 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: "#8B4513" }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-serif font-semibold mb-2 text-center" style={{ color: "#2C2C2C" }}>
            {step.title}
          </h1>
          <p className="text-stone-500 text-center mb-8">{step.subtitle}</p>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {step.options.map((option) => (
              <button
                key={option}
                onClick={() => toggle(option)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${
                  isSelected(option)
                    ? "text-white border-transparent"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
                style={isSelected(option) ? { backgroundColor: "#8B4513", borderColor: "#8B4513" } : {}}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 py-3 rounded-full border border-stone-300 text-stone-700 font-medium text-sm hover:bg-stone-100"
              >
                Back
              </button>
            )}
            {isLastStep ? (
              <Link
                href="/log"
                className="flex-1 py-3 rounded-full text-white font-medium text-sm text-center"
                style={{ backgroundColor: "#8B4513" }}
              >
                Build My Formula →
              </Link>
            ) : (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 py-3 rounded-full text-white font-medium text-sm"
                style={{ backgroundColor: "#8B4513" }}
              >
                Continue
              </button>
            )}
          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            This is not medical advice — always consult your dermatologist.
          </p>
        </div>
      </div>
    </main>
  );
}

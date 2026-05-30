"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex items-center gap-2 px-6 pb-3 overflow-x-auto no-scrollbar shrink-0">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="whitespace-nowrap shrink-0 text-[12px] font-medium
            text-muted-foreground border border-border/50
            rounded-full px-4 py-1.5
            hover:text-foreground hover:border-border hover:bg-secondary/60
            transition-all duration-150 cursor-pointer"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

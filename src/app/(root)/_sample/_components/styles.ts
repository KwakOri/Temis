import { cva } from "class-variance-authority";

export const cardVariants = cva(
  " min-h-20 rounded-[40px] transition-all duration-200 grow-0",
  {
    variants: {
      variant: {
        default: "bg-white shadow-sm border border-gray-100",
        elevated:
          "bg-timetable-card-bg shadow-[0_2px_3.4px_rgba(0,0,0,0.08)] border border-2 border-timetable-card-border ",
        flat: "bg-gray-50",
      },
      type: {
        input: "p-5",
        button: "px-4",
        full: "p-3",
      },
    },
    defaultVariants: {
      variant: "elevated",
      type: "input",
    },
  }
);

import { cn } from "@/utils/utils";
import { cva, VariantProps } from "class-variance-authority";
import Link from "next/link";

import { PropsWithChildren } from "react";

const segmentVariant = cva("text-2xl px-8 py-3 rounded-full", {
  variants: {
    intent: {
      primary: "text-black",
      secondary: "text-white bg-[#FC712B]",
    },
  },
  defaultVariants: {
    intent: "primary",
  },
});

type SegmentVariants = VariantProps<typeof segmentVariant>;

export interface SegmentedControlItem extends SegmentVariants {
  label: string;
  type: "button" | "link";
  href?: string;
  onClick?: () => void;
}

interface SegmentedControlProps {
  items: SegmentedControlItem[];
}

const SegmentedControl = ({
  items,
}: PropsWithChildren<SegmentedControlProps>) => {
  return (
    <ul
      style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" }}
      className="h-14 flex justify-between items-center rounded-full gap-4 bg-[#F3E9E7] border-2 border-[#E2D4C4] py-1 px-2"
    >
      {items.map((item) => {
        return (
          <li key={item.label}>
            {item.type === "button" && !!item.onClick && (
              <button
                onClick={item.onClick}
                className={cn(segmentVariant({ intent: item.intent }))}
              >
                {item.label}
              </button>
            )}
            {item.type === "link" && !!item.href && (
              <Link
                href={item.href}
                className={cn(segmentVariant({ intent: item.intent }))}
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SegmentedControl;

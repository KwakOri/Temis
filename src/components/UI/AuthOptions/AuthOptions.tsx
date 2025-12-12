import { cn } from "@/utils/utils";
import { cva, VariantProps } from "class-variance-authority";
import Link from "next/link";

import { PropsWithChildren } from "react";
import { SegmentedControlItem } from "../SegmentedControl/SegmentedControl";

const segmentVariant = cva("font-semibold text-lg px-4 py-2 rounded-full", {
  variants: {
    intent: {
      primary: "text-black",
      secondary: "font-medium text-white bg-[#FC712B]",
    },
  },
  defaultVariants: {
    intent: "primary",
  },
});

type SegmentVariants = VariantProps<typeof segmentVariant>;

interface SegmentedControlProps {
  items: SegmentedControlItem[];
}

const AuthOptions = ({ items }: PropsWithChildren<SegmentedControlProps>) => {
  return (
    <ul
      style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" }}
      className="h-14 flex justify-between items-center rounded-full bg-[#F3E9E7] border-2 border-[#E2D4C4] py-1 px-2"
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

export default AuthOptions;

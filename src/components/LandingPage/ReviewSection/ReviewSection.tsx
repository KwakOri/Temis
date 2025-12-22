"use client";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { cn } from "@/utils/utils";
import { cva, VariantProps } from "class-variance-authority";
import SectionTitle from "../SectionTitle";

const CardVariant = cva(
  "rounded-[36px] p-8 transition-all duration-300 cursor-pointer border-1",
  {
    variants: {
      intent: {
        primary: "",
        secondary: "",
      },
      size: {
        lg: "h-[600px]",
        sm: "h-[300px]",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "sm",
    },
  }
);

const CardTitleVariant = cva("mb-4 text-gray-800", {
  variants: {
    size: {
      lg: " text-[30px] text-[#FB712B] font-extrabold ",
      sm: " text-[22px] text-black font-bold ",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const CardDescriptionVariant = cva("w-full text-[#554C44] leading-relaxed", {
  variants: {
    size: {
      lg: "h-[390px]",
      sm: "h-32",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

type CardVariants = VariantProps<typeof CardVariant>;

export interface Review extends CardVariants {
  title: string;
  description: string;
}

interface ReviewSectionProps {
  items: Review[];
}

const ReviewCard = ({ title, description, intent, size }: Review) => {
  return (
    <div
      className={cn(
        CardVariant({ intent, size }),
        "w-[440px] hover:scale-105 flex flex-col justify-between"
      )}
      style={{
        backgroundColor: "#ECE3E1",
        borderColor: "#BC9F98",
        filter: "drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))",
      }}
    >
      <div>
        <p
          style={{ lineHeight: 1.2 }}
          className={cn(CardTitleVariant({ size }))}
        >
          {title}
        </p>
        <div className={cn(CardDescriptionVariant({ size }))}>
          <AutoResizeText multiline>{description}</AutoResizeText>
        </div>
      </div>
    </div>
  );
};

const ReviewSection = ({ items }: ReviewSectionProps) => {
  // 2개씩 묶어서 3열로 표시
  const columnCount = 3;
  const itemsPerColumn = 2;

  // items를 열 단위로 그룹화
  const columns: Review[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push(items.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
  }

  return (
    <section className="pt-20 pb-8">
      <div className="mx-auto">
        <SectionTitle label="REVIEWS" />

        {/* Vertical Column Layout */}
        <div className="flex flex-wrap gap-6 justify-center mt-12">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-6">
              {column.map((item, itemIndex) => (
                <ReviewCard key={`${colIndex}-${itemIndex}`} {...item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;

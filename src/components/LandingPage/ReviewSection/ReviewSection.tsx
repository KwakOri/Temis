"use client";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { cn } from "@/utils/utils";
import { cva, VariantProps } from "class-variance-authority";
import SectionTitle from "../SectionTitle";

const CardVariant = cva(
  "rounded-2xl md:rounded-[36px] p-6 md:p-8 transition-all duration-300 cursor-pointer border-1",
  {
    variants: {
      intent: {
        primary: "",
        secondary: "",
      },
      size: {
        lg: "h-auto md:h-[600px]",
        sm: "h-auto md:h-[300px]",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "sm",
    },
  }
);

const CardTitleVariant = cva("mb-3 md:mb-4 text-gray-800", {
  variants: {
    size: {
      lg: "text-2xl md:text-[30px] text-[#FB712B] font-extrabold",
      sm: "text-lg md:text-[22px] text-black font-bold",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const CardDescriptionVariant = cva("w-full text-[#554C44] leading-relaxed", {
  variants: {
    size: {
      lg: "h-auto md:h-[390px] min-h-[200px]",
      sm: "h-auto md:h-32 min-h-[80px]",
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
        "w-full max-w-md mx-auto hover:scale-105 flex flex-col justify-between"
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
  // 2개씩 묶어서 3열로 표시 (데스크탑)
  const columnCount = 3;
  const itemsPerColumn = 2;

  // items를 열 단위로 그룹화
  const columns: Review[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push(items.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
  }

  return (
    <section className="pt-12 md:pt-20 pb-8 px-4">
      <div className="mx-auto max-w-7xl">
        <SectionTitle label="REVIEWS" />

        {/* Vertical Column Layout - 모바일: 1열, 태블릿: 2열, 데스크탑: 3열 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
          {/* 모바일/태블릿: 단순 그리드 */}
          <div className="md:hidden lg:hidden flex flex-col gap-4">
            {items.map((item, index) => (
              <ReviewCard key={index} {...item} />
            ))}
          </div>

          {/* 데스크탑: 열 단위 그룹 (기존 로직) */}
          {columns.map((column, colIndex) => (
            <div
              key={colIndex}
              className="hidden lg:flex flex-col gap-6"
            >
              {column.map((item, itemIndex) => (
                <ReviewCard key={`${colIndex}-${itemIndex}`} {...item} />
              ))}
            </div>
          ))}

          {/* 태블릿: 2열 그리드 */}
          {items.map((item, index) => (
            <div key={`tablet-${index}`} className="hidden md:block lg:hidden">
              <ReviewCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;

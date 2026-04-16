import { cn } from "@/lib/utils";
import { SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";
import React, { useId } from "react";
import RuntimeCardTitle from "./card-title";
import { cardVariants } from "./styles";

const cardHeaderVariants = cva("w-full flex justify-between items-center", {
  variants: {
    size: {
      sm: "h-12",
      md: "h-16",
      lg: "",
    },
  },
});

interface RuntimeProfileImageSelectorProps {
  size?: SizeProps;
  imageSrc: string | null;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const RuntimeProfileImageSelector = ({
  size = "sm",
  imageSrc,
  onImageChange,
}: RuntimeProfileImageSelectorProps) => {
  const inputId = useId();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onImageChange(event);
  };

  return (
    <section
      className={cn(
        cardVariants({ variant: "elevated", type: "button", size }),
        "py-3"
      )}
    >
      <div className={cn(cardHeaderVariants({ size }), "gap-3")}>
        <RuntimeCardTitle size={size} label="이미지" />
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <label
          htmlFor={inputId}
          className="flex-1 cursor-pointer rounded-2xl bg-timetable-primary px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-timetable-primary-hover"
        >
          {imageSrc ? "이미지 변경" : "새 이미지 업로드"}
        </label>
      </div>
    </section>
  );
};

export default RuntimeProfileImageSelector;

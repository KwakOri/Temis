import { cn, SizeProps } from "@/utils/utils";
import { cva } from "class-variance-authority";
import { Fragment } from "react";
import CardTitle from "./FixedComponents/CardTitle";
import { cardVariants } from "./FixedComponents/styles";

const cardHeaderVariants = cva("w-full flex justify-between items-center", {
  variants: {
    size: {
      sm: "h-12",
      md: "h-16",
      lg: "",
    },
  },
});

const buttonWrapperVariants = cva(
  "flex-1 flex gap-2 justify-between items-center",
  {
    variants: {
      size: {
        sm: "h-7",
        md: "h-11",
        lg: "",
      },
    },
  }
);

const buttonVariants = cva(
  "flex justify-center items-center h-full text-white font-semibold transition",
  {
    variants: {
      size: {
        sm: "rounded-lg text-[14px]",
        md: " rounded-full",
        lg: "",
      },
      type: {
        circle: "shrink-0 ",
        rectangle: "w-full",
      },
      color: {
        red: "bg-red-500 hover:bg-red-600",
        orange: "bg-timetable-primary hover:bg-timetable-primary-hover",
      },
    },
    compoundVariants: [
      {
        type: "circle",
        size: "sm",
        className: "w-7 ",
      },
      {
        type: "circle",
        size: "md",
        className: "w-11",
      },
      {
        type: "rectangle",
        size: "sm",
        className: "",
      },
      {
        type: "rectangle",
        size: "md",
        className: "",
      },
    ],
    defaultVariants: {
      size: "md",
      type: "rectangle",
      color: "orange",
    },
  }
);

interface TimeTableProfileImageSelectorProps {
  size: SizeProps;
  imageSrc: string | null;
  handleEditClick: () => void;
  handleUploadClick: () => void;
  handleImageDelete: () => void;
}

const TimeTableProfileImageSelector = ({
  size,
  imageSrc,
  handleUploadClick,
  handleEditClick,
  handleImageDelete,
}: TimeTableProfileImageSelectorProps) => {
  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button", size })
      )}
    >
      <div className={cn(cardHeaderVariants({ size }), "gap-4")}>
        <CardTitle size={size} label="이미지" />
        <div className={cn(buttonWrapperVariants({ size }))}>
          <button
            onClick={handleUploadClick}
            className={cn(buttonVariants({ size }))}
          >
            {imageSrc ? "이미지 변경" : "새 이미지 업로드"}
          </button>

          {imageSrc && (
            <Fragment>
              <button
                onClick={handleEditClick}
                className={cn(buttonVariants({ size }))}
              >
                이미지 편집
              </button>
              <button
                onClick={handleImageDelete}
                className={cn(
                  buttonVariants({ size, color: "red", type: "circle" })
                )}
                title="이미지 삭제"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </Fragment>
          )}
        </div>
      </div>
      {/* 텍스트 표시 옵션 선택 */}
    </div>
  );
};

export default TimeTableProfileImageSelector;

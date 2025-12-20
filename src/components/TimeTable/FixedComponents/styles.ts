import { cva } from "class-variance-authority";

/**
 * TimeTable 전용 색상은 Tailwind 테마에서 관리됩니다.
 * @see src/app/globals.css @theme 블록
 *
 * 사용 가능한 색상:
 * - timetable-primary: #FD9319 (핀컬러 - 버튼, 토글 배경)
 * - timetable-primary-hover: #E58615 (핀컬러 호버)
 * - timetable-card-bg: #F8F3F0 (카드 배경, 토글 핸들)
 * - timetable-card-border: #EFE8E3 (카드 테두리)
 * - timetable-input-bg: #EDE5DD (인풋 배경)
 * - timetable-input-hover: #E0D8D0 (인풋 호버)
 * - timetable-form-bg: #F5F0ED (폼 배경)
 */

// 카드 스타일
export const cardVariants = cva("rounded-2xl transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-white shadow-sm border border-gray-100",
      elevated:
        "bg-timetable-card-bg shadow-[0_2px_3.4px_rgba(0,0,0,0.08)] border border-2 border-timetable-card-border",
      flat: "bg-gray-50",
    },
    size: {
      sm: "p-3",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "elevated",
    size: "md",
  },
});

// 엔트리 카드 스타일
export const entryCardVariants = cva("transition-all duration-200", {
  variants: {
    variant: {
      default: "bg-transparent",
      primary: "bg-transparent",
      secondary: "bg-transparent",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

// 토글 버튼 스타일 (배경 = 핀컬러)
export const toggleVariants = cva(
  "flex items-center rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]",
  {
    variants: {
      size: {
        sm: "w-[68px] h-[30px]",
        md: "w-[82px] h-[36px]",
        lg: "w-12 h-6",
      },
      variant: {
        default: "",
        primary: "",
        offline: "",
        guerrilla: "",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        className:
          "data-[active=true]:bg-[#FC712B] data-[active=false]:bg-gray-300",
      },
      {
        variant: "offline",
        className:
          "data-[active=true]:bg-[#FC712B] data-[active=false]:bg-gray-300",
      },
      {
        variant: "guerrilla",
        className:
          "data-[active=true]:bg-[#FC712B] data-[active=false]:bg-gray-300",
      },
    ],
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

// 토글 핸들 스타일 (카드 배경색과 동일)
export const toggleHandleVariants = cva(
  "bg-timetable-card-bg rounded-full shadow-md transform transition-transform duration-200 ease-in-out shadow-[0_4px_4px_rgba(0,0,0,0.25)] ",
  {
    variants: {
      size: {
        sm: "w-5 h-5",
        md: "w-6 h-6",
        lg: "w-7 h-7",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

// 입력 필드 공통 스타일
export const inputVariants = cva(
  "w-full rounded-xl transition-all duration-200 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-timetable-input-bg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-timetable-primary/50",
        filled:
          "bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-timetable-primary",
      },
      size: {
        sm: "p-2 text-sm",
        md: "p-3 text-base",
        lg: "p-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// 버튼 스타일
export const buttonVariants = cva(
  "rounded-xl transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ",
  {
    variants: {
      variant: {
        primary:
          "bg-timetable-primary hover:bg-timetable-primary-hover text-white focus:ring-timetable-primary/50",
        secondary:
          "bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-500",
        danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
        ghost:
          "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500",
        light:
          "bg-timetable-primary hover:bg-timetable-primary-hover text-white focus:ring-timetable-primary/50",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-3 text-base",
        lg: "px-6 py-3 text-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

// 라벨 스타일
export const labelVariants = cva("font-medium", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-base",
    },
    variant: {
      default: "text-gray-600",
      muted: "text-gray-500",
      emphasis: "text-gray-700",
    },
  },
  defaultVariants: {
    size: "xs",
    variant: "default",
  },
});

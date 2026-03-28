import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type SizeProps = "sm" | "md" | "lg";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const splitOddEven = (n: number) => {
  const odd = [];
  const even = [];
  const start = 11;
  const end = start + n - 1;

  for (let i = start; i <= start + n - 1; i++) {
    if (i % 2 === 1) {
      odd.push(i);
    } else {
      even.push(i);
    }
  }

  if (n % 2 === 1) {
    even.unshift(end);
  }

  return [odd, even];
};

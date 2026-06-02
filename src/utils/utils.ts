import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type SizeProps = 'sm' | 'md' | 'lg';

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

type TextShadowOptions = {
  color?: string;
  x?: number;
  y?: number;
  blur?: number;
};

export const createTextShadow = ({
  color = '#00000080',
  x = 0,
  y = 0,
  blur = 4,
}: TextShadowOptions = {}) => ({
  textShadow: `${x}px ${y}px ${blur}px ${color}`,
});

type TextStrokeOptions = {
  color?: string;
  width?: number | string;
};

export const createTextStroke = ({
  color = '#000000',
  width = 1,
}: TextStrokeOptions = {}) => ({
  WebkitTextStroke: `${width}px ${color}`,
});

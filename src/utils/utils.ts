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

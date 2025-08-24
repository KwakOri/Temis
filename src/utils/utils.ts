export const splitOddEven = (n: number) => {
  const odd = [];
  const even = [];
  const start = 11;

  for (let i = start; i <= n; i++) {
    if (i % 2 === 1) {
      odd.push(i);
    } else {
      even.push(i);
    }
  }

  if (n % 2 === 1) {
    even.push(start);
  }

  return [odd, even];
};

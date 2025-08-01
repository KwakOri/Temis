export const splitOddEven = (n: number) => {
  const odd = [];
  const even = [];

  for (let i = 1; i <= n; i++) {
    if (i % 2 === 1) {
      odd.push(i);
    } else {
      even.push(i);
    }
  }

  return [odd, even];
};

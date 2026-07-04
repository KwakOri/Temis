export const createStudioId = (prefix: string): string => {
  const normalizedPrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "id";
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${normalizedPrefix}_${randomPart}`;
};

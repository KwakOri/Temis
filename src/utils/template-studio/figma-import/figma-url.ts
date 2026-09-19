export const parseFigmaDesignUrl = (
  value: string,
): { fileKey: string; nodeId: string } | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "www.figma.com") return null;

  const pathMatch = url.pathname.match(/^\/design\/([A-Za-z0-9]{22})\/[^/]+$/);
  if (!pathMatch) return null;
  const fileKey = pathMatch[1];

  const rawNodeId = url.searchParams.get("node-id");
  if (!rawNodeId || !/^\d+[-:]\d+$/.test(rawNodeId)) return null;

  return { fileKey, nodeId: rawNodeId.replace("-", ":") };
};

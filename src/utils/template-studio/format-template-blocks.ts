export interface StudioFormatPart {
  id: string;
  kind: "text" | "token";
  value: string;
}

let nextPartId = 0;
const part = (
  kind: StudioFormatPart["kind"],
  value: string,
): StudioFormatPart => ({
  id: `format-part-${++nextPartId}`,
  kind,
  value,
});

export const serializeStudioFormatParts = (parts: StudioFormatPart[]): string =>
  parts.map((item) => item.value).join("");

/** Recognized variables are immutable blocks; all other source text is lossless. */
export const parseStudioFormatParts = (
  template: string,
  tokens: string[],
): StudioFormatPart[] => {
  const known = new Set(tokens);
  const result: StudioFormatPart[] = [];
  let offset = 0;
  for (const match of template.matchAll(/\$\{\s*([A-Za-z.]+)\s*\}/g)) {
    if (!known.has(`\${${match[1]}}`)) continue;
    if (match.index! > offset)
      result.push(part("text", template.slice(offset, match.index)));
    result.push(part("token", match[0]));
    offset = match.index! + match[0].length;
  }
  if (offset < template.length)
    result.push(part("text", template.slice(offset)));
  return result;
};

export const removeStudioFormatPart = (
  parts: StudioFormatPart[],
  id: string,
): StudioFormatPart[] => parts.filter((item) => item.id !== id);

export type StudioFormatDragSource =
  Pick<StudioFormatPart, "kind" | "value"> | { id: string };

export interface StudioFormatDropTarget {
  position: number;
  left: number;
  top: number;
  height: number;
}

/** Find a boundary by pointer proximity, including below a row and across wrapping. */
export const getStudioFormatDropTarget = (
  blocks: {
    position: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }[],
  point: { x: number; y: number },
  movingPosition?: number,
): StudioFormatDropTarget | null => {
  let closest: StudioFormatDropTarget | null = null;
  let distance = Infinity;
  for (const block of blocks) {
    if (block.position === movingPosition) continue;
    for (const after of [false, true]) {
      const candidate = {
        position: block.position + (after ? 1 : 0),
        left: after ? block.left + block.width + 6 : block.left - 6,
        top: block.top - 3,
        height: block.height + 6,
      };
      const dy = Math.max(
        candidate.top - point.y,
        point.y - candidate.top - candidate.height,
        0,
      );
      const nextDistance = (point.x - candidate.left) ** 2 + dy ** 2;
      if (nextDistance < distance) {
        closest = candidate;
        distance = nextDistance;
      }
    }
  }
  if (
    movingPosition !== undefined &&
    closest &&
    (closest.position === movingPosition ||
      closest.position === movingPosition + 1)
  )
    return null;
  return closest;
};

/** Drop positions refer to the original sequence, before removing a moved block. */
export const dropStudioFormatPart = (
  parts: StudioFormatPart[],
  position: number,
  source: StudioFormatDragSource,
): StudioFormatPart[] => {
  const index =
    "id" in source ? parts.findIndex((item) => item.id === source.id) : -1;
  if ("id" in source && index < 0) return parts;
  const moved = "id" in source ? parts[index] : part(source.kind, source.value);
  const next = parts.filter((_, itemIndex) => itemIndex !== index);
  const destination = Math.max(
    0,
    Math.min(position - (index >= 0 && index < position ? 1 : 0), next.length),
  );
  next.splice(destination, 0, moved);
  return next;
};

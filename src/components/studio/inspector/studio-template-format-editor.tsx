"use client";

import { cva } from "class-variance-authority";
import { GripVertical, Plus, Redo2, Undo2, Trash2, Type } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  dropStudioFormatPart,
  getStudioFormatDropTarget,
  parseStudioFormatParts,
  removeStudioFormatPart,
  serializeStudioFormatParts,
  type StudioFormatPart,
  type StudioFormatDragSource,
  type StudioFormatDropTarget,
} from "@/utils/template-studio/format-template-blocks";
import { StudioFormatActions, StudioFormatModal } from "./studio-format-modal";

export interface StudioFormatToken {
  value: string;
  label: string;
  group?: string;
}
export interface StudioFormatPreset {
  id: string;
  label: string;
  template: string;
}
export interface StudioTemplateFormatEditorProps {
  title: string;
  summary: string;
  template: string;
  tokens: StudioFormatToken[];
  /** Includes supported tokens from older templates that are absent from the palette. */
  recognizedTokens?: string[];
  presets: StudioFormatPreset[];
  preview: (template: string) => string;
  onApply: (value: { format: string; template: string }) => void;
}

const blockVariants = cva(
  "flex max-w-full items-start gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
  {
    variants: {
      kind: {
        token: "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]",
        text: "border-orange-400/70 bg-orange-400/15 text-orange-200",
      },
      palette: {
        true: "w-full cursor-grab items-center hover:brightness-125",
        false: "min-h-10",
      },
      moving: {
        true: "border-dashed opacity-30",
        false: "",
      },
    },
  },
);
const trashVariants = cva(
  "absolute bottom-3 right-3 flex min-h-12 items-center gap-2 rounded-xl border border-dashed px-4 text-xs font-semibold transition-colors",
  {
    variants: {
      active: {
        true: "border-red-400 bg-red-500/30 text-red-100",
        false: "border-red-400/60 bg-[var(--bg)] text-red-300",
      },
    },
  },
);
const DRAG_TYPE = "application/x-temis-format-block";
interface FormatHistory {
  past: StudioFormatPart[][];
  present: StudioFormatPart[];
  future: StudioFormatPart[][];
}
const stepHistory = (current: FormatHistory, redo: boolean): FormatHistory => {
  if (redo)
    return current.future.length === 0
      ? current
      : {
          past: [...current.past, current.present],
          present: current.future[0],
          future: current.future.slice(1),
        };
  return current.past.length === 0
    ? current
    : {
        past: current.past.slice(0, -1),
        present: current.past[current.past.length - 1],
        future: [current.present, ...current.future],
      };
};

export function StudioTemplateFormatEditor(
  props: StudioTemplateFormatEditorProps,
) {
  return (
    <StudioFormatModal title={props.title} summary={props.summary}>
      {(close) => (
        <TemplateFormatDraft
          {...props}
          onCancel={close}
          onApply={(value) => {
            props.onApply(value);
            close();
          }}
        />
      )}
    </StudioFormatModal>
  );
}

function TemplateFormatDraft({
  template,
  tokens,
  recognizedTokens = [],
  presets,
  preview,
  onApply,
  onCancel,
}: StudioTemplateFormatEditorProps & { onCancel: () => void }) {
  const [history, setHistory] = useState(() => ({
    past: [] as StudioFormatPart[][],
    present: parseStudioFormatParts(template, [
      ...tokens.map((token) => token.value),
      ...recognizedTokens,
    ]),
    future: [] as StudioFormatPart[][],
  }));
  const [dropTarget, setDropTarget] = useState<StudioFormatDropTarget | null>(
    null,
  );
  const [dragSource, setDragSource] = useState<StudioFormatDragSource | null>(
    null,
  );
  const [overTrash, setOverTrash] = useState(false);
  const textRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragImageRef = useRef<HTMLCanvasElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const followPointer = (event: DragEvent) => {
      const floating = dragPreviewRef.current;
      if (!floating || floating.hidden) return;
      floating.style.left = `${event.clientX - dragOffsetRef.current.x}px`;
      floating.style.top = `${event.clientY - dragOffsetRef.current.y}px`;
    };
    document.addEventListener("dragenter", followPointer);
    document.addEventListener("dragover", followPointer);
    return () => {
      document.removeEventListener("dragenter", followPointer);
      document.removeEventListener("dragover", followPointer);
    };
  }, []);
  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (
        !workspaceRef.current?.closest("dialog")?.open ||
        event.isComposing ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setHistory((current) => stepHistory(current, event.shiftKey));
    };
    window.addEventListener("keydown", handleUndo, true);
    return () => window.removeEventListener("keydown", handleUndo, true);
  }, []);
  const parts = history.present;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!workspaceRef.current?.closest("dialog")?.open) return;
      for (const field of textRefs.current.values()) {
        field.style.height = "auto";
        field.style.height = `${field.scrollHeight + 2}px`;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [parts]);
  const draft = serializeStudioFormatParts(parts);
  const preset = presets.find((item) => item.template === draft);
  const groups = Array.from(
    new Set(tokens.map((token) => token.group ?? "Variables")),
  );
  const tokenLabel = (value: string) => {
    const token = tokens.find(
      (item) => item.value.replace(/\s/g, "") === value.replace(/\s/g, ""),
    );
    return token
      ? `${token.group && groups.length > 1 ? `${token.group} · ` : ""}${token.label}`
      : value;
  };
  const update = (next: StudioFormatPart[]) => {
    setHistory((current) =>
      current.present.length === next.length &&
      current.present.every(
        (item, index) =>
          item.id === next[index].id &&
          item.kind === next[index].kind &&
          item.value === next[index].value,
      )
        ? current
        : {
            past: [...current.past.slice(-99), current.present],
            present: next,
            future: [],
          },
    );
  };
  const undo = () => setHistory((current) => stepHistory(current, false));
  const redo = () => setHistory((current) => stepHistory(current, true));
  const focusNewText = (next: StudioFormatPart[]) => {
    const added = next.find(
      (item) =>
        item.kind === "text" &&
        !parts.some((previous) => previous.id === item.id),
    );
    if (added)
      requestAnimationFrame(() => textRefs.current.get(added.id)?.focus());
  };
  const addBlock = (source: Pick<StudioFormatPart, "kind" | "value">) => {
    const next = dropStudioFormatPart(parts, parts.length, source);
    update(next);
    focusNewText(next);
  };
  const endDrag = () => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.hidden = true;
      dragPreviewRef.current.replaceChildren();
    }
    setDragSource(null);
    setDropTarget(null);
    setOverTrash(false);
  };
  const startDrag = (
    event: React.DragEvent,
    source: StudioFormatDragSource,
  ) => {
    // Text is dragged by its handle, but the whole block must follow the pointer.
    const original =
      event.currentTarget.closest<HTMLElement>("[data-format-text]") ??
      event.currentTarget;
    const floating = dragPreviewRef.current;
    const blankImage = dragImageRef.current;
    if (floating && blankImage) {
      const bounds = original.getBoundingClientRect();
      const clone = original.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-format-text");
      clone.removeAttribute("data-format-token");
      clone.removeAttribute("data-format-part-position");
      clone.removeAttribute("aria-label");
      clone.removeAttribute("draggable");
      clone.style.width = `${bounds.width}px`;
      clone.style.height = `${bounds.height}px`;
      clone.style.maxWidth = "none";
      clone.style.opacity = "1";
      // Cloned form fields need the live value, including edits and line breaks.
      original.querySelectorAll("textarea").forEach((field, index) => {
        clone.querySelectorAll("textarea")[index].value = field.value;
      });
      floating.replaceChildren(clone);
      dragOffsetRef.current = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      floating.style.left = `${bounds.left}px`;
      floating.style.top = `${bounds.top}px`;
      floating.hidden = false;
      // Suppress the browser's translucent handle-only ghost in favor of this preview.
      event.dataTransfer.setDragImage(blankImage, 0, 0);
    }
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(source));
    event.dataTransfer.effectAllowed = "id" in source ? "move" : "copy";
    setDragSource(source);
  };
  const readDrag = (event: React.DragEvent): StudioFormatDragSource | null => {
    try {
      const source: unknown = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
      if (!source || typeof source !== "object") return null;
      if (
        "id" in source &&
        typeof source.id === "string" &&
        parts.some((item) => item.id === source.id)
      )
        return { id: source.id };
      if (
        "kind" in source &&
        "value" in source &&
        typeof source.value === "string"
      ) {
        if (
          source.kind === "token" &&
          tokens.some((token) => token.value === source.value)
        )
          return { kind: "token", value: source.value };
        if (source.kind === "text" && source.value === "")
          return { kind: "text", value: "" };
      }
    } catch {
      /* Ignore unrelated external drags. */
    }
    return null;
  };
  const drop = (event: React.DragEvent, position: number) => {
    event.preventDefault();
    const source = readDrag(event);
    endDrag();
    if (!source) return;
    const next = dropStudioFormatPart(parts, position, source);
    update(next);
    focusNewText(next);
  };
  const deleteWithKeyboard = (event: React.KeyboardEvent, id: string) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    update(removeStudioFormatPart(parts, id));
  };
  const resolveDropTarget = (event: React.DragEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const bounds = container.getBoundingClientRect();
    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>("[data-format-part-position]"),
    ).map((block) => {
      const rect = block.getBoundingClientRect();
      return {
        position: Number(block.dataset.formatPartPosition),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    const movingPosition =
      dragSource && "id" in dragSource
        ? parts.findIndex((part) => part.id === dragSource.id)
        : undefined;
    const target = getStudioFormatDropTarget(
      blocks,
      { x: event.clientX, y: event.clientY },
      movingPosition,
    );
    if (target)
      return {
        ...target,
        left: target.left - bounds.left - container.clientLeft,
        top: target.top - bounds.top - container.clientTop,
      };
    if (parts.length === 0)
      return { position: 0, left: 18, top: 12, height: 46 };
    return null;
  };
  const showDropTarget = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
    if ((event.target as Element).closest("[data-format-trash]")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect =
      dragSource && "id" in dragSource ? "move" : "copy";
    setOverTrash(false);
    setDropTarget(resolveDropTarget(event));
  };
  const insertionPoint = (position: number) => (
    <div
      aria-label={`Block insertion point ${position + 1}`}
      className="min-h-10 w-3 shrink-0 rounded"
      data-format-drop-position={position}
      key={`drop:${position}`}
    />
  );
  return (
    <>
      <canvas
        aria-hidden="true"
        className="pointer-events-none fixed h-px w-px opacity-0"
        height={1}
        ref={dragImageRef}
        width={1}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 rounded-xl bg-[var(--field)] shadow-2xl ring-1 ring-white/20"
        data-format-drag-preview
        hidden
        inert
        ref={dragPreviewRef}
      />
      <div
        ref={workspaceRef}
        className="template-studio-scrollbar grid min-h-0 overflow-y-auto md:grid-cols-[240px_minmax(0,1fr)]"
      >
        <aside className="template-studio-scrollbar max-h-[calc(100dvh-200px)] overflow-y-auto border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
          <label className="grid gap-2 text-xs font-semibold text-[var(--fg2)]">
            <span>Preset</span>
            <select
              aria-label="Format preset"
              className="h-9 min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs text-[var(--fg)]"
              value={preset?.id ?? "custom"}
              onChange={(event) => {
                const selected = presets.find(
                  (item) => item.id === event.currentTarget.value,
                );
                if (selected) {
                  update(
                    parseStudioFormatParts(selected.template, [
                      ...tokens.map((token) => token.value),
                      ...recognizedTokens,
                    ]),
                  );
                }
              }}
            >
              {presets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
              <option value="custom">사용자 지정</option>
            </select>
          </label>
          <section className="mt-5 grid gap-1.5">
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg3)]">
              Text
            </h3>
            <button
              aria-label="Add Text block"
              className={blockVariants({ kind: "text", palette: true })}
              draggable
              type="button"
              onClick={() => addBlock({ kind: "text", value: "" })}
              onDragStart={(event) =>
                startDrag(event, { kind: "text", value: "" })
              }
              onDragEnd={endDrag}
            >
              <Type size={14} />
              <span className="flex-1 text-left">Text</span>
              <Plus size={12} />
            </button>
          </section>
          {groups.map((group) => (
            <section className="mt-5 grid gap-1.5" key={group}>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg3)]">
                {group}
              </h3>
              {tokens
                .filter((token) => (token.group ?? "Variables") === group)
                .map((token) => (
                  <button
                    aria-label={`Add ${token.label} block${token.group ? ` (${token.group})` : ""}`}
                    className={blockVariants({ kind: "token", palette: true })}
                    draggable
                    key={token.value}
                    title={token.value}
                    type="button"
                    onClick={() =>
                      addBlock({ kind: "token", value: token.value })
                    }
                    onDragStart={(event) =>
                      startDrag(event, { kind: "token", value: token.value })
                    }
                    onDragEnd={endDrag}
                  >
                    <GripVertical
                      className="shrink-0 text-[var(--fg3)]"
                      size={12}
                    />
                    <span className="min-w-0 flex-1 text-left">
                      {token.label}
                    </span>
                    <Plus className="shrink-0" size={12} />
                  </button>
                ))}
            </section>
          ))}
        </aside>
        <main className="grid content-start gap-5 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">Template</h3>
            <div className="flex gap-1">
              <button
                aria-label="Undo format edit"
                className="rounded p-2 hover:bg-[var(--hover)] disabled:opacity-30"
                disabled={history.past.length === 0}
                type="button"
                onClick={undo}
              >
                <Undo2 size={14} />
              </button>
              <button
                aria-label="Redo format edit"
                className="rounded p-2 hover:bg-[var(--hover)] disabled:opacity-30"
                disabled={history.future.length === 0}
                type="button"
                onClick={redo}
              >
                <Redo2 size={14} />
              </button>
            </div>
          </div>
          <div
            aria-label="Format blocks"
            onDragEnter={showDropTarget}
            onDragOver={showDropTarget}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setDropTarget(null);
            }}
            onDrop={(event) => {
              if ((event.target as Element).closest("[data-format-trash]"))
                return;
              if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
              const target = resolveDropTarget(event);
              if (target) drop(event, target.position);
              else {
                event.preventDefault();
                endDrag();
              }
            }}
            className="relative flex min-h-48 flex-wrap content-start items-start gap-y-3 rounded-xl border border-[var(--field-border)] bg-[var(--field)] p-3 pb-20"
          >
            {insertionPoint(0)}
            {parts.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.kind === "text" ? (
                  <div
                    className={blockVariants({
                      kind: "text",
                      palette: false,
                      moving:
                        dragSource !== null &&
                        "id" in dragSource &&
                        dragSource.id === item.id,
                    })}
                    data-format-text=""
                    data-format-part-position={index}
                  >
                    <button
                      aria-label={`Move text block ${index + 1}`}
                      className="mt-1 cursor-grab rounded outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:cursor-grabbing"
                      draggable
                      type="button"
                      onDragStart={(event) => startDrag(event, { id: item.id })}
                      onDragEnd={endDrag}
                      onKeyDown={(event) => deleteWithKeyboard(event, item.id)}
                    >
                      <GripVertical size={14} />
                    </button>
                    <textarea
                      aria-label={`Text block ${parts.slice(0, index + 1).filter((part) => part.kind === "text").length}`}
                      className="min-h-6 min-w-0 max-w-full resize-none bg-transparent text-sm font-normal leading-6 text-orange-100 outline-none placeholder:text-orange-200/50"
                      placeholder="Text"
                      ref={(element) => {
                        if (element) textRefs.current.set(item.id, element);
                        else textRefs.current.delete(item.id);
                      }}
                      rows={Math.max(1, item.value.split("\n").length)}
                      style={{
                        width: `${Math.min(32, Math.max(6, ...item.value.split("\n").map((line) => Array.from(line).reduce((width, character) => width + (character.codePointAt(0)! > 255 ? 2 : 1), 0) + 2)))}ch`,
                      }}
                      value={item.value}
                      onChange={(event) =>
                        update(
                          parts.map((part) =>
                            part.id === item.id
                              ? { ...part, value: event.currentTarget.value }
                              : part,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <div
                    aria-label={`Variable block ${index + 1}: ${tokenLabel(item.value)}`}
                    className={`${blockVariants({
                      kind: "token",
                      palette: false,
                      moving:
                        dragSource !== null &&
                        "id" in dragSource &&
                        dragSource.id === item.id,
                    })} cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing`}
                    data-format-token={item.value}
                    data-format-part-position={index}
                    draggable
                    tabIndex={0}
                    title={item.value}
                    onDragStart={(event) => startDrag(event, { id: item.id })}
                    onDragEnd={endDrag}
                    onKeyDown={(event) => deleteWithKeyboard(event, item.id)}
                  >
                    <GripVertical
                      className="mt-0.5 shrink-0 text-[var(--fg3)]"
                      size={12}
                    />
                    <span className="min-w-0 break-words">
                      {tokenLabel(item.value)}
                    </span>
                  </div>
                )}
                {insertionPoint(index + 1)}
              </React.Fragment>
            ))}
            {dropTarget && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-10 w-1 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
                data-format-drop-indicator={dropTarget.position}
                style={{
                  left: dropTarget.left - 2,
                  top: dropTarget.top,
                  height: dropTarget.height,
                }}
              >
                <span className="absolute -left-0.5 -top-0.5 size-2 rounded-full bg-[var(--accent)]" />
                <span className="absolute -bottom-0.5 -left-0.5 size-2 rounded-full bg-[var(--accent)]" />
              </div>
            )}
            {dragSource && "id" in dragSource && (
              <div
                aria-label="Delete block"
                className={trashVariants({ active: overTrash })}
                data-format-trash
                onDragEnter={(event) => {
                  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                  event.preventDefault();
                  setDropTarget(null);
                  setOverTrash(true);
                }}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(null);
                  setOverTrash(true);
                }}
                onDragLeave={() => setOverTrash(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  const source = readDrag(event);
                  if (source && "id" in source)
                    update(removeStudioFormatPart(parts, source.id));
                  endDrag();
                }}
              >
                <Trash2 size={16} />
                <span>Drop to delete</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[var(--fg3)]">
            Drag to arrange blocks. Add text with the orange Text block.
          </p>
          <section className="grid gap-2">
            <h3 className="text-xs font-semibold text-[var(--fg2)]">Preview</h3>
            <output
              aria-label="Format preview"
              className="min-h-24 whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--field)] p-4 text-lg font-semibold"
            >
              {preview(draft) || (
                <span className="text-xs font-normal text-[var(--fg3)]">
                  Empty output
                </span>
              )}
            </output>
          </section>
        </main>
      </div>
      <StudioFormatActions
        onCancel={onCancel}
        onApply={() => {
          if (draft !== template)
            onApply({ format: preset?.id ?? "custom", template: draft });
          else onCancel();
        }}
      />
    </>
  );
}

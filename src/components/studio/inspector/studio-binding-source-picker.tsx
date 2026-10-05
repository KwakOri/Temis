"use client";

import { cva } from "class-variance-authority";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import type {
  StudioBuiltinFieldDefinition,
  StudioGraphNode,
  StudioInputDefinition,
  StudioInputScope,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  createStudioBindingForBuiltinField,
  createStudioBindingForInput,
  resolveStudioAsset,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import {
  createStudioInitialRuntimeValues,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import {
  getStudioInputScopeLabel,
  STUDIO_INPUT_SCOPE_OPTIONS,
} from "@/utils/template-studio/input-scope";
import { getStudioInputTypeLabel } from "@/utils/template-studio/input-commands";

type SourceKind = "builtin" | "input";
interface BindingSource {
  value: string;
  label: string;
  path: string;
  scope: StudioInputScope;
  source: SourceKind;
  type: string;
}
const sourceLabels: Record<SourceKind, string> = {
  builtin: "Built-in",
  input: "Custom",
};
const scopeDescriptions: Record<StudioInputScope, string> = {
  global: "Shared across the timetable",
  day: "Varies by day",
  entry: "Varies by entry",
};
const choiceVariants = cva(
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
  {
    variants: {
      selected: {
        true: "bg-[var(--sel)] text-[var(--fg)]",
        false: "text-[var(--fg2)] hover:bg-[var(--hover)]",
      },
    },
  },
);
const triggerVariants = cva(
  "min-w-0 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      mode: {
        tab: "h-7 rounded-[5px] text-[11.5px] font-semibold",
        source:
          "flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs text-[var(--fg)] hover:border-[var(--accent)]",
      },
      active: {
        true: "bg-[var(--accent)] text-white",
        false: "text-[var(--fg2)] hover:bg-[var(--hover)]",
      },
    },
  },
);

export interface StudioBindingSourcePickerProps {
  document: StudioTemplateDocument;
  node: StudioGraphNode;
  fields: StudioBuiltinFieldDefinition[];
  inputs: StudioInputDefinition[];
  value: string;
  runtimeValues?: StudioRuntimeValues;
  context?: StudioRuntimeContext;
  mode?: "tab" | "source";
  onSelect: (value: string) => void;
}

export function StudioBindingSourcePicker(
  props: StudioBindingSourcePickerProps,
) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mode = props.mode ?? "source";
  const options: BindingSource[] = [
    ...props.fields.map((field) => ({
      value: `builtin:${field.id}`,
      label: field.label,
      path: field.id,
      scope: field.scope,
      source: "builtin" as const,
      type: field.type,
    })),
    ...props.inputs.map((input) => ({
      value: `input:${input.id}`,
      label: input.label,
      path: input.id,
      scope: input.scope,
      source: "input" as const,
      type: getStudioInputTypeLabel(input.type),
    })),
  ];
  const current = options.find((option) => option.value === props.value);
  const summary = current
    ? `${getStudioInputScopeLabel(current.scope)} › ${current.label}`
    : "Select source";
  return (
    <>
      <button
        ref={triggerRef}
        aria-label={mode === "tab" ? "Bound" : `Binding Source: ${summary}`}
        aria-haspopup="dialog"
        className={triggerVariants({
          mode,
          active: mode === "tab" ? Boolean(props.value) : undefined,
        })}
        disabled={options.length === 0}
        title={mode === "source" ? summary : undefined}
        type="button"
        onClick={() => setOpen(true)}
      >
        {mode === "tab" ? (
          "Bound"
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
            <ChevronRight className="shrink-0" size={14} />
          </>
        )}
      </button>
      {open ? (
        <BindingSourceDialog
          {...props}
          options={options}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function BindingSourceDialog({
  document,
  node,
  fields,
  inputs,
  value,
  options,
  runtimeValues,
  context,
  onSelect,
  onClose,
}: StudioBindingSourcePickerProps & {
  options: BindingSource[];
  onClose: () => void;
}) {
  const initial =
    options.find((option) => option.value === value) ?? options[0];
  const [selectedValue, setSelectedValue] = useState(initial?.value ?? "");
  const [category, setCategory] = useState({
    scope: initial?.scope ?? "global",
    source: initial?.source ?? "builtin",
  });
  const [expanded, setExpanded] = useState<StudioInputScope[]>([
    initial?.scope ?? "global",
  ]);
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const close = () => {
    dialogRef.current?.close();
    onClose();
  };
  const query = search.trim().toLowerCase();
  const visible = options.filter((option) =>
    query
      ? `${option.label} ${option.path} ${option.scope} ${sourceLabels[option.source]}`
          .toLowerCase()
          .includes(query)
      : option.scope === category.scope && option.source === category.source,
  );
  const selected = options.find((option) => option.value === selectedValue);
  const field =
    selected?.source === "builtin"
      ? fields.find((item) => `builtin:${item.id}` === selected.value)
      : null;
  const input =
    selected?.source === "input"
      ? inputs.find((item) => `input:${item.id}` === selected.value)
      : null;
  const binding =
    selected?.value === value
      ? node.binding
      : field
        ? createStudioBindingForBuiltinField(node, field)
        : input
          ? createStudioBindingForInput(node, input)
          : null;
  const values = runtimeValues ?? createStudioInitialRuntimeValues(document);
  const preview = binding
    ? resolveStudioTextBinding(document, values, binding, context)
    : "";
  const previewAsset = binding
    ? resolveStudioAsset(document, values, binding, context)
    : null;

  return (
    <dialog
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-0 text-[var(--fg)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-bold" id={titleId}>
            Connect data
          </h2>
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--fg3)]">
            {node.label}
          </span>
          <button
            aria-label="Close binding picker"
            className="rounded-lg p-2 text-[var(--fg2)] hover:bg-[var(--hover)]"
            type="button"
            onClick={close}
          >
            <X size={16} />
          </button>
        </header>
        <label className="mx-5 my-4 flex items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 focus-within:border-[var(--accent)]">
          <Search className="text-[var(--fg3)]" size={15} />
          <input
            autoFocus
            aria-label="Search bindings"
            className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none"
            placeholder="Search name or path"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </label>
        <div className="grid h-[340px] max-h-[calc(100dvh-210px)] min-h-0 flex-1 grid-cols-[150px_minmax(0,1fr)] border-y border-[var(--border)] sm:grid-cols-[180px_minmax(0,1fr)_240px]">
          <nav
            aria-label="Binding categories"
            className="template-studio-scrollbar overflow-y-auto border-r border-[var(--border)] p-2"
          >
            {STUDIO_INPUT_SCOPE_OPTIONS.map((scope) => {
              const sources = (["builtin", "input"] as const).filter((source) =>
                options.some(
                  (option) =>
                    option.scope === scope && option.source === source,
                ),
              );
              if (sources.length === 0) return null;
              const isExpanded = expanded.includes(scope);
              return (
                <div className="mb-2" key={scope}>
                  <button
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-[var(--hover)]"
                    type="button"
                    onClick={() =>
                      setExpanded((current) =>
                        isExpanded
                          ? current.filter((item) => item !== scope)
                          : [...current, scope],
                      )
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    {getStudioInputScopeLabel(scope)}
                  </button>
                  {isExpanded
                    ? sources.map((source) => (
                        <button
                          aria-pressed={
                            !query &&
                            category.scope === scope &&
                            category.source === source
                          }
                          className={choiceVariants({
                            selected:
                              !query &&
                              category.scope === scope &&
                              category.source === source,
                          })}
                          key={source}
                          type="button"
                          onClick={() => {
                            setCategory({ scope, source });
                            setSearch("");
                          }}
                        >
                          <span className="pl-5">{sourceLabels[source]}</span>
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
          </nav>
          <div className="template-studio-scrollbar min-h-0 overflow-y-auto p-2">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg3)]">
              {query
                ? "Search results"
                : `${getStudioInputScopeLabel(category.scope)} / ${sourceLabels[category.source]}`}
            </div>
            {visible.length === 0 ? (
              <p className="p-3 text-xs text-[var(--fg3)]">
                No matching variables
              </p>
            ) : (
              visible.map((option) => (
                <button
                  aria-pressed={option.value === selectedValue}
                  className={choiceVariants({
                    selected: option.value === selectedValue,
                  })}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedValue(option.value);
                    setCategory({ scope: option.scope, source: option.source });
                    setExpanded((current) =>
                      current.includes(option.scope)
                        ? current
                        : [...current, option.scope],
                    );
                  }}
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="break-words font-semibold">
                      {option.label}
                    </span>
                    <span className="truncate text-[10px] text-[var(--fg3)]">
                      {query
                        ? `${getStudioInputScopeLabel(option.scope)} / ${sourceLabels[option.source]}`
                        : option.type}
                    </span>
                  </span>
                  {option.value === value ? (
                    <Check aria-label="Currently connected" size={14} />
                  ) : null}
                </button>
              ))
            )}
          </div>
          <section
            aria-label="Selected binding"
            className="template-studio-scrollbar col-span-2 overflow-y-auto border-t border-[var(--border)] p-4 sm:col-span-1 sm:border-l sm:border-t-0"
          >
            {selected ? (
              <div className="grid gap-4">
                <div className="grid gap-1">
                  <span className="text-[10px] font-semibold text-[var(--fg3)]">
                    {getStudioInputScopeLabel(selected.scope)} /{" "}
                    {sourceLabels[selected.source]}
                  </span>
                  <h3 className="text-sm font-semibold">{selected.label}</h3>
                  <p className="text-xs text-[var(--fg2)]">
                    {scopeDescriptions[selected.scope]}
                  </p>
                </div>
                <code className="break-all text-[11px] text-[var(--fg3)]">
                  {selected.path}
                </code>
                <div className="grid gap-2">
                  <span className="text-[10px] font-semibold uppercase text-[var(--fg3)]">
                    {node.type === "image" ? "Image preview" : "Sample value"}
                  </span>
                  {previewAsset ? (
                    // 관리자 바인딩 미리보기는 원본 URL과 로컬 이미지 값을 그대로 사용한다.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={selected.label}
                      className="max-h-28 max-w-full rounded-lg object-contain"
                      src={previewAsset.src}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words rounded-lg bg-[var(--field)] p-3 text-xs text-[var(--fg2)]">
                      {preview ||
                        (node.type === "image"
                          ? "No image assigned"
                          : "Empty value")}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 px-5 py-3">
          <button
            className="h-9 rounded-lg border border-[var(--field-border)] px-4 text-xs font-semibold hover:bg-[var(--hover)]"
            type="button"
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white disabled:opacity-45"
            disabled={!selected}
            type="button"
            onClick={() => {
              if (selected) {
                if (selected.value !== value) onSelect(selected.value);
                close();
              }
            }}
          >
            Connect
          </button>
        </footer>
      </div>
    </dialog>
  );
}

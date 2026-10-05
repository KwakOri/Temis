"use client";

import { cva } from "class-variance-authority";

const tabStyle = cva(
  "rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  {
    variants: {
      active: {
        true: "bg-primary text-white",
        false: "text-gray-600 hover:bg-gray-100",
      },
    },
  },
);

export default function AdminSectionTabs<T extends string>({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={label}
      role="tablist"
      className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2"
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          id={`${id}-tab-${item.value}`}
          aria-controls={`${id}-panel-${item.value}`}
          aria-selected={value === item.value}
          role="tab"
          tabIndex={value === item.value ? 0 : -1}
          type="button"
          className={tabStyle({ active: value === item.value })}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % items.length
                : event.key === "ArrowLeft"
                  ? (index + items.length - 1) % items.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            document.getElementById(`${id}-tab-${items[next].value}`)?.focus();
            onChange(items[next].value);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

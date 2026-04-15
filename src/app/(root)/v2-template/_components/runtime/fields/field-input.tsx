import { V2TemplateFormField } from "@/types/time-table/template-render-config";

const v2_toFieldInputValue = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

interface V2RuntimeFieldInputProps {
  field: V2TemplateFormField;
  value: unknown;
  onChange: (nextValue: string | number) => void;
}

const V2RuntimeFieldInput = ({
  field,
  value,
  onChange,
}: V2RuntimeFieldInputProps) => {
  const commonClassName =
    "w-full rounded border border-[#3a3d44] bg-[#1a1d23] px-3 py-2 text-sm text-gray-100";
  const inputValue = v2_toFieldInputValue(value);

  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={String(inputValue)}
        onChange={(event) => onChange(event.target.value)}
        className={commonClassName}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={String(inputValue)}
        onChange={(event) => onChange(event.target.value)}
        className={commonClassName}
      >
        <option value="">{field.placeholder || "선택"}</option>
        {(field.options ?? []).map((option) => (
          <option key={`${field.key}:${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={inputValue}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
        className={commonClassName}
        placeholder={field.placeholder}
      />
    );
  }

  const inputType =
    field.type === "time" ? "time" : field.type === "date" ? "date" : "text";

  return (
    <input
      type={inputType}
      value={String(inputValue)}
      onChange={(event) => onChange(event.target.value)}
      className={commonClassName}
      placeholder={field.placeholder}
    />
  );
};

export default V2RuntimeFieldInput;

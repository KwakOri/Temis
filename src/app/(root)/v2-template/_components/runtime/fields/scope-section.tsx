import { V2TemplateFieldScope, V2TemplateFormField } from "@/types/time-table/template-render-config";
import V2RuntimeFieldInput from "./field-input";

interface V2RuntimeScopeSectionProps {
  scope: V2TemplateFieldScope;
  scopeLabel: string;
  fields: V2TemplateFormField[];
  getValue: (field: V2TemplateFormField) => unknown;
  onChange: (fieldKey: string, nextValue: string | number) => void;
}

const V2RuntimeScopeSection = ({
  scope,
  scopeLabel,
  fields,
  getValue,
  onChange,
}: V2RuntimeScopeSectionProps) => {
  if (fields.length === 0) return null;

  return (
    <section className="space-y-3 rounded border border-[#2f3239] bg-[#111317] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
        {scopeLabel}
      </h3>
      {fields.map((field) => {
        const label = field.label?.trim() || field.key;
        return (
          <div key={`${scope}:${field.key}`} className="space-y-1.5">
            <label className="block text-xs text-gray-400">{label}</label>
            <V2RuntimeFieldInput
              field={field}
              value={getValue(field)}
              onChange={(nextValue) => onChange(field.key, nextValue)}
            />
          </div>
        );
      })}
    </section>
  );
};

export default V2RuntimeScopeSection;

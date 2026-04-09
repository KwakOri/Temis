import {
  TDefaultCard,
  TDynamicCard,
  TEntry,
  TGlobalData,
} from "@/types/time-table/data";
import {
  V2TemplateFormField,
  V2TemplateFormSchema,
} from "@/types/time-table/template-render-config";

export const v2_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

const v2_getInitialValueFromField = (
  field: V2TemplateFormField
): string | number => {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.type) {
    case "number":
      return 0;
    case "time":
      return "09:00";
    case "text":
    case "textarea":
    case "select":
    case "date":
    default:
      return "";
  }
};

export const v2_createInitialEntryFromFormSchema = ({
  formSchema,
}: {
  formSchema: V2TemplateFormSchema;
}): TEntry => {
  const entry: TEntry = {
    time: "09:00",
    mainTitle: "",
    isGuerrilla: false,
  };

  formSchema.fields
    .filter((field) => field.scope === "entry")
    .forEach((field) => {
      entry[field.key] = v2_getInitialValueFromField(field);
    });

  return entry;
};

export const v2_createInitialCardFromFormSchema = ({
  formSchema,
}: {
  formSchema: V2TemplateFormSchema;
}): TDynamicCard => {
  const card: TDynamicCard = {
    isOffline: false,
    entries: [v2_createInitialEntryFromFormSchema({ formSchema })],
  };

  formSchema.fields
    .filter((field) => field.scope === "card")
    .forEach((field) => {
      card[field.key] = v2_getInitialValueFromField(field);
    });

  return card;
};

export const v2_createInitialGlobalDataFromFormSchema = ({
  formSchema,
}: {
  formSchema: V2TemplateFormSchema;
}): TGlobalData => {
  const globalData: TGlobalData = {};

  formSchema.fields
    .filter((field) => field.scope === "global")
    .forEach((field) => {
      globalData[field.key] = v2_getInitialValueFromField(field);
    });

  return globalData;
};

export const v2_getDefaultCardsFromFormSchema = ({
  formSchema,
}: {
  formSchema: V2TemplateFormSchema;
}): TDefaultCard[] => {
  return v2_WEEK.map((day) => {
    return {
      day,
      ...v2_createInitialCardFromFormSchema({ formSchema }),
    } as TDefaultCard;
  });
};

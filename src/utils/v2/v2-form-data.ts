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

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const v2_hydrateEntryFromFormSchema = ({
  formSchema,
  entry,
}: {
  formSchema: V2TemplateFormSchema;
  entry: unknown;
}): TEntry => {
  const base = v2_createInitialEntryFromFormSchema({ formSchema });
  if (!v2_isRecord(entry)) return base;

  return {
    ...base,
    ...entry,
    time: typeof entry.time === "string" ? entry.time : base.time,
    mainTitle:
      typeof entry.mainTitle === "string" ? entry.mainTitle : base.mainTitle,
    isGuerrilla:
      typeof entry.isGuerrilla === "boolean"
        ? entry.isGuerrilla
        : base.isGuerrilla,
  };
};

export const v2_hydrateCardFromFormSchema = ({
  formSchema,
  card,
}: {
  formSchema: V2TemplateFormSchema;
  card: unknown;
}): TDynamicCard => {
  const base = v2_createInitialCardFromFormSchema({ formSchema });
  if (!v2_isRecord(card)) return base;

  const rawEntries = Array.isArray(card.entries) ? card.entries : [];
  const hydratedEntries = rawEntries
    .map((entry) => v2_hydrateEntryFromFormSchema({ formSchema, entry }))
    .filter((entry): entry is TEntry => Boolean(entry));
  const nextEntries = hydratedEntries.length > 0 ? hydratedEntries : base.entries;

  return {
    ...base,
    ...card,
    isOffline:
      typeof card.isOffline === "boolean" ? card.isOffline : base.isOffline,
    entries: nextEntries,
  };
};

export const v2_hydrateCardsFromFormSchema = ({
  formSchema,
  data,
}: {
  formSchema: V2TemplateFormSchema;
  data: unknown;
}): TDefaultCard[] => {
  const defaultCards = v2_getDefaultCardsFromFormSchema({ formSchema });
  const rawCards = Array.isArray(data) ? data : [];

  return defaultCards.map((defaultCard, day) => {
    const raw = rawCards.find(
      (candidate) =>
        v2_isRecord(candidate) && typeof candidate.day === "number" && candidate.day === day
    );

    const hydrated = v2_hydrateCardFromFormSchema({
      formSchema,
      card: raw,
    });

    return {
      day,
      ...hydrated,
    } as TDefaultCard;
  });
};

export const v2_hydrateGlobalDataFromFormSchema = ({
  formSchema,
  globalData,
}: {
  formSchema: V2TemplateFormSchema;
  globalData: unknown;
}): TGlobalData => {
  const base = v2_createInitialGlobalDataFromFormSchema({ formSchema });
  if (!v2_isRecord(globalData)) return base;
  return {
    ...base,
    ...globalData,
  } as TGlobalData;
};

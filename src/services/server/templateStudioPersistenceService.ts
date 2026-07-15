import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { Json } from "@/types/supabase";
import {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";
import {
  migrateStudioTemplateDocument,
  STUDIO_TEMPLATE_DOCUMENT_VERSION,
} from "@/utils/template-studio/migrations";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import {
  isStudioRuntimeValuesLike,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";

type SupabaseErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type SupabaseQueryBuilder<T> = PromiseLike<SupabaseResult<T>> & {
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>;
  insert(value: unknown): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  maybeSingle(): Promise<SupabaseResult<T | null>>;
  order(
    column: string,
    options?: {
      ascending?: boolean;
    },
  ): SupabaseQueryBuilder<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  single(): Promise<SupabaseResult<T>>;
  upsert(
    value: unknown,
    options?: {
      onConflict?: string;
    },
  ): SupabaseQueryBuilder<T>;
};

export type TemplateStudioPersistenceClient = {
  from<T = unknown>(table: string): SupabaseQueryBuilder<T>;
  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<SupabaseResult<T>>;
};

export type TemplateStudioTemplateStatus = "draft" | "published" | "archived";

export type TemplateStudioRevisionSource =
  "publish" | "import" | "backfill" | "system";

type TemplateStudioTemplateRow = {
  id: string;
  name: string;
  description: string;
  status: TemplateStudioTemplateStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

type TemplateStudioDocumentRow = {
  id: string;
  template_id: string;
  document_version: number;
  document: Json;
  runtime_values: Json;
  published_revision_no: number | null;
  created_at: string;
  updated_at: string;
};

type TemplateStudioDraftRow = {
  id: string;
  template_id: string;
  user_id: number;
  document_version: number;
  document: Json;
  runtime_values: Json;
  base_revision_no: number | null;
  is_autosave: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateStudioRevisionRow = {
  id: string;
  template_id: string;
  revision_no: number;
  document_version: number;
  document: Json;
  runtime_values: Json;
  source: TemplateStudioRevisionSource;
  created_by: number | null;
  created_at: string;
};

type TemplateStudioUserStateRow = {
  id: string;
  template_id: string;
  user_id: number;
  base_revision_no: number | null;
  runtime_values: Json;
  version: number;
  created_at: string;
  updated_at: string;
};

type TemplateStudioAssetRow = {
  id: string;
  template_id: string;
  asset_id: string;
  storage_provider: string | null;
  storage_path: string;
  public_url: string | null;
  content_hash: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
};

export type TemplateStudioTemplateRecord = {
  id: string;
  name: string;
  description: string;
  status: TemplateStudioTemplateStatus;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateStudioDocumentRecord = {
  id: string;
  templateId: string;
  documentVersion: number;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  publishedRevisionNo: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateStudioDraftRecord = {
  id: string;
  templateId: string;
  userId: number;
  documentVersion: number;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  baseRevisionNo: number | null;
  isAutosave: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TemplateStudioRevisionRecord = {
  id: string;
  templateId: string;
  revisionNo: number;
  documentVersion: number;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  source: TemplateStudioRevisionSource;
  createdBy: number | null;
  createdAt: string;
};

export type TemplateStudioUserStateRecord = {
  id: string;
  templateId: string;
  userId: number;
  baseRevisionNo: number | null;
  runtimeValues: StudioRuntimeValues;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TemplateStudioAssetRecord = {
  id: string;
  templateId: string;
  assetId: string;
  storageProvider: string | null;
  storagePath: string;
  publicUrl: string | null;
  contentHash: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export type TemplateStudioPreparedDocument = {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  diagnostics: StudioDiagnostic[];
  migrationWarnings: string[];
  usedRuntimeFallback: boolean;
};

export type TemplateStudioDocumentPreparationResult =
  | ({
      ok: true;
    } & TemplateStudioPreparedDocument)
  | {
      ok: false;
      message: string;
      diagnostics?: StudioDiagnostic[];
      migrationWarnings?: string[];
    };

export class TemplateStudioPersistenceError extends Error {
  code?: string;
  details?: string | null;
  hint?: string | null;

  constructor(message: string, error?: SupabaseErrorLike | null) {
    super(error?.message ? `${message}: ${error.message}` : message);
    this.name = "TemplateStudioPersistenceError";
    this.code = error?.code;
    this.details = error?.details;
    this.hint = error?.hint;
  }
}

const TEMPLATE_STUDIO_DOCUMENT_COLUMNS =
  "id, template_id, document_version, document, runtime_values, published_revision_no, created_at, updated_at";
const TEMPLATE_STUDIO_DRAFT_COLUMNS =
  "id, template_id, user_id, document_version, document, runtime_values, base_revision_no, is_autosave, created_at, updated_at";
const TEMPLATE_STUDIO_REVISION_COLUMNS =
  "id, template_id, revision_no, document_version, document, runtime_values, source, created_by, created_at";
const TEMPLATE_STUDIO_ASSET_COLUMNS =
  "id, template_id, asset_id, storage_provider, storage_path, public_url, content_hash, mime_type, width, height, byte_size, created_by, created_at, updated_at, last_synced_at";
const TEMPLATE_STUDIO_TEMPLATE_COLUMNS =
  "id, name, description, status, created_by, created_at, updated_at";
const TEMPLATE_STUDIO_USER_STATE_COLUMNS =
  "id, template_id, user_id, base_revision_no, runtime_values, version, created_at, updated_at";

const templateStudioClient =
  supabaseAdminServer as unknown as TemplateStudioPersistenceClient;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toJson = (value: unknown): Json => cloneJson(value) as Json;

const getBlockingDiagnostics = (
  diagnostics: StudioDiagnostic[],
): StudioDiagnostic[] =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

const throwOnError = (message: string, error: SupabaseErrorLike | null) => {
  if (error) {
    throw new TemplateStudioPersistenceError(message, error);
  }
};

const getClient = (
  client?: TemplateStudioPersistenceClient,
): TemplateStudioPersistenceClient => client ?? templateStudioClient;

export const migrateTemplateStudioDocumentForPersistence = (value: unknown) =>
  migrateStudioTemplateDocument(value);

export const validateTemplateStudioDocumentForPersistence = (
  value: unknown,
  runtimeValues: unknown,
  options: {
    allowRuntimeFallback?: boolean;
  } = {},
): TemplateStudioDocumentPreparationResult => {
  const migrationResult = migrateTemplateStudioDocumentForPersistence(value);

  if (!migrationResult.ok) {
    return {
      ok: false,
      message: migrationResult.message,
    };
  }

  const document = migrationResult.document;
  const documentDiagnostics = validateStudioDocument(document);
  const diagnostics = isStudioRuntimeValuesLike(runtimeValues)
    ? [
        ...documentDiagnostics,
        ...validateStudioRuntimeValuesForDocument(document, runtimeValues),
      ]
    : documentDiagnostics;
  const blockingDiagnostics = getBlockingDiagnostics(diagnostics);

  if (blockingDiagnostics.length > 0) {
    return {
      ok: false,
      message: `Template Studio document has ${blockingDiagnostics.length} validation error(s).`,
      diagnostics,
      migrationWarnings: migrationResult.warnings,
    };
  }

  if (isStudioRuntimeValuesLike(runtimeValues)) {
    return {
      ok: true,
      document,
      runtimeValues: cloneJson(runtimeValues),
      diagnostics,
      migrationWarnings: migrationResult.warnings,
      usedRuntimeFallback: false,
    };
  }

  if (options.allowRuntimeFallback) {
    return {
      ok: true,
      document,
      runtimeValues: createStudioInitialRuntimeValues(document),
      diagnostics,
      migrationWarnings: migrationResult.warnings,
      usedRuntimeFallback: true,
    };
  }

  return {
    ok: false,
    message: "Template Studio runtime values are missing or invalid.",
    diagnostics,
    migrationWarnings: migrationResult.warnings,
  };
};

const prepareStoredDocument = (
  document: unknown,
  runtimeValues: unknown,
): TemplateStudioPreparedDocument => {
  const result = validateTemplateStudioDocumentForPersistence(
    document,
    runtimeValues,
  );

  if (!result.ok) {
    throw new TemplateStudioPersistenceError(result.message);
  }

  return result;
};

const toTemplateRecord = (
  row: TemplateStudioTemplateRow,
): TemplateStudioTemplateRecord => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDocumentRecord = (
  row: TemplateStudioDocumentRow,
): TemplateStudioDocumentRecord => {
  const prepared = prepareStoredDocument(row.document, row.runtime_values);

  return {
    id: row.id,
    templateId: row.template_id,
    documentVersion: row.document_version,
    document: prepared.document,
    runtimeValues: prepared.runtimeValues,
    publishedRevisionNo: row.published_revision_no,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toDraftRecord = (
  row: TemplateStudioDraftRow,
): TemplateStudioDraftRecord => {
  const prepared = prepareStoredDocument(row.document, row.runtime_values);

  return {
    id: row.id,
    templateId: row.template_id,
    userId: row.user_id,
    documentVersion: row.document_version,
    document: prepared.document,
    runtimeValues: prepared.runtimeValues,
    baseRevisionNo: row.base_revision_no,
    isAutosave: row.is_autosave,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toUserStateRecord = (
  row: TemplateStudioUserStateRow,
): TemplateStudioUserStateRecord => {
  if (!isStudioRuntimeValuesLike(row.runtime_values)) {
    throw new TemplateStudioPersistenceError(
      "Stored Template Studio user state runtime values are invalid.",
    );
  }

  return {
    id: row.id,
    templateId: row.template_id,
    userId: row.user_id,
    baseRevisionNo: row.base_revision_no,
    runtimeValues: cloneJson(row.runtime_values) as StudioRuntimeValues,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toRevisionRecord = (
  row: TemplateStudioRevisionRow,
): TemplateStudioRevisionRecord => {
  const prepared = prepareStoredDocument(row.document, row.runtime_values);

  return {
    id: row.id,
    templateId: row.template_id,
    revisionNo: row.revision_no,
    documentVersion: row.document_version,
    document: prepared.document,
    runtimeValues: prepared.runtimeValues,
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
};

const toAssetRecord = (
  row: TemplateStudioAssetRow,
): TemplateStudioAssetRecord => ({
  id: row.id,
  templateId: row.template_id,
  assetId: row.asset_id,
  storageProvider: row.storage_provider,
  storagePath: row.storage_path,
  publicUrl: row.public_url,
  contentHash: row.content_hash,
  mimeType: row.mime_type,
  width: row.width,
  height: row.height,
  byteSize: row.byte_size,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastSyncedAt: row.last_synced_at,
});

export const createTemplateStudioTemplate = async (
  input: {
    name: string;
    description?: string;
    status?: TemplateStudioTemplateStatus;
    createdBy?: number | null;
  },
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioTemplateRecord> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioTemplateRow>("templates")
    .insert({
      name: input.name,
      description: input.description ?? "",
      template_engine: "studio",
      status: input.status ?? "draft",
      created_by: input.createdBy ?? null,
      is_public: false,
      is_shop_visible: false,
    })
    .select(TEMPLATE_STUDIO_TEMPLATE_COLUMNS)
    .single();

  throwOnError("Failed to create Template Studio template", error);
  if (!data) {
    throw new TemplateStudioPersistenceError(
      "Failed to create Template Studio template: empty response",
    );
  }

  return toTemplateRecord(data);
};

export const getTemplateStudioTemplate = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioTemplateRecord | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioTemplateRow>("templates")
    .select(TEMPLATE_STUDIO_TEMPLATE_COLUMNS)
    .eq("id", templateId)
    .eq("template_engine", "studio")
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio template", error);
  return data ? toTemplateRecord(data) : null;
};

export const listTemplateStudioTemplates = async (
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioTemplateRecord[]> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioTemplateRow[]>("templates")
    .select(TEMPLATE_STUDIO_TEMPLATE_COLUMNS)
    .eq("template_engine", "studio")
    .order("updated_at", { ascending: false });

  throwOnError("Failed to list Template Studio templates", error);
  return (data ?? []).map(toTemplateRecord);
};

export const deleteTemplateStudioTemplate = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<void> => {
  const supabase = getClient(client);
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", templateId)
    .eq("template_engine", "studio");

  throwOnError("Failed to delete Template Studio template", error);
};

export const getTemplateStudioLatestRevisionNo = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<number> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<Pick<TemplateStudioRevisionRow, "revision_no">>(
      "template_studio_document_revisions",
    )
    .select("revision_no")
    .eq("template_id", templateId)
    .order("revision_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio latest revision", error);
  return data?.revision_no ?? 0;
};

export const getTemplateStudioCurrentDocument = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioDocumentRecord | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioDocumentRow>("template_studio_documents")
    .select(TEMPLATE_STUDIO_DOCUMENT_COLUMNS)
    .eq("template_id", templateId)
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio document", error);
  return data ? toDocumentRecord(data) : null;
};

export const getTemplateStudioDraft = async (
  templateId: string,
  userId: number,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioDraftRecord | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioDraftRow>("template_studio_document_drafts")
    .select(TEMPLATE_STUDIO_DRAFT_COLUMNS)
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio draft", error);
  return data ? toDraftRecord(data) : null;
};

export const saveTemplateStudioDraft = async (
  input: {
    templateId: string;
    userId: number;
    document: StudioTemplateDocument;
    runtimeValues: StudioRuntimeValues;
    baseRevisionNo?: number | null;
    isAutosave?: boolean;
  },
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioDraftRecord> => {
  const prepared = validateTemplateStudioDocumentForPersistence(
    input.document,
    input.runtimeValues,
  );
  if (!prepared.ok) {
    throw new TemplateStudioPersistenceError(prepared.message);
  }

  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioDraftRow>("template_studio_document_drafts")
    .upsert(
      {
        template_id: input.templateId,
        user_id: input.userId,
        document_version: STUDIO_TEMPLATE_DOCUMENT_VERSION,
        document: toJson(prepared.document),
        runtime_values: toJson(prepared.runtimeValues),
        base_revision_no: input.baseRevisionNo ?? null,
        is_autosave: input.isAutosave ?? true,
      },
      {
        onConflict: "template_id,user_id",
      },
    )
    .select(TEMPLATE_STUDIO_DRAFT_COLUMNS)
    .single();

  throwOnError("Failed to save Template Studio draft", error);
  if (!data) {
    throw new TemplateStudioPersistenceError(
      "Failed to save Template Studio draft: empty response",
    );
  }

  return toDraftRecord(data);
};

export const deleteTemplateStudioDraft = async (
  templateId: string,
  userId: number,
  client?: TemplateStudioPersistenceClient,
): Promise<void> => {
  const supabase = getClient(client);
  const { error } = await supabase
    .from("template_studio_document_drafts")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", userId);

  throwOnError("Failed to delete Template Studio draft", error);
};

export const getTemplateStudioUserState = async (
  templateId: string,
  userId: number,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioUserStateRecord | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioUserStateRow>("template_studio_user_states")
    .select(TEMPLATE_STUDIO_USER_STATE_COLUMNS)
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio user state", error);
  return data ? toUserStateRecord(data) : null;
};

export const saveTemplateStudioUserState = async (
  input: {
    templateId: string;
    userId: number;
    runtimeValues: StudioRuntimeValues;
    baseRevisionNo: number | null;
  },
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioUserStateRecord> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioUserStateRow>("template_studio_user_states")
    .upsert(
      {
        template_id: input.templateId,
        user_id: input.userId,
        base_revision_no: input.baseRevisionNo,
        runtime_values: toJson(input.runtimeValues),
      },
      {
        onConflict: "template_id,user_id",
      },
    )
    .select(TEMPLATE_STUDIO_USER_STATE_COLUMNS)
    .single();

  throwOnError("Failed to save Template Studio user state", error);
  if (!data) {
    throw new TemplateStudioPersistenceError(
      "Failed to save Template Studio user state: empty response",
    );
  }

  return toUserStateRecord(data);
};

export const publishTemplateStudioDocument = async (
  input: {
    templateId: string;
    userId: number;
    document: StudioTemplateDocument;
    runtimeValues: StudioRuntimeValues;
    source?: TemplateStudioRevisionSource;
    deleteDraft?: boolean;
  },
  client?: TemplateStudioPersistenceClient,
): Promise<{
  revisionNo: number;
  document: TemplateStudioDocumentRecord;
}> => {
  const prepared = validateTemplateStudioDocumentForPersistence(
    input.document,
    input.runtimeValues,
  );
  if (!prepared.ok) {
    throw new TemplateStudioPersistenceError(prepared.message);
  }

  const supabase = getClient(client);
  const { data: revisionNo, error } = await supabase.rpc<number>(
    "publish_template_studio_document",
    {
      p_template_id: input.templateId,
      p_document_version: STUDIO_TEMPLATE_DOCUMENT_VERSION,
      p_document: toJson(prepared.document),
      p_runtime_values: toJson(prepared.runtimeValues),
      p_created_by: input.userId,
      p_source: input.source ?? "publish",
    },
  );

  throwOnError("Failed to publish Template Studio document", error);
  if (!revisionNo) {
    throw new TemplateStudioPersistenceError(
      "Failed to publish Template Studio document: empty revision number",
    );
  }

  if (input.deleteDraft) {
    await deleteTemplateStudioDraft(input.templateId, input.userId, supabase);
  }

  const document = await getTemplateStudioCurrentDocument(
    input.templateId,
    supabase,
  );
  if (!document) {
    throw new TemplateStudioPersistenceError(
      "Failed to publish Template Studio document: current document not found",
    );
  }

  return {
    revisionNo,
    document,
  };
};

export const listTemplateStudioRevisions = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioRevisionRecord[]> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioRevisionRow[]>("template_studio_document_revisions")
    .select(TEMPLATE_STUDIO_REVISION_COLUMNS)
    .eq("template_id", templateId)
    .order("revision_no", { ascending: false });

  throwOnError("Failed to list Template Studio revisions", error);
  return (data ?? []).map(toRevisionRecord);
};

export const listTemplateStudioAssetMetadata = async (
  templateId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioAssetRecord[]> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioAssetRow[]>("template_studio_assets")
    .select(TEMPLATE_STUDIO_ASSET_COLUMNS)
    .eq("template_id", templateId)
    .order("updated_at", { ascending: false });

  throwOnError("Failed to list Template Studio asset metadata", error);
  return (data ?? []).map(toAssetRecord);
};

export const getTemplateStudioAssetMetadata = async (
  templateId: string,
  assetId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioAssetRecord | null> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioAssetRow>("template_studio_assets")
    .select(TEMPLATE_STUDIO_ASSET_COLUMNS)
    .eq("template_id", templateId)
    .eq("asset_id", assetId)
    .maybeSingle();

  throwOnError("Failed to fetch Template Studio asset metadata", error);
  return data ? toAssetRecord(data) : null;
};

export const upsertTemplateStudioAssetMetadata = async (
  input: {
    templateId: string;
    assetId: string;
    storageProvider?: string | null;
    storagePath: string;
    publicUrl?: string | null;
    contentHash?: string | null;
    mimeType: string;
    width?: number | null;
    height?: number | null;
    byteSize?: number | null;
    createdBy?: number | null;
    lastSyncedAt?: string | null;
  },
  client?: TemplateStudioPersistenceClient,
): Promise<TemplateStudioAssetRecord> => {
  const supabase = getClient(client);
  const { data, error } = await supabase
    .from<TemplateStudioAssetRow>("template_studio_assets")
    .upsert(
      {
        template_id: input.templateId,
        asset_id: input.assetId,
        storage_provider: input.storageProvider ?? null,
        storage_path: input.storagePath,
        public_url: input.publicUrl ?? null,
        content_hash: input.contentHash ?? null,
        mime_type: input.mimeType,
        width: input.width ?? null,
        height: input.height ?? null,
        byte_size: input.byteSize ?? null,
        created_by: input.createdBy ?? null,
        last_synced_at: input.lastSyncedAt ?? null,
      },
      {
        onConflict: "template_id,asset_id",
      },
    )
    .select(TEMPLATE_STUDIO_ASSET_COLUMNS)
    .single();

  throwOnError("Failed to upsert Template Studio asset metadata", error);
  if (!data) {
    throw new TemplateStudioPersistenceError(
      "Failed to upsert Template Studio asset metadata: empty response",
    );
  }

  return toAssetRecord(data);
};

export const deleteTemplateStudioAssetMetadata = async (
  templateId: string,
  assetId: string,
  client?: TemplateStudioPersistenceClient,
): Promise<void> => {
  const supabase = getClient(client);
  const { error } = await supabase
    .from("template_studio_assets")
    .delete()
    .eq("template_id", templateId)
    .eq("asset_id", assetId);

  throwOnError("Failed to delete Template Studio asset metadata", error);
};

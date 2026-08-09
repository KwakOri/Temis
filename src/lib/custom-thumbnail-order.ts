import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { Tables, TablesInsert } from "@/types/supabase";
import type {
  ThumbnailCustomOrder,
  ThumbnailCustomOrderFile,
  ThumbnailCustomOrderStatus,
  ThumbnailOrderFileRole,
} from "@/types/customThumbnailOrder";

export const THUMBNAIL_CANVAS_4K = {
  width: 3840,
  height: 2160,
} as const;

const THUMBNAIL_ORDER_OPTION = "custom_thumbnail_orders";
const PRICING_READY_ENV = "THUMBNAIL_CUSTOM_ORDER_PRICING_READY";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_MAX_SIZE = 10 * 1000 * 1000;
const REFERENCE_MAX_SIZE = 100 * 1000 * 1000;
const SOURCE_MAX_COUNT = 5;
const REFERENCE_MAX_COUNT = 10;

const THUMBNAIL_ORDER_STATUSES: ThumbnailCustomOrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const SOURCE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REFERENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export class ThumbnailOrderApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ThumbnailOrderApiError";
    this.status = status;
  }
}

export interface ParsedThumbnailOrderPayload {
  contact: string;
  purpose: string;
  requirements: string;
  textRequirements: string;
  imageRequirements: string;
  designKeywords: string;
  requestedDeadline: string | null;
  portfolioConsent: boolean;
  depositorName: string;
  priceOptionId: string;
  sourceFileIds: string[];
  referenceFileIds: string[];
}

export interface ParsedThumbnailOrderUpdate {
  contact?: string;
  purpose?: string;
  requirements?: string;
  textRequirements?: string;
  imageRequirements?: string;
  designKeywords?: string;
  requestedDeadline?: string | null;
  portfolioConsent?: boolean;
  depositorName?: string;
  priceOptionId?: string;
  sourceFileIds?: string[];
  referenceFileIds?: string[];
}

export interface ThumbnailOrderIntakeStatus {
  accepting: boolean;
  pricingReady: boolean;
  message: string;
}

export interface ListThumbnailOrdersOptions {
  userId?: number;
  id?: string;
  status?: string | null;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "deadline";
  sortOrder?: "asc" | "desc";
}

export interface ListThumbnailOrdersResult {
  orders: ThumbnailCustomOrder[];
  total: number;
}

type StoredFile = Pick<
  Tables<"files">,
  | "id"
  | "file_key"
  | "original_name"
  | "file_size"
  | "mime_type"
  | "created_at"
  | "created_by"
>;

type StoredOrder = Tables<"custom_thumbnail_orders">;

type StoredUser = Pick<Tables<"users">, "id" | "name" | "email">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (
  payload: Record<string, unknown>,
  key: string,
  options: { required?: boolean; maxLength?: number } = {},
): string => {
  const value = payload[key];
  if (typeof value !== "string") {
    if (!options.required && (value === undefined || value === null)) {
      return "";
    }
    throw new ThumbnailOrderApiError(`${key} 항목은 문자열이어야 합니다.`);
  }

  const normalized = value.trim();
  if (options.required && !normalized) {
    throw new ThumbnailOrderApiError(`${key} 항목이 필요합니다.`);
  }
  if (options.maxLength && normalized.length > options.maxLength) {
    throw new ThumbnailOrderApiError(
      `${key} 항목은 ${options.maxLength}자 이하여야 합니다.`,
    );
  }
  return normalized;
};

const readOptionalDate = (
  payload: Record<string, unknown>,
  key: string,
): string | null => {
  const value = payload[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new ThumbnailOrderApiError(
      `${key} 항목은 YYYY-MM-DD 형식이어야 합니다.`,
    );
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ThumbnailOrderApiError(`${key} 항목의 날짜가 유효하지 않습니다.`);
  }
  return value;
};

const readBoolean = (
  payload: Record<string, unknown>,
  key: string,
  required: boolean,
): boolean | undefined => {
  const value = payload[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "boolean") {
    throw new ThumbnailOrderApiError(
      `${key} 항목은 true 또는 false여야 합니다.`,
    );
  }
  return value;
};

const readUuidArray = (
  payload: Record<string, unknown>,
  key: string,
  maxCount: number,
  optional: boolean,
): string[] | undefined => {
  const value = payload[key];
  if (value === undefined && optional) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ThumbnailOrderApiError(
      `${key} 항목은 파일 ID 배열이어야 합니다.`,
    );
  }
  if (value.length > maxCount) {
    throw new ThumbnailOrderApiError(
      `${key} 파일은 최대 ${maxCount}개까지 첨부할 수 있습니다.`,
    );
  }
  const ids = value.map((item) => item.trim());
  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    throw new ThumbnailOrderApiError(
      `${key} 항목에 유효하지 않은 파일 ID가 있습니다.`,
    );
  }
  if (new Set(ids).size !== ids.length) {
    throw new ThumbnailOrderApiError(
      `${key} 항목에 중복된 파일 ID가 있습니다.`,
    );
  }
  return ids;
};

const validateCanvas = (payload: Record<string, unknown>) => {
  if (payload.canvas === undefined) return;
  if (!isRecord(payload.canvas)) {
    throw new ThumbnailOrderApiError("canvas 항목이 유효하지 않습니다.");
  }
  if (
    payload.canvas.width !== THUMBNAIL_CANVAS_4K.width ||
    payload.canvas.height !== THUMBNAIL_CANVAS_4K.height
  ) {
    throw new ThumbnailOrderApiError(
      "썸네일 주문제작 기본 규격은 3840 × 2160(16:9)입니다.",
    );
  }
};

export const parseThumbnailOrderPayload = (
  body: unknown,
): ParsedThumbnailOrderPayload => {
  if (!isRecord(body)) {
    throw new ThumbnailOrderApiError("요청 본문이 필요합니다.");
  }

  validateCanvas(body);
  const priceOptionId = readString(body, "priceOptionId", {
    required: true,
    maxLength: 100,
  });
  if (!UUID_PATTERN.test(priceOptionId)) {
    throw new ThumbnailOrderApiError("유효하지 않은 썸네일 가격 옵션입니다.");
  }
  const portfolioConsent = readBoolean(body, "portfolioConsent", true);
  const sourceFileIds =
    readUuidArray(body, "sourceFileIds", SOURCE_MAX_COUNT, false) ?? [];
  const referenceFileIds =
    readUuidArray(body, "referenceFileIds", REFERENCE_MAX_COUNT, false) ?? [];

  if (
    new Set([...sourceFileIds, ...referenceFileIds]).size !==
    sourceFileIds.length + referenceFileIds.length
  ) {
    throw new ThumbnailOrderApiError(
      "같은 파일을 source와 reference에 중복 연결할 수 없습니다.",
    );
  }

  return {
    contact: readString(body, "contact", { required: true, maxLength: 500 }),
    purpose: readString(body, "purpose", { required: true, maxLength: 500 }),
    requirements: readString(body, "requirements", {
      required: true,
      maxLength: 10_000,
    }),
    textRequirements: readString(body, "textRequirements", {
      maxLength: 5_000,
    }),
    imageRequirements: readString(body, "imageRequirements", {
      maxLength: 5_000,
    }),
    designKeywords: readString(body, "designKeywords", { maxLength: 1_000 }),
    requestedDeadline: readOptionalDate(body, "requestedDeadline"),
    portfolioConsent: portfolioConsent as boolean,
    depositorName: readString(body, "depositorName", {
      required: true,
      maxLength: 200,
    }),
    priceOptionId,
    sourceFileIds,
    referenceFileIds,
  };
};

export const parseThumbnailOrderUpdate = (
  body: unknown,
): ParsedThumbnailOrderUpdate => {
  if (!isRecord(body)) {
    throw new ThumbnailOrderApiError("요청 본문이 필요합니다.");
  }

  validateCanvas(body);
  const priceOptionId =
    body.priceOptionId === undefined
      ? undefined
      : readString(body, "priceOptionId", { required: true, maxLength: 100 });
  if (priceOptionId && !UUID_PATTERN.test(priceOptionId)) {
    throw new ThumbnailOrderApiError("유효하지 않은 썸네일 가격 옵션입니다.");
  }
  const sourceFileIds = readUuidArray(
    body,
    "sourceFileIds",
    SOURCE_MAX_COUNT,
    true,
  );
  const referenceFileIds = readUuidArray(
    body,
    "referenceFileIds",
    REFERENCE_MAX_COUNT,
    true,
  );

  if (
    sourceFileIds &&
    referenceFileIds &&
    new Set([...sourceFileIds, ...referenceFileIds]).size !==
      sourceFileIds.length + referenceFileIds.length
  ) {
    throw new ThumbnailOrderApiError(
      "같은 파일을 source와 reference에 중복 연결할 수 없습니다.",
    );
  }

  return {
    contact:
      body.contact === undefined
        ? undefined
        : readString(body, "contact", { required: true, maxLength: 500 }),
    purpose:
      body.purpose === undefined
        ? undefined
        : readString(body, "purpose", { required: true, maxLength: 500 }),
    requirements:
      body.requirements === undefined
        ? undefined
        : readString(body, "requirements", {
            required: true,
            maxLength: 10_000,
          }),
    textRequirements:
      body.textRequirements === undefined
        ? undefined
        : readString(body, "textRequirements", { maxLength: 5_000 }),
    imageRequirements:
      body.imageRequirements === undefined
        ? undefined
        : readString(body, "imageRequirements", { maxLength: 5_000 }),
    designKeywords:
      body.designKeywords === undefined
        ? undefined
        : readString(body, "designKeywords", { maxLength: 1_000 }),
    requestedDeadline:
      body.requestedDeadline === undefined
        ? undefined
        : readOptionalDate(body, "requestedDeadline"),
    portfolioConsent: readBoolean(body, "portfolioConsent", false),
    depositorName:
      body.depositorName === undefined
        ? undefined
        : readString(body, "depositorName", { required: true, maxLength: 200 }),
    priceOptionId,
    sourceFileIds,
    referenceFileIds,
  };
};

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

export const isThumbnailOrderStatus = (
  value: unknown,
): value is ThumbnailCustomOrderStatus =>
  typeof value === "string" &&
  THUMBNAIL_ORDER_STATUSES.includes(value as ThumbnailCustomOrderStatus);

export const getThumbnailOrderIntakeStatus =
  async (): Promise<ThumbnailOrderIntakeStatus> => {
    const { data, error } = await supabaseAdminServer
      .from("admin_options")
      .select("is_enabled")
      .eq("category", "general")
      .eq("value", THUMBNAIL_ORDER_OPTION)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const pricingReady = process.env[PRICING_READY_ENV] === "true";
    const accepting = Boolean(data?.is_enabled && pricingReady);

    return {
      accepting,
      pricingReady,
      message: accepting
        ? "썸네일 주문제작 신청이 가능합니다."
        : data?.is_enabled && !pricingReady
          ? "가격·추가 옵션·수정 정책 확정 전이라 실제 신청은 준비 중입니다."
          : "현재 썸네일 주문제작 접수가 준비 중입니다.",
    };
  };

export const assertThumbnailOrderSubmissionEnabled =
  async (): Promise<void> => {
    const status = await getThumbnailOrderIntakeStatus();
    if (!status.accepting) {
      throw new ThumbnailOrderApiError(status.message, 409);
    }
  };

export const getEnabledThumbnailPriceOption = async (priceOptionId: string) => {
  const { data, error } = await supabaseAdminServer
    .from("price_options")
    .select("id, label, price")
    .eq("id", priceOptionId)
    .eq("category", "thumbnail")
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ThumbnailOrderApiError(
      "선택한 썸네일 가격 옵션을 사용할 수 없습니다.",
      409,
    );
  }

  return data;
};

const validateFilesForRole = (
  files: StoredFile[],
  role: Exclude<ThumbnailOrderFileRole, "deliverable">,
) => {
  const allowedMimeTypes =
    role === "source" ? SOURCE_MIME_TYPES : REFERENCE_MIME_TYPES;
  const maxSize = role === "source" ? SOURCE_MAX_SIZE : REFERENCE_MAX_SIZE;

  for (const file of files) {
    if (file.file_size > maxSize || !allowedMimeTypes.has(file.mime_type)) {
      throw new ThumbnailOrderApiError(
        `${role} 파일 중 허용되지 않는 형식 또는 용량의 파일이 있습니다.`,
      );
    }
  }
};

export const assertOwnedThumbnailFiles = async (
  userId: number,
  sourceFileIds: string[],
  referenceFileIds: string[],
): Promise<StoredFile[]> => {
  const allIds = [...sourceFileIds, ...referenceFileIds];
  if (allIds.length === 0) return [];

  const { data, error } = await supabaseAdminServer
    .from("files")
    .select(
      "id, file_key, original_name, file_size, mime_type, created_at, created_by",
    )
    .in("id", allIds);

  if (error) throw error;
  if (!data || data.length !== allIds.length) {
    throw new ThumbnailOrderApiError(
      "존재하지 않는 첨부파일이 포함되어 있습니다.",
      403,
    );
  }

  if (data.some((file) => file.created_by !== userId)) {
    throw new ThumbnailOrderApiError(
      "본인이 업로드한 파일만 썸네일 주문에 연결할 수 있습니다.",
      403,
    );
  }

  const sourceFiles = data.filter((file) => sourceFileIds.includes(file.id));
  const referenceFiles = data.filter((file) =>
    referenceFileIds.includes(file.id),
  );
  validateFilesForRole(sourceFiles, "source");
  validateFilesForRole(referenceFiles, "reference");
  return data;
};

export const replaceThumbnailOrderFileLinks = async (input: {
  orderId: string;
  sourceFileIds?: string[];
  referenceFileIds?: string[];
}) => {
  const roles: Exclude<ThumbnailOrderFileRole, "deliverable">[] = [];
  if (input.sourceFileIds !== undefined) roles.push("source");
  if (input.referenceFileIds !== undefined) roles.push("reference");
  if (roles.length === 0) return;

  const { error: deleteError } = await supabaseAdminServer
    .from("custom_thumbnail_order_files")
    .delete()
    .eq("order_id", input.orderId)
    .in("role", roles);
  if (deleteError) throw deleteError;

  const links: TablesInsert<"custom_thumbnail_order_files">[] = [];
  for (const fileId of input.sourceFileIds ?? []) {
    links.push({ order_id: input.orderId, file_id: fileId, role: "source" });
  }
  for (const fileId of input.referenceFileIds ?? []) {
    links.push({ order_id: input.orderId, file_id: fileId, role: "reference" });
  }

  if (links.length === 0) return;
  const { error: insertError } = await supabaseAdminServer
    .from("custom_thumbnail_order_files")
    .insert(links);
  if (insertError) throw insertError;
};

const toThumbnailOrder = (
  row: StoredOrder,
  files?: ThumbnailCustomOrderFile[],
  user?: StoredUser,
): ThumbnailCustomOrder => ({
  ...row,
  status: row.status as ThumbnailCustomOrderStatus,
  canvas_width: 3840,
  canvas_height: 2160,
  ...(files ? { files } : {}),
  ...(user ? { users: user } : {}),
});

const getFilesByOrderIds = async (
  orderIds: string[],
): Promise<Map<string, ThumbnailCustomOrderFile[]>> => {
  const result = new Map<string, ThumbnailCustomOrderFile[]>();
  if (orderIds.length === 0) return result;

  const { data: links, error: linksError } = await supabaseAdminServer
    .from("custom_thumbnail_order_files")
    .select("order_id, file_id, role, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  if (linksError) throw linksError;
  if (!links || links.length === 0) return result;

  const fileIds = [...new Set(links.map((link) => link.file_id))];
  const { data: files, error: filesError } = await supabaseAdminServer
    .from("files")
    .select("id, file_key, original_name, file_size, mime_type, created_at")
    .in("id", fileIds);
  if (filesError) throw filesError;

  const filesById = new Map((files ?? []).map((file) => [file.id, file]));
  for (const link of links) {
    const file = filesById.get(link.file_id);
    const item: ThumbnailCustomOrderFile = {
      order_id: link.order_id,
      file_id: link.file_id,
      role: link.role as ThumbnailOrderFileRole,
      created_at: link.created_at,
      id: `${link.order_id}:${link.file_id}:${link.role}`,
      file: file ?? null,
    };
    const current = result.get(link.order_id) ?? [];
    current.push(item);
    result.set(link.order_id, current);
  }
  return result;
};

const getUsersByIds = async (
  userIds: number[],
): Promise<Map<number, StoredUser>> => {
  const result = new Map<number, StoredUser>();
  if (userIds.length === 0) return result;

  const { data, error } = await supabaseAdminServer
    .from("users")
    .select("id, name, email")
    .in("id", userIds);
  if (error) throw error;
  for (const user of data ?? []) result.set(user.id, user);
  return result;
};

export const listThumbnailOrders = async (
  options: ListThumbnailOrdersOptions = {},
): Promise<ListThumbnailOrdersResult> => {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const sortBy = options.sortBy ?? "created_at";
  const ascending = options.sortOrder === "asc";

  let query = supabaseAdminServer
    .from("custom_thumbnail_orders")
    .select("*", { count: "exact" })
    .order(sortBy, { ascending });

  if (options.userId !== undefined) query = query.eq("user_id", options.userId);
  if (options.id) query = query.eq("id", options.id);
  if (
    options.status &&
    options.status !== "all" &&
    options.status !== "default"
  ) {
    query = query.eq("status", options.status);
  } else if (options.status === "default") {
    query = query.not("status", "in", '("completed","cancelled")');
  }

  if (options.id) {
    query = query.limit(1);
  } else {
    query = query.range((page - 1) * limit, page * limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const fileMap = await getFilesByOrderIds(rows.map((row) => row.id));
  const userMap = await getUsersByIds([
    ...new Set(rows.map((row) => row.user_id)),
  ]);

  return {
    orders: rows.map((row) =>
      toThumbnailOrder(
        row,
        fileMap.get(row.id) ?? [],
        userMap.get(row.user_id),
      ),
    ),
    total: count ?? rows.length,
  };
};

export const getThumbnailOrderById = async (
  orderId: string,
): Promise<ThumbnailCustomOrder | null> => {
  const result = await listThumbnailOrders({ id: orderId, limit: 1 });
  return result.orders[0] ?? null;
};

export const getThumbnailOrderUser = (order: ThumbnailCustomOrder): number =>
  order.user_id;

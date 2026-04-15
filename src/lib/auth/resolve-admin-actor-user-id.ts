import { JWTPayload } from "@/lib/auth/jwt";
import { supabase } from "@/lib/supabase";

type ResolveAdminActorUserIdResult =
  | {
      ok: true;
      userId: number;
      source: "token-user-id" | "token-email";
    }
  | {
      ok: false;
      reason: "invalid-token-user-id" | "user-not-found";
    };

export const resolveAdminActorUserId = async (
  user: JWTPayload
): Promise<ResolveAdminActorUserIdResult> => {
  const tokenUserId = Number(user.userId);
  if (!Number.isFinite(tokenUserId)) {
    return {
      ok: false,
      reason: "invalid-token-user-id",
    };
  }

  const { data: userById, error: userByIdError } = await supabase
    .from("users")
    .select("id")
    .eq("id", tokenUserId)
    .maybeSingle();

  if (userByIdError) {
    throw userByIdError;
  }
  if (userById?.id) {
    return {
      ok: true,
      userId: Number(userById.id),
      source: "token-user-id",
    };
  }

  const tokenEmail = typeof user.email === "string" ? user.email.trim() : "";
  if (!tokenEmail) {
    return {
      ok: false,
      reason: "user-not-found",
    };
  }

  const { data: userByEmail, error: userByEmailError } = await supabase
    .from("users")
    .select("id")
    .eq("email", tokenEmail)
    .maybeSingle();

  if (userByEmailError) {
    throw userByEmailError;
  }
  if (!userByEmail?.id) {
    return {
      ok: false,
      reason: "user-not-found",
    };
  }

  return {
    ok: true,
    userId: Number(userByEmail.id),
    source: "token-email",
  };
};


/**
 * Legacy route alias. Canonical asset bytes are uploaded directly to R2 via
 * the presign route; this endpoint only accepts the resulting metadata sync
 * payload.
 */
export { POST } from "../sync/route";

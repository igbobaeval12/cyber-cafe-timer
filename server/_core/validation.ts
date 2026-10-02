export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

export function normalizePositiveInteger(value: number | string | null | undefined, fallback: number): number {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
  return fallback;
}

export function normalizeDateInput(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function createApiErrorPayload(message: string, code = "INTERNAL_SERVER_ERROR", requestId?: string) {
  return {
    success: false,
    error: message,
    code,
    ...(requestId ? { requestId } : {}),
  };
}

export function getRequestId(req: { headers?: Record<string, unknown> } | undefined, res: { getHeader?: (name: string) => unknown } | undefined) {
  const headerValue = req?.headers?.["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim()) return headerValue;
  const resHeaderValue = res?.getHeader?.("x-request-id");
  if (typeof resHeaderValue === "string" && resHeaderValue.trim()) return resHeaderValue;
  return undefined;
}

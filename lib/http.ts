import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";

export const MAX_JSON_BYTES = 256 * 1024;

export function validObjectId(id: string) {
  return isValidObjectId(id);
}

/** Parse small JSON request bodies before allocating unbounded input. */
export async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) return { error: NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 }) } as const;
  try {
    const raw = await request.text();
    if (raw.length > MAX_JSON_BYTES) return { error: NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 }) } as const;
    return { data: JSON.parse(raw) as unknown } as const;
  } catch { return { error: NextResponse.json({ error: "JSON invalide." }, { status: 400 }) } as const; }
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

import { NextResponse } from "next/server";
import { ContactMessageModel } from "@/lib/db/models";
import { connectToDatabase } from "@/lib/db/client";
import { contactMessageSchema } from "@/lib/validation";
import { clientIp, readJson } from "@/lib/http";
import { slidingWindow } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!slidingWindow(`contact:${clientIp(request)}`, 5, 15 * 60 * 1000)) return NextResponse.json({ error: "Trop de messages. Réessayez plus tard." }, { status: 429 });
  const json = await readJson(request);
  if ("error" in json) return json.error;
  const parsed = contactMessageSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 201 });
  try { await connectToDatabase(); await ContactMessageModel.create({ ...parsed.data, userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? "" }); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Le message n'a pas pu être enregistré." }, { status: 503 }); }
}

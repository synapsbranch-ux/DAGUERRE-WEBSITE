import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
function configured() { return Boolean(process.env.MONGODB_URI && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL); }
export async function GET(request: Request) { if (!configured()) return NextResponse.json({ error: "Authentification non configurée." }, { status: 503 }); return toNextJsHandler(getAuth()).GET(request); }
export async function POST(request: Request) { if (!configured()) return NextResponse.json({ error: "Authentification non configurée." }, { status: 503 }); return toNextJsHandler(getAuth()).POST(request); }

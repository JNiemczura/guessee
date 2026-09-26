import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { EDITOR_COOKIE, keyMatches } from "@/server/editorAuth";

export async function POST(request: Request) {
  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!keyMatches(body.key)) {
    return NextResponse.json({ error: "That key is not correct." }, { status: 401 });
  }

  const store = await cookies();
  store.set(EDITOR_COOKIE, String(body.key), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}

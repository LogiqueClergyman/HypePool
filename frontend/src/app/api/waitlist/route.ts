import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");

async function readEntries(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeEntries(entries: string[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== "string"
  ) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const email = ((body as Record<string, unknown>).email as string).trim().toLowerCase();

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 422 });
  }

  const entries = await readEntries();

  if (entries.includes(email)) {
    return NextResponse.json({ message: "You're already on the waitlist!" }, { status: 409 });
  }

  entries.push(email);
  await writeEntries(entries);

  return NextResponse.json({ ok: true }, { status: 201 });
}

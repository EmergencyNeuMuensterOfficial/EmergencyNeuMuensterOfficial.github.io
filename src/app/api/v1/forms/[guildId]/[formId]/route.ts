import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Filter, Document } from "mongodb";
import { connectDb, COLLECTIONS } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const QUESTION_TYPES = ["text", "paragraph", "number", "boolean", "choice"] as const;

type Answer = {
  questionId: string;
  label: string;
  type: string;
  value: unknown;
};

function normalize(value: unknown, type: string): string {
  if (type === "boolean") {
    return value === "Yes" || value === true || value === "true" ? "Yes" : "No";
  }
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : String(value ?? "");
  }
  return value == null ? "" : String(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; formId: string }> }
) {
  const { guildId, formId } = await params;
  const db = await connectDb();
  const doc = await db
    .collection(COLLECTIONS.applicationForms)
    .findOne({ guildId: String(guildId), _id: String(formId) } as unknown as Filter<Document>, { projection: { questions: 1, name: 1, title: 1, description: 1 } });

  if (!doc) {
    return NextResponse.json({ ok: false, error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: { questionCount: Array.isArray(doc.questions) ? doc.questions.length : 0 } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; formId: string }> }
) {
  const { guildId, formId } = await params;

  let body: { answers?: Answer[]; respondent?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) {
    return NextResponse.json({ ok: false, error: "No answers provided." }, { status: 400 });
  }

  const db = await connectDb();
  const form = await db
    .collection(COLLECTIONS.applicationForms)
    .findOne({ guildId: String(guildId), _id: String(formId) } as unknown as Filter<Document>);

  if (!form) {
    return NextResponse.json({ ok: false, error: "Form not found" }, { status: 404 });
  }

  const questions = Array.isArray(form.questions) ? (form.questions as Array<Record<string, unknown>>) : [];
  const byId = new Map(questions.map((q) => [String(q.id), q]));

  const stored: Answer[] = [];
  for (const q of questions) {
    const qid = String(q.id);
    const type = String(q.type ?? "text");
    const incoming = answers.find((a) => String(a.questionId) === qid);
    const raw = incoming ? incoming.value : "";
    const value = normalize(raw, type);

    if (q.required === true && String(value).trim() === "") {
      return NextResponse.json(
        { ok: false, error: `Missing required answer: ${q.label ?? qid}` },
        { status: 400 }
      );
    }

    if (type === "choice") {
      const options = Array.isArray(q.options) ? q.options.map(String) : [];
      if (value && !options.includes(value)) {
        return NextResponse.json(
          { ok: false, error: `Invalid choice for: ${q.label ?? qid}` },
          { status: 400 }
        );
      }
    }

    stored.push({
      questionId: qid,
      label: String(q.label ?? qid),
      type,
      value,
    });
  }

  const now = new Date();
  const doc = {
    _id: randomUUID(),
    guildId: String(guildId),
    formId: String(formId),
    answers: stored,
    respondent: body.respondent ? String(body.respondent).slice(0, 100) : null,
    createdAt: now,
  };

  await db.collection(COLLECTIONS.formSubmissions).insertOne(doc as unknown as Document);

  return NextResponse.json({ ok: true, data: { id: String(doc._id) } });
}

import { notFound } from "next/navigation";
import type { Filter, Document } from "mongodb";
import { connectDb, COLLECTIONS } from "@/lib/mongo";
import { FormView } from "@/components/FormView";

export const dynamic = "force-dynamic";

type Params = { guildId: string; formId: string };

async function loadForm(guildId: string, formId: string) {
  const db = await connectDb();
  const doc = await db
    .collection(COLLECTIONS.applicationForms)
    .findOne({ guildId: String(guildId), _id: String(formId) } as unknown as Filter<Document>);
  if (!doc) return null;

  const out = { ...doc } as Record<string, unknown>;
  if (out._id != null && out.formId == null) out.formId = String(out._id);
  delete out._id;

  return {
    guildId: String(guildId),
    formId: String(out.formId ?? formId),
    name: String(out.name ?? "Form"),
    title: String(out.title ?? out.name ?? "Form"),
    description: out.description ? String(out.description) : null,
    questions: Array.isArray(out.questions) ? (out.questions as never[]) : [],
  };
}

export default async function FormPage({ params }: { params: Promise<Params> }) {
  const { guildId, formId } = await params;
  const form = await loadForm(guildId, formId);

  if (!form) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-discord-gray/20 bg-discord-dark p-6">
        <h1 className="text-xl font-bold text-discord-white">{form.title}</h1>
        {form.description ? (
          <p className="mt-2 text-sm text-discord-lighterGray">{form.description}</p>
        ) : null}
      </div>

      <div className="mt-6">
        {form.questions.length === 0 ? (
          <p className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-6 text-center text-sm text-discord-lighterGray">
            This form has no questions yet.
          </p>
        ) : (
          <FormView form={form as never} />
        )}
      </div>

      <p className="mt-8 text-center text-xs text-discord-lightGray">
        Powered by OnboardX
      </p>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

type Question = {
  id: string;
  label: string;
  type: "text" | "paragraph" | "number" | "boolean" | "choice";
  required: boolean;
  placeholder?: string | null;
  options?: string[];
};

type FormData = {
  guildId: string;
  formId: string;
  name: string;
  title: string;
  description?: string | null;
  questions: Question[];
};

function emptyValue(type: Question["type"]) {
  if (type === "boolean") return "";
  if (type === "choice") return "";
  return "";
}

export function FormView({ form }: { form: FormData }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(form.questions.map((q) => [q.id, emptyValue(q.type)]))
  );
  const [respondent, setRespondent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredMissing = useMemo(
    () =>
      form.questions
        .filter((q) => q.required)
        .filter((q) => {
          const v = values[q.id];
          return v == null || String(v).trim() === "";
        }),
    [form.questions, values]
  );

  function setValue(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (requiredMissing.length > 0) {
      setError("Please answer all required questions.");
      return;
    }

    const answers = form.questions.map((q) => ({
      questionId: q.id,
      label: q.label,
      type: q.type,
      value: values[q.id] ?? "",
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/forms/${form.guildId}/${form.formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, respondent: respondent.trim() || null }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-discord-green/30 bg-discord-darker p-8 text-center">
        <p className="text-lg font-semibold text-discord-green">Submitted 🎉</p>
        <p className="mt-2 text-sm text-discord-lighterGray">
          Thanks! Your response to <span className="font-semibold text-discord-white">{form.name}</span> has been recorded.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {form.questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-5">
          <label className="block text-sm font-semibold text-discord-white">
            {i + 1}. {q.label}
            {q.required ? <span className="ml-1 text-discord-red">*</span> : null}
          </label>

          <div className="mt-3">
            {q.type === "text" && (
              <input
                type="text"
                value={values[q.id]}
                onChange={(e) => setValue(q.id, e.target.value)}
                placeholder={q.placeholder ?? ""}
                className="w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              />
            )}

            {q.type === "paragraph" && (
              <textarea
                value={values[q.id]}
                onChange={(e) => setValue(q.id, e.target.value)}
                placeholder={q.placeholder ?? ""}
                rows={4}
                className="w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              />
            )}

            {q.type === "number" && (
              <input
                type="number"
                value={values[q.id]}
                onChange={(e) => setValue(q.id, e.target.value)}
                placeholder={q.placeholder ?? ""}
                className="w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              />
            )}

            {q.type === "boolean" && (
              <select
                value={values[q.id]}
                onChange={(e) => setValue(q.id, e.target.value)}
                className="w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              >
                <option value="">Select…</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            )}

            {q.type === "choice" && (
              <select
                value={values[q.id]}
                onChange={(e) => setValue(q.id, e.target.value)}
                className="w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
              >
                <option value="">Select…</option>
                {(q.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-discord-gray/20 bg-discord-darker p-5">
        <label className="block text-sm font-medium text-discord-lighterGray">
          Your Discord username or ID (optional)
          <input
            type="text"
            value={respondent}
            onChange={(e) => setRespondent(e.target.value)}
            placeholder="e.g. username#0000 or 123456789012345678"
            className="mt-2 w-full rounded-2xl border border-discord-gray/40 bg-discord-dark px-3 py-2 text-sm text-discord-white outline-none transition focus:border-discord-blue"
          />
        </label>
      </div>

      {error && <p className="text-sm text-discord-red">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

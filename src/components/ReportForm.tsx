"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/clientAnalytics";
import type { ReportKind } from "@/lib/types";

const KINDS: { value: ReportKind; label: string }[] = [
  { value: "wrong_answer", label: "The accepted answer is wrong or incomplete" },
  { value: "clue_wrong", label: "A clue states something untrue" },
  { value: "clue_ambiguous", label: "A clue fits more than one answer" },
  { value: "clue_too_hard", label: "A clue is too obscure to be fair" },
  { value: "offensive", label: "Something is exclusionary or offensive" },
  { value: "other", label: "Something else" },
];

export function ReportForm({ puzzleId }: { puzzleId: string }) {
  const [kind, setKind] = useState<ReportKind>("wrong_answer");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ puzzleId, kind, message }),
      });

      if (!response.ok) {
        setState("failed");
        return;
      }

      setState("sent");
      trackEvent("report_submitted", { puzzle_id: puzzleId, report_kind: kind });
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <p className="rounded border border-positive/40 bg-positive/10 p-4" role="status">
        Thank you. The operator sees this report and can correct or retire the puzzle without
        changing results that have already been recorded.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <div>
        <label htmlFor="report-kind" className="block text-sm font-medium">
          What is wrong?
        </label>
        <select
          id="report-kind"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ReportKind)}
          className="mt-1 min-h-11 w-full rounded border border-line bg-background px-3 py-2 text-base"
        >
          {KINDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="report-message" className="block text-sm font-medium">
          Details (optional)
        </label>
        <textarea
          id="report-message"
          name="message"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
          className="mt-1 w-full rounded border border-line bg-background px-3 py-2 text-base"
        />
      </div>

      {state === "failed" ? (
        <p role="alert" className="rounded border border-negative/40 bg-negative/10 p-3 text-sm">
          That did not send. Please try again.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="min-h-11 rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90 disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}

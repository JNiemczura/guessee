"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditorLogin() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/editor/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "That key is not correct.");
        return;
      }

      router.push("/editor");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3 rounded-lg border border-line bg-surface p-5">
      <div>
        <label htmlFor="editor-key" className="block text-sm font-medium">
          Editor key
        </label>
        <input
          id="editor-key"
          name="key"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="mt-1 min-h-11 w-full rounded border border-line bg-background px-3 py-2"
        />
        <p className="mt-1 text-xs text-muted">
          Set GUESSEE_EDITOR_KEY in the environment. Accounts are out of MVP scope.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded border border-negative/40 bg-negative/10 p-3 text-sm">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-full rounded bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Open the queue"}
      </button>
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { ConsentBanner } from "@/components/ConsentBanner";
import { HUB_LABEL } from "@/lib/types";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${HUB_LABEL} — a daily guessing game`,
    template: `%s · ${HUB_LABEL}`,
  },
  // Deliberately answer-free: link previews and page titles must never leak a
  // puzzle answer, and they are shared far more widely than the board itself.
  description:
    "One short daily guessing puzzle, the same for everyone, plus practice rounds when you have finished.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:shadow"
        >
          Skip to main content
        </a>

        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {HUB_LABEL}
            </Link>
            <nav aria-label="Main">
              <ul className="flex items-center gap-1 text-sm">
                <li>
                  <Link
                    href="/play"
                    className="block rounded px-3 py-2 hover:bg-surface-sunken"
                  >
                    Today
                  </Link>
                </li>
                <li>
                  <Link
                    href="/practice"
                    className="block rounded px-3 py-2 hover:bg-surface-sunken"
                  >
                    Practice
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rules"
                    className="block rounded px-3 py-2 hover:bg-surface-sunken"
                  >
                    Rules
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 text-sm text-muted">
            <p>
              Progress is stored in this browser only. Clearing site data or switching device
              starts a fresh round.
            </p>
            <p className="mt-1">
              <Link href="/editor" className="underline">
                Editor
              </Link>
            </p>
          </div>
        </footer>

        <ConsentBanner />
      </body>
    </html>
  );
}

import Link from "next/link";

import { SCORE } from "@/lib/score";

export const metadata = {
  title: "Rules",
  description: "How a Guessee round works.",
};

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">How a round works</h1>
        <p className="mt-2 max-w-prose text-muted">
          The rules are short on purpose. They are also available from the round screen if you need
          them mid-play.
        </p>
      </header>

      <section aria-labelledby="basics-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="basics-heading" className="font-semibold">
          The loop
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>You see a category and a puzzle id before your first guess.</li>
          <li>Clue one is always visible. A wrong guess costs one attempt and unlocks the next clue.</li>
          <li>A correct guess ends the round immediately, whatever attempt it comes on.</li>
          <li>When the attempts run out, or you give up, you get the answer, why it fits, and every clue.</li>
        </ol>
      </section>

      <section aria-labelledby="input-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="input-heading" className="font-semibold">
          What counts as a valid guess
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Capitalisation, accents, and surrounding punctuation do not matter.</li>
          <li>Plurals are accepted in both directions for most answers.</li>
          <li>Extra accepted spellings are listed on the result screen.</li>
          <li>
            A near miss is treated as a wrong guess, with a &ldquo;did you mean&rdquo; note rather than
            a free win.
          </li>
          <li>Repeating a guess you have already made is rejected and never costs an attempt.</li>
          <li>Only the answers an editor has listed are accepted.</li>
        </ul>
      </section>

      <section aria-labelledby="scoring-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="scoring-heading" className="font-semibold">
          Score and hints
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Every round starts at {SCORE.base} points.</li>
          <li>Each wrong guess costs {SCORE.perIncorrectGuess} points.</li>
          <li>A hint costs {SCORE.perHint} points and no attempt.</li>
          <li>Giving up ends the round at {SCORE.floor} points.</li>
        </ul>
      </section>

      <section aria-labelledby="daily-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="daily-heading" className="font-semibold">
          Daily and practice
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>One daily puzzle for everyone, published at 00:00 UTC.</li>
          <li>An unfinished daily round resumes in the same browser after a refresh.</li>
          <li>
            Once a new day starts, the previous result stays viewable and the new puzzle opens. An
            unfinished round is closed and still gets its answer and full clue path.
          </li>
          <li>
            Any past day can be replayed with the same rules. A replay is labelled as one and never
            affects that day&rsquo;s official result.
          </li>
          <li>Practice rounds are separate again, and none of them affect the daily result.</li>
        </ul>
      </section>

      <p className="text-sm">
        <Link href="/play" className="underline">
          Back to today&rsquo;s puzzle
        </Link>
      </p>
    </div>
  );
}

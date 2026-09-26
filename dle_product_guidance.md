# Guessing Games Hub — Product Guidance

**Status:** Working draft · **Version:** 0.1 · **Updated:** 2026-09-26

This document defines the product goals and business requirements for a browser-based collection of short, interactive guessing games. It is a decision record for product design and development, not a commitment to a particular technology stack. Items marked **Proposed** need confirmation; items marked **Open** need a decision.

## 1. Current direction

| Decision | Direction | Status |
| --- | --- | --- |
| Product format | A hub of related guessing games with a recognizable daily ritual | Proposed |
| Subject matter | Mixed topics rather than a single niche | Selected |
| Main play mode | One shared daily puzzle per game, plus practice from past or separate puzzles | Selected |
| Initial interaction | Word answers guided by clues | Selected |
| First audience | People who enjoy short, casual knowledge and word challenges | Proposed |
| Launch language and market | To be chosen; English or Polish, with content edited for that language | Open |
| Brand, name, visual style | To be provided by the creator | Open |
| Business model | Free launch; decide whether funding or monetization is needed later | Proposed |

## 2. Product intent

**Vision:** Make a small, satisfying challenge people can understand immediately, finish in a few minutes, discuss without spoiling, and return to tomorrow.

**Problem to solve:** Players looking for a quick mental break often have to choose between a single daily puzzle with no extra play and an endless quiz with little shared experience. This hub should combine a common daily challenge with optional practice.

**Value proposition:** One destination for varied topics, consistent controls, clear clue feedback, and easy sharing. Each game should have its own reason to exist; simply changing a topic label does not count as a new game.

**Product principles:**

1. Play is possible immediately, without an account or tutorial wall.
2. Every guess gives useful information or reveals a meaningful clue.
3. Losing still gives a satisfying reveal and an explanation.
4. The daily puzzle is the same for the intended audience on a given day.
5. The interface works well on a phone and remains usable by keyboard and assistive technology.
6. Content quality and a reliable publishing schedule matter as much as code.

## 3. Audience and use cases

- **Casual daily player:** Opens a link, plays one short round, shares a spoiler-free result, leaves.
- **Curious repeat player:** Finishes the daily round and plays previous or separately authored practice puzzles.
- **Friend group:** Compares results for the same puzzle through a link or share card.
- **Editor/operator:** Creates, reviews, schedules, corrects, and monitors puzzles without changing application code.

Initial distribution hypothesis: organic links in chats and social posts, with a clear invitation to return tomorrow. This is a hypothesis to test, not a forecast.

## 4. Launch scope and game design

### 4.1 First game: Progressive Clues (proposed)

The player guesses a word, name, place, or item within a displayed category. A short, deliberately ordered set of clues is revealed as the round progresses. A valid guess may win immediately; an incorrect guess uses one attempt and reveals the next clue. A voluntary hint may reveal a clue early at an explicit score cost. At the end, show the answer, a short explanation, and the complete clue path.

**Candidate round configuration:** five clues, five attempts, one answer with an editorially maintained list of accepted aliases. Clue one should be broad but fair; later clues become more specific. The precise counts and scoring should be tested with sample puzzles before release.

**Distinctive hook to test:** Mixed-topic daily puzzles can rotate among categories while retaining the same guess-and-reveal loop. The category and accepted answer format are visible before the first guess.

### 4.2 Follow-on formats (candidates, not launch commitments)

| Format | Core mechanic | Reason to add it |
| --- | --- | --- |
| Category Ladder | Each correct answer unlocks a harder related clue in a short sequence | Adds progression within a round |
| Attribute Match | Guess an entity and receive structured attribute feedback | Adds deduction instead of sequential clue reveals |
| Semantic Search | Enter words and see how close their meanings are to the target | Adds open-ended exploration; requires careful language and model quality work |

Do not count multiple category skins of Progressive Clues as separate games. Add another format only after the first game has stable content production and evidence of repeat play.

### 4.3 Round rules to specify before implementation

- Valid input: case, whitespace, punctuation, diacritics, plurals, spelling variants, aliases, typos, and whether only listed answers are accepted.
- Invalid and duplicate guesses: explain why they are rejected; do not silently consume an attempt.
- Hint use: how it affects attempts, score, and share text.
- End conditions: correct guess, attempt limit, give up, and expired/interrupted round.
- Fairness: answer and clues must not rely on obscure knowledge without a reasonable path to the solution.
- Review: every published puzzle receives a human playthrough and an ambiguity check.

## 5. Functional requirements

| ID | Requirement | Priority | Acceptance outcome |
| --- | --- | --- | --- |
| BR-01 | A visitor can start the current daily game without signing in. | Must | The round opens directly from the home page on mobile and desktop. |
| BR-02 | Each game has a stable daily puzzle ID and a clearly stated reset time and time zone. | Must | Players in the same chosen daily cohort receive the same puzzle and shareable ID. |
| BR-03 | A guess is validated, recorded, and answered with clear feedback; rejected input is explained. | Must | A player can tell what happened after every submission. |
| BR-04 | A finished round shows win/loss, answer, explanation, attempts/clues used, and next daily availability. | Must | The player can understand the result without leaving the page. |
| BR-05 | A player can play past or separate practice puzzles after the daily round. | Must | Practice never changes the official daily result or exposes a future daily answer. |
| BR-06 | A player can share a result without exposing the answer or clue text by default. | Must | Copied content identifies game/date or puzzle number and outcome without spoilers. |
| BR-07 | Progress survives a normal page refresh on the same browser. | Must | The daily round resumes with the same guesses and state. |
| BR-08 | The home page shows available games, the daily status, rules, and an obvious next action. | Must | A first-time visitor can begin in one or two actions. |
| BR-09 | An editor can draft, preview, validate, schedule, and publish puzzles. | Must | The content queue can be maintained without a code deployment. |
| BR-10 | Errors and content corrections can be handled without quietly changing completed results. | Should | A correction is logged and the player receives a clear message if the puzzle is affected. |
| BR-11 | Optional cross-device account and synced stats can be added later. | Later | Anonymous play is never blocked by account creation. |
| BR-12 | Optional reminders, community features, and user-created puzzles can be explored later. | Later | No dependency on these features for launch. |

### Daily and practice behavior

Proposed default: one scheduled daily puzzle per game at **00:00 UTC**, using one global puzzle ID. This keeps the shared challenge simple across regions. Show the next reset in the player's local time. Confirm the target market before locking this choice: a local-midnight model changes which players can discuss the same puzzle at the same moment.

Practice can use a published archive or a separately labeled practice bank. Do not draw from unpublished future dailies. Preserve an unfinished daily round if the page closes; once a new day begins, provide a way to view the prior result while presenting the new puzzle.

### State and identity

For launch, store anonymous play state in the browser and treat it as device-specific. Explain that clearing browser data or switching devices can reset it. If a server verifies guesses or stores results, prevent a player from submitting a second official daily result through normal application flows; do not promise cheat-proof leaderboards for anonymous play. Define account migration only if accounts become part of scope.

## 6. Content and editorial operations

Each puzzle record should include: game ID, puzzle ID, scheduled date, language, category, canonical answer, accepted aliases, ordered clues, answer explanation, difficulty estimate, source/rights notes, status, author/reviewer, and revision history. Only publish fields needed for active play; avoid shipping future answers to the browser.

**Editorial workflow:** draft → independent review → playtest → schedule → publish → monitor → correct or retire if necessary. Maintain a buffer of at least two weeks of reviewed daily content before public launch (proposed operational target). A scheduler or publication check should alert the operator if a day's puzzle is missing.

Quality checklist: factual accuracy, solvability, unambiguous accepted answers, spelling/diacritics, clue order, localization, sensitive or exclusionary wording, third-party rights, and whether a clue accidentally contains the answer.

## 7. Experience and accessibility

- Mobile-first layout; readable text and large touch targets; no horizontal scrolling during a round.
- Keyboard-operable input, hint, share, modal, and navigation controls; visible focus and meaningful labels.
- Feedback is available in text as well as color. Announce new clues and validation errors accessibly.
- Motion, sounds, and celebrations never prevent play; honor reduced-motion preferences.
- Show rules in a concise first-play view and keep them available during play.
- Maintain a consistent design system across games while allowing each mechanic a distinct identity.
- Avoid unexpected spoilers in link previews, page titles, notifications, and share text.

## 8. Business and product goals

**Launch goal:** Prove that strangers can understand the game quickly, enjoy the outcome, and return for another daily puzzle. Revenue is not a launch success criterion unless the creator decides otherwise.

| Goal | Suggested measure | Initial decision |
| --- | --- | --- |
| First-play clarity | Share of starts that reach a valid first guess; short user-test observations | Set baseline in private playtests |
| Completion | Share of started daily rounds that end in a win, loss, or give-up | Set target after sample puzzles |
| Retention | Share of daily players returning within 7 days | Set target after launch baseline |
| Shareability | Share action rate; visits from shared links | Track without exposing guesses |
| Content reliability | Published puzzles available at reset; corrections per 100 puzzles | Aim for no missed daily releases |
| Player sentiment | Short voluntary feedback on fun, fairness, and difficulty | Review weekly during beta |

Define “start,” “finish,” “return,” and unique player consistently before adding analytics. Collect only the events needed to answer product questions; provide clear privacy information and choices appropriate to the launch market.

**Potential business paths (later):** sponsorship of the hub, light ads outside the core guessing interaction, optional subscription for extra modes, or a creator/community feature. Choose based on audience trust, operating cost, and observed demand. No paywall or ad placement should interrupt a live round in the first release.

## 9. Release boundaries

**MVP includes:** responsive hub, one Progressive Clues game, reviewed daily puzzle schedule, practice archive/bank, anonymous local progress, accessible rules and feedback, spoiler-free sharing, basic editorial workflow, simple product analytics, and a way to report a bad puzzle.

**Outside MVP:** mandatory accounts, cross-device sync, multiplayer, leaderboards, user-generated puzzles, AI-generated live clues, native apps, push notifications, multiple game formats, and monetization. These are future options, not rejected ideas.

**Nonfunctional requirements:** fast first load on an ordinary mobile connection; reliable puzzle publishing and recovery; protection of unreleased answers and editorial access; useful error monitoring; backup/export of authored puzzles; no dependence on one person's laptop to publish the daily game. Quantitative performance and availability targets should be set when hosting and audience are known.

## 10. Milestones and release gates

1. **Concept validation:** Write 15–20 sample puzzles across several categories. Test with 5–10 people unfamiliar with the project. Record first-guess confusion, completion time, fairness feedback, and preferred clue count.
2. **Playable prototype:** Implement a full round, refresh recovery, end state, rules, and mobile/keyboard flow using reviewed content.
3. **Private beta:** Run a reliable daily schedule and practice mode for at least two weeks; test content workflow, reset boundaries, sharing, analytics, and error recovery.
4. **Public launch:** Release only after the content buffer, editorial review, accessibility checks, privacy copy, and missing-puzzle alert are in place.
5. **Post-launch decision:** Review retention and player feedback before selecting the second game or monetization path.

## 11. Decisions needed from the creator

| Question | Why it matters | Suggested first choice |
| --- | --- | --- |
| What are your specific game ideas? | Determines whether Progressive Clues is the right first mechanic | List each with one example round |
| What should the product feel like visually? | Sets layout, illustration, tone, and brand voice | Share 2–3 references or adjectives |
| Which language and audience launch first? | Affects answer rules, editorial work, reset time, and distribution | Choose one primary language |
| Which topics are welcome or excluded? | Keeps content consistent and avoids unwanted surprises | Define 4–6 starting categories |
| How long should one round take? | Sets clue count, difficulty, and session design | Test a 2–5 minute target |
| How many games at launch? | Determines content and engineering load | One polished game first |
| Should daily reset be global or local? | Affects the shared puzzle and social conversation | Global 00:00 UTC until audience dictates otherwise |
| Is the goal a hobby project, portfolio piece, or business? | Changes investment, launch, and revenue priorities | State primary goal and time budget |
| Do you want to hand-author puzzles? | Determines editorial tooling and operating cost | Hand-author and review the first set |

## 12. Reference patterns, not specifications

- [Semantle FAQ](https://semantle.com/faq/) describes a daily word challenge, a playable archive, hints, and optional account-backed stats. It shows how daily play and extra play can coexist.
- [Worldle rules](https://worldle.teuteuf.fr/rules/) show a short, repeatable guess/feedback loop; its [FAQ](https://worldle.teuteuf.fr/faq/) describes local-midnight scheduling, an alternative to the proposed global reset.
- [Contexto home](https://contexto.me/) presents daily play alongside previous and unlimited games. Its structure is a useful reference for separating the official challenge from additional rounds.

These examples inform the product questions above. The games, wording, graphics, and distinctive mechanics for this project should be original.

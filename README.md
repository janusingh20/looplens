# LoopLens

A step based tracing tutor for Java `for` loop boundaries. The learner predicts every step of a short loop before Java runs it: which phase runs next, and what it does. When a prediction is off, LoopLens names the misconception behind it and explains the step with the real values.

CS6460 Educational Technology, Fall 2026.

**Live site:** the link under About on this repo's GitHub page.

## What is in Milestone 1

| Piece | Status |
| --- | --- |
| Tracing interface: code with the running part highlighted, trace table, prediction, reveal, feedback | Live |
| Orientation: the four phases (and exit) as subgoal labels, plus a two item prerequisite check | Live |
| P01 worked example with a self explanation prompt | Live |
| P02 and P03 faded examples (backward fading) | Live |
| P04 first problem on your own: pass count prediction, then phase and value for every step | Live |
| Problem bank: all 14 problems authored, every trace checked against OpenJDK | Done (see `#bank`) |
| Feedback messages for M1 to M5, plus a short explanation for every other wrong step | Done |
| Draft A3 pre test and post test, Forms A and B | Draft in `docs/A3_test_forms.md` |
| Anonymous event log | Logging in the browser now; Google Sheet endpoint is ready in `apps-script/` |
| Watch condition for the evaluation | Feature flag, `?condition=watch` |
| P05 to P09, header problems, checkpoint, pre and post test screens | Milestone 2 |

## The five misconceptions

| | Misconception | Where LoopLens catches it |
| --- | --- | --- |
| M1 | Counting passes from the upper bound, ignoring the start and the step | The pass count prediction before each problem on your own |
| M2 | Treating `<` and `<=` (or `>` and `>=`) as the same check | The check where `i` lands exactly on the bound |
| M3 | Running the phases in the wrong order | Every "what runs next?" prediction, the first value of `i`, and body values computed with the updated `i` |
| M4 | Expecting the loop variable to end at the last value the body used | The final update, and choosing "exit" right after the last body |
| M5 | Assuming the body runs at least once | A first check that is already false |

## Run it locally

Needs Node 22.12 or newer. The Java check also needs a JDK (17 or newer).

```bash
npm ci
npm run dev           # http://localhost:5173
npm test              # simulator, misconception rules, session state machine
npm run verify:java   # runs every problem on your JDK and compares the traces
npm run build         # type check and production build into dist/
```

Handy URLs while the dev server runs:

* `#bank` lists all 14 problems, the OpenJDK result for each, every feedback message, and the anonymous event log.
* `?notes` (or the **Design notes** button) shows the design notes overlay: the course concept behind each part of the screen.
* `?condition=watch` is the Watch condition: same problems and trace table, no predictions, no feedback.
* `#try-p07` opens any tracing problem from the bank directly.

Keys: in the trace table, **I**, **C**, **B**, **U**, **E** pick the phase that runs next and **T** or **F** answer a check; **Enter**, **Space**, or the right arrow steps through a worked example. The letter keys only work while focus is in the trace table. Progress survives a reload in the same tab.

## Deploy to GitHub Pages

1. Create an empty public repository named `looplens` on GitHub (no README, no license).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "LoopLens Milestone 1"
   git branch -M main
   git remote add origin https://github.com/<your-github-username>/looplens.git
   git push -u origin main
   ```

3. On GitHub, open **Settings**, then **Pages**, and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. If the first run started before step 3 and failed at the deploy job, click **Re-run all jobs**.
5. When the run is green, the site is at `https://<your-github-username>.github.io/looplens/`. The run's summary page shows the table of traces compared with OpenJDK.

Every later push to `main` runs the same checks and redeploys, but only if all traces still match real Java.

## How the Java check works

Each problem is a small spec in `src/content/problems.ts` (start value, operator, bound, update, body statement, what prints after the loop). From that one spec:

1. `src/sim/codegen.ts` writes the Java code the learner sees.
2. `src/sim/simulate.ts` produces the step by step trace the interface shows.
3. `src/sim/java.ts` wraps the exact same loop in logging probes:

   ```java
   for (int i = 2; T.check(i, i < 10, st); i += 3, T.update(i, st)) {
       sum = sum + i;
       T.body(i, st);
   }
   ```

`scripts/verify-java.ts` runs each program with the JDK's single file launcher, compares Java's transcript with the simulator's character for character, writes `public/verification.json` (shown on the problem bank page of the live site), and fails the build on any difference. As a check on the check: making the simulator treat `<` like `<=` makes P06 fail and blocks the deploy.

## How the feedback works

LoopLens is an example tracing tutor (Aleven 2009): it compares each prediction with the correct step and with authored wrong steps. The wrong steps come from five buggy rules, one per misconception, applied to the true state at every step (`src/sim/diagnose.ts`). A wrong answer that matches a buggy rule gets that misconception's message, filled in with the real values (`src/content/feedback.ts`). Any other wrong answer gets a short explanation of what that phase does. Writing each misconception once as a rule, instead of typing wrong answers for every problem, keeps all 14 problems consistent.

## Project layout

```
src/
  sim/          simulator, code generation, Java instrumentation, misconception rules, session state machine (all unit tested)
  content/      the problem bank, every feedback message, worked example explanations
  components/   code panel, trace table, answer inputs, diagrams
  screens/      start, orientation, problem, summary, problem bank
  lib/          anonymous log, routing, preferences
scripts/        verify-java.ts (OpenJDK check), export-bank.ts (docs/problem_bank.md)
apps-script/    Google Apps Script endpoint that writes events to a Google Sheet
docs/           A3 test forms, design rationale, problem bank
```

## Anonymous logging

Events are stored in the learner's browser and listed on the problem bank page (download as JSON). To also send them to a Google Sheet, deploy `apps-script/Code.gs` as described in `apps-script/README.md`, then add the web app URL as a repository variable named `LOG_URL` (**Settings**, **Secrets and variables**, **Actions**, **Variables**). The next build picks it up. No names, accounts, or IP addresses are recorded.

## Timeline

| Week of | Work | Deliverable |
| --- | --- | --- |
| Oct 19 | Problem bank, feedback messages, draft A3 forms, repository, Pages, simulator, OpenJDK check | Done |
| Oct 26 | Tracing interface and the worked example | Milestone 1: live slice |
| Nov 2 | Remaining problems, header and checkpoint problems, pre and post test screens, Sheet logging (the Watch flag is already done) | Feature complete |
| Nov 9 | Beta test with two or three classmates | Milestone 2 |
| Nov 16 | Evaluation file, feedback polish | Evaluation draft |
| Nov 23 | Buffer, report | Milestone 3 |
| Nov 30 | Report, video, instructions | Final submission |

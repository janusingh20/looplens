# Design rationale and changes since the proposal

How each part of LoopLens traces back to course concepts (citations by first author and year, as in the proposal) and to the setting constraints from the proposal (C1 short sessions, C2 no install or accounts, C3 no live help, C4 fragile prerequisites, C5 free, voluntary, and private).

## Feature to concept map

| Feature | What the learner sees | Why it is there | Sources | Constraint |
| --- | --- | --- | --- | --- |
| Trace table | Every step's phase, the loop variable, the check, the accumulator, and the output, one row per step | The table holds the state so working memory doesn't have to, and it makes the notional machine visible: three header parts that run at different times | Sweller 1998; du Boulay 1986; Sorva 2013 | C4 |
| Phase names on every step, and the running part of the code highlighted | "initialize", "check", "body", "update", "exit" with a color, a shape, and the code segment that runs | Subgoal labels: naming the step's purpose improves novice performance and transfer | Margulieux 2012; Morrison 2015 | C4 |
| Predict before reveal | The learner fills in the next cell before Java's value appears | Generating a prediction is constructive engagement; stepping through a finished trace is only active. How learners engage with a visualization matters more than what it shows | Chi and Wylie 2014; Naps 2002; Hundhausen 2002 | |
| Step level feedback | Feedback on the exact step that went wrong, not on the final output | Step based tutors approach human tutoring (d = .76) while answer based ones do much less (d = .31) | VanLehn 2011 | C3 |
| Misconception specific messages | "M4: Where the loop variable ends" with an explanation that uses the real values and a one line rule | Elaborated, immediate feedback for a hard task, at the process level (how the loop runs), not only "correct or not" | Shute 2008; Hattie 2007 | C3 |
| Example tracing with a bug library | (behind the scenes) every wrong answer is compared with what each misconception would predict at that step | Feedback from authored correct and incorrect steps, no cognitive model; about a quarter to an eighth of the cost of a model tracing tutor | Aleven 2009 | one builder, seven weeks |
| Worked example, then faded, then on your own | P01 fully worked; P02 and P03 leave the last steps to the learner; P04 asks for everything | Fading support step by step, the modeling, coaching, and fading of cognitive apprenticeship. Backward fading removes the last steps first, which are exactly the boundary steps | Renkl 2003; Collins 1989 | C4 |
| Self explanation prompt | "Why did this loop stop where it did?" after the worked example, then an expert explanation to compare | Learners who explain examples to themselves learn more; it also captures the "why" a step checker cannot validate | Chi 1989 | |
| Notes on boundary steps answered right | "Right. `<=` lets the bound through: `5 <= 5` is true." | Confirms the rule at the moment it mattered, at the process level, but never says what happens next, so the following prediction stays the learner's own | Hattie 2007; Chi and Wylie 2014 | |
| Pass count prediction | "How many times will the body run?" before each problem on your own, checked after the trace | M1 (counting from the bound) cannot appear in a step trace, because the trace does the counting. Committing to a number first makes it visible | Chi and Wylie 2014; misconception M1 | |
| Orientation and prerequisite check | The four phases (and exit) before any practice, then two warm ups (updating a variable, `6 <= 6`) | Tracing must be modeled before it is asked for; feedback should never rely on something the learner has not seen | Morrison 2015 | C4 |
| Watch condition (`?condition=watch`) | Same problems and trace table, click to reveal, no predictions and no feedback | The evaluation changes only the engagement mechanism, the variable the visualization literature calls critical | Naps 2002; Hundhausen 2002 | |
| Every trace checked against OpenJDK | Problem bank page: "14 of 14 traces match real Java", with the CI run | Feedback is only useful if the trace is right. A simulator that disagrees with Java would teach the wrong thing | Fidelity bar in the proposal | C3 |
| No AI at run time | Every message is authored and reviewable on the bank page | Correct, predictable, and free | Proposal, section 2 | C5 |
| Medium versus method | The tool makes step level prediction with instant feedback possible without a tutor; the method (worked and faded examples, self explanation) does the teaching | Both sides of the media debate are honored | Clark 1983; Kozma 1994 | C3 |
| Keyboard and screen reader support | Every answer works from the keyboard (letter keys inside the trace table), feedback is announced, and focus moves to the next question | Anyone with a browser can take part, including learners who don't use a mouse | Accessibility practice (WCAG 2.2) | C2 |
| Legibility | Atkinson Hyperlegible type (distinct 0 and O, 1 and l), large code, phase color always paired with a shape and a name | Values must be read exactly; meaning never rests on color alone | Accessibility practice | |

## Changes since the proposal

1. **The wrong steps come from five buggy rules instead of being typed per problem.** The proposal described feedback from authored correct and incorrect steps. Each misconception is now authored once, as a rule that says what a learner holding it would answer at any step. LoopLens applies the rules to the true state at every step of every problem. This is still example tracing (no cognitive model), but all 14 problems stay consistent, every problem automatically covers its targeted misconceptions, and the messages quote the real values from the trace. Unit tests confirm each of M1 to M5 produces its own feedback.
2. **A pass count prediction opens each problem on your own.** While building the step feedback it became clear that M1 can never appear in a step trace: the trace does the counting for the learner. Committing to a count first makes M1 visible, and the trace then tests the prediction.
3. **"Exit" is a fifth choice when predicting the next phase.** Learners with M4 believe the loop ends right after the last body. Without an exit option, that belief would have no way to show up.
4. **Faded examples use backward fading.** P02 leaves only the last pass to predict, P03 the last two. The boundary steps are where the misconceptions live, so that is where fading starts.
5. **Ahead of schedule:** the Watch condition flag and the orientation were planned for the week of Nov 2 but were nearly free once the worked example stepper existed. The slice has four problems instead of three, so every scaffolding level is live.

No change to the audience, objectives, scope (single, non nested `for` loops), technology stack, or evaluation design.

## Fidelity bar from the proposal, current status

| Bar | Status |
| --- | --- |
| A first time novice can finish on their own in under 45 minutes | To test in the Milestone 2 beta |
| At least 12 problems covering all five misconceptions and all objectives | 14 authored; coverage checked by unit tests |
| Every trace matches real Java | 14 of 14, checked on every push |
| Each misconception causes its own feedback | Unit tested |
| Each learner's anonymous log reaches the data sheet | Logged in the browser now; Sheet endpoint ready for Nov 2 |

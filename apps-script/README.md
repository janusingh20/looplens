# Anonymous logging to a Google Sheet

This is the logging endpoint from the proposal's stack: a Google Apps Script web app that writes LoopLens events to a Google Sheet. It is scheduled for the week of Nov 2; until it is connected, events stay in each learner's browser.

1. Create a new Google Sheet (for example "LoopLens events").
2. In the Sheet, open **Extensions**, then **Apps Script**. Replace the editor contents with `Code.gs` from this folder and save.
3. Click **Deploy**, then **New deployment**. Type: **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the web app URL (it ends in `/exec`).
4. In the GitHub repository, open **Settings**, **Secrets and variables**, **Actions**, **Variables**, and add a variable named `LOG_URL` with that URL.
5. Push any commit (or re run the workflow). The new build sends events to the Sheet. The problem bank page then says "This build also sends events to the study spreadsheet."

Each prediction becomes one row: session id (random), sequence number, time, problem, mode, step, phase, the answer, the correct answer, whether it was right, the misconception label, the message variant, and milliseconds taken. These rows feed RQ3 (which misconceptions fade, by practice opportunity) and RQ4 (time per problem and drop off) in the evaluation plan.

Before collecting data from anyone outside the class, an IRB protocol is needed (see the proposal's evaluation section).

# Screen-recorded test runs

Runs the manual-testing clips from the Video Production Plan against the live
site. The script really executes each test case in a visible Chrome window,
with an on-screen pointer and human-paced typing, while OBS records the
screen. Each step is checked against the test case's expected result and
written to an execution log (with screenshots) for marking Zephyr.

Nothing is faked: a step that doesn't behave as expected is logged as
**Fail**. TC-04 (DEF-10) and SEC-01 (DEF-11) are expected to fail until those
defects are fixed.

## One-time setup (Windows, Git Bash)

1. Get the latest code and packages, from the project folder:

       git pull
       npm ci

2. Google Chrome must be installed. The script uses it, so nothing else is downloaded.

3. **OBS:**
   - Open **Tools → WebSocket Server Settings**, tick **Enable WebSocket server**, keep port **4455**, and copy the password from **Show Connect Info**.
   - In your **Display Capture** source, untick **Capture Cursor**. The script draws its own pointer, and your real cursor would otherwise sit still on screen.
   - Set the recording folder in **Settings → Output**.

4. **Accounts:**
   - Copy `tests/video/accounts.env.example` to `tests/video/.env.accounts`.
   - Fill in the four test accounts and the OBS password.
   - The file is ignored by Git, so it never gets committed.

5. **Live-site prerequisites:**
   - STUDENT-A, STUDENT-B and STUDENT-C are registered and **verified**.
   - The admin account works.

## Run

From the project folder:

    node tests/video/record.mjs --list              # the clips, in order
    node tests/video/record.mjs --mode none --only SCR-V1-08a   # rehearsal, nothing recorded
    node tests/video/record.mjs --part 1            # recorded: before Selenium
    node tests/video/record.mjs --part 2            # recorded: the claim story, after Selenium

- **Part 1** creates the found umbrella (STUDENT-B), verifies it (ADMIN), and records the report, search, privacy, and security clips.
- **Run Selenium (`tests/selenium/run-live.ps1`) between part 1 and part 2.** Part 2 releases the umbrella, after which it no longer appears in search.
- **Part 2** records the claims, the approval, the on-hold claim, the release, and the notifications.

While it runs, **don't touch the mouse or keyboard**. Turn on Windows Focus mode so no pop-ups appear on screen.

Each clip starts and stops OBS by itself. OBS's file is renamed to the clip ID (e.g. `SCR-V1-08a.mkv` or `.mp4`) in OBS's recording folder.

## Output

`test-results/video/run-<time>/`:

- `execution-log.md`: every step with expected result, actual result, Pass/Fail and screenshot. Use it to fill in Zephyr's Test Player.
- `screenshots/`: one per step, to attach in Zephyr.

`test-results/video/state.json` remembers the IDs created in part 1 (the found and lost reports) for part 2. Delete it to start a fresh story.

## Options

| Option | Meaning |
|---|---|
| `--mode obs` | Default. Visible Chrome; OBS records |
| `--mode none` | Visible Chrome, no recording (rehearsal) |
| `--mode video` | Playwright records each window to `.webm` (needs `npx playwright install chromium ffmpeg`) |
| `--only ID,ID` | Just these clips |
| `--speed 1.5` | Slower (higher = slower); `0.5` = faster |
| `--base URL` | Another site, e.g. a local copy |

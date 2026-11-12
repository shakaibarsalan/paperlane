# Submission: Paperlane (Ajaia Full Stack Product Engineer assignment)

**Candidate:** Muhammad Shakaib Arsalan
**Live product:** https://paperlane-murex.vercel.app
**Walkthrough video:** see `VIDEO_URL.txt`

## How to review in 2 minutes

There are no passwords. On the sign-in screen pick a demo user, and use **Switch user** (top right) to change accounts.

| User | Email for sharing | In the live app already |
| --- | --- | --- |
| Alice Khan | alice@paperlane.test | Owns "Q4 launch plan" |
| Bob Mirza | bob@paperlane.test | Can edit "Q4 launch plan" |
| Carol Diaz | carol@paperlane.test | Can view "Q4 launch plan" |

The steps are listed under "Try the sharing flow" in README.md. Sample import files are in `samples/` inside the source zip.

## What's in this folder

| Item | What it is |
| --- | --- |
| `paperlane-source.zip` | Full source code (no `node_modules`, no secrets). It's the same tree as the files listed below. |
| `README.md` | Features, local setup and run instructions, tests, deployment |
| `ARCHITECTURE.md` | What I prioritized and why, the data model, deliberate cuts, what comes next |
| `AI_WORKFLOW.md` | AI tools used, where they helped, what I changed or rejected, how I verified |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Link to the 3–5 minute walkthrough |
| `samples/` (inside the zip) | `.md`, `.txt` and `.docx` files for testing the import |

## Status

**Working end to end (in the live deployment):**

- Create, rename, edit, autosave, reopen and delete documents.
- Rich text: bold, italic, underline, strikethrough, H1 to H3, bulleted and numbered lists, quote, undo and redo. Formatting persists.
- Import .txt, .md or .docx (up to 2 MB) as a new document. Unsupported files get a clear error.
- Sharing:
  - an owner can add people as editor or viewer, change their role, or remove them;
  - *My documents* and *Shared with me* are separate lists;
  - viewers get a read-only page;
  - every rule is enforced on the server.
- Persistence in Postgres. A stale save is rejected (409) instead of overwriting newer content.
- Export to Markdown (the optional stretch item).
- 17 automated tests (unit tests plus integration tests against Postgres), a type-check, and a production build.

**Incomplete or deliberately left out:**

- Real-time co-editing and presence. Concurrent edits are safe (version check) but not live.
- Comments, suggestions and version history.
- Real authentication (it's mocked with seeded users and a signed cookie, as the brief allows).
- Images and attachments inside documents.
- Sharing with people who have no account.

**Next 2–4 hours:**

1. Yjs-based live collaboration with presence, behind the same access checks.
2. Version history (save and restore snapshots).
3. Magic-link sign-in and email invites.
4. Playwright end-to-end tests for the browser flows.

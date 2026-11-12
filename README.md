# Paperlane

A lightweight collaborative document editor: create, format, import, share and export documents.

**Live app:** https://paperlane-murex.vercel.app
**Test accounts:** no passwords. On the sign-in screen pick **Alice Khan**, **Bob Mirza** or **Carol Diaz**, and use **Switch user** (top right) to change accounts.

| User | Email (used for sharing) |
| --- | --- |
| Alice Khan | alice@paperlane.test |
| Bob Mirza | bob@paperlane.test |
| Carol Diaz | carol@paperlane.test |

## What works

- **Documents:** create, rename (click the title), edit, delete (owner only). Autosave runs about 0.8 s after you stop typing, or straight away with Ctrl/Cmd+S. The status shows *Unsaved changes / Saving… / All changes saved*.
- **Rich text:**
  - bold, italic, underline, strikethrough;
  - headings H1 to H3;
  - bulleted and numbered lists, quotes;
  - undo and redo.
  
  Formatting is stored as sanitized HTML, so it survives a refresh.
- **File import:** on the Documents page, use **Import a file** to turn a **.txt, .md or .docx** file (up to 2 MB) into a new editable document. Headings, bold, italic and lists carry over. Other file types are refused with a clear message.
- **Sharing:**
  - the owner opens **Share**, adds people by email, and chooses **Can edit** or **Can view**;
  - the owner can change a person's role or remove them;
  - the Documents page separates **My documents** from **Shared with me**, and each shared document shows who shared it and your access level;
  - viewers get a read-only page with no toolbar.
- **Export:** **Export .md** downloads the document as Markdown. This works for anyone who can view the document.
- **Safe saves:** two tabs or two people can't silently overwrite each other. A stale save is rejected, and the page asks you to reload.

### Try the sharing flow in two minutes

1. Sign in as **Alice**. Choose **+ New document**, type something, and try the toolbar.
2. Choose **Share**. Add `bob@paperlane.test` as **Can edit** and `carol@paperlane.test` as **Can view**.
3. Choose **Switch user**, then **Bob**. The document is under **Shared with me** as *Can edit*. Open it and edit it.
4. Choose **Switch user**, then **Carol**. The document opens as view only: no toolbar, and the title is locked.
5. Choose **Switch user**, then **Alice**. Bob's edits are there.

Sample files for the import are in [`samples/`](samples/).

## Run locally

You need Node.js 20 or newer and any Postgres 13 or newer.

```bash
# 1. A local Postgres (skip this if you already have one)
docker run -d --name paperlane-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=paperlane postgres:16

# 2. Configure
cp .env.example .env
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/paperlane
#   SESSION_SECRET=<any long random string>

# 3. Install, create the tables and seed the demo users, then start
npm install
npm run db:migrate
npm run dev        # http://localhost:3000
```

### Tests

```bash
npm test           # unit tests, plus Postgres integration tests when DATABASE_URL is set
npm run typecheck
```

What the tests cover:

- `tests/access.test.ts`: the permission rules (owner, editor, viewer, no access).
- `tests/import.test.ts`:
  - converting .txt, .md and .docx files;
  - stripping scripts and event handlers;
  - errors for unsupported, empty and corrupt files;
  - Markdown export and input validation.
- `tests/documents.integration.test.ts`: runs against a real database. It checks:
  - a user sees nothing until the document is shared;
  - a viewer can't edit or re-share;
  - an editor can save;
  - after access is removed, the user is locked out again;
  - a stale save gets a 409 and doesn't overwrite newer content.

Current result: **17 tests pass, 3 files** (with a database).

If you don't want Node installed locally, `scripts/docker-check.sh` runs install, type-check, tests and build inside a Node container.

## Deployment

- **Hosting:** Vercel. Functions are pinned to `bom1` (Mumbai) in `vercel.json`, next to the database.
- **Database:** Postgres 17 on a small Linux server I run. It has its own database and role, and it accepts connections over SSL only. The `DATABASE_URL` uses `sslmode=no-verify` because the server's certificate is self-signed.
- **Environment variables:** `DATABASE_URL` and `SESSION_SECRET`.

To deploy your own copy:

1. Point `DATABASE_URL` at any Postgres.
2. Run `npm run db:migrate` once.
3. Run `vercel deploy`.

Reviewers don't need any paid service.

## Project layout

```
app/                 Next.js App Router pages and API routes
  api/documents/...  REST endpoints (CRUD, import, shares, export)
  docs/[id]/         Editor page
components/          DocEditor (TipTap + autosave), SharePanel, DocsHome, TopBar
lib/
  access.ts          Pure permission rules
  documents.ts       Document service: every query is scoped to the acting user
  importFile.ts      .txt / .md / .docx to sanitized HTML
  sanitize.ts        HTML allow-list (same rules for saves and imports)
  session.ts         Mocked auth: HMAC-signed cookie with a seeded user id
db/schema.sql        Tables and seed users
tests/               Vitest suites
```

More detail is in [ARCHITECTURE.md](ARCHITECTURE.md) and [AI_WORKFLOW.md](AI_WORKFLOW.md).

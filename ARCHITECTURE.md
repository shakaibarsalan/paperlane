# Architecture note

## The slice I chose

The prompt asks for a Google Docs–style tool. In a 4-hour window, the parts reviewers will actually test are these:

- the editing experience;
- whether things persist correctly;
- whether sharing really enforces access.

So I went deep on those three and kept everything else thin.

**Prioritized**

1. **An editor that feels solid.** TipTap (on ProseMirror) gives real rich-text behaviour: shortcuts, lists, headings, undo. That beats a hand-rolled contenteditable. On top of it:
   - debounced autosave with a visible save state;
   - Ctrl+S;
   - a warning before leaving with unsaved changes.
2. **Access control enforced on the server, not just hidden in the UI.**
   - All rules live in one pure module (`lib/access.ts`): owner / editor / viewer / none.
   - Every database call goes through a service (`lib/documents.ts`) that takes the acting user's id.
   - A document you can't see returns **404** (not 403), so ids can't be probed.
3. **Not losing work.** Each document has a `version`. A save only applies when its version matches (`UPDATE … WHERE version = $n`). Otherwise the server returns 409 and the UI asks you to reload. That covers the two-tabs and two-people cases without real-time sync.
4. **Safe content.** HTML is sanitized with one allow-list on every write, imports included. A crafted request can't store a script, even if it bypasses the editor.

## Stack and why

| Layer | Choice | Reason |
| --- | --- | --- |
| App | Next.js 15 (App Router), TypeScript | One deployable unit for UI and API; server components load data without extra client round trips |
| Editor | TipTap 3 (StarterKit) | Mature, extensible; stores clean HTML |
| Storage | PostgreSQL (`pg`) | Real relational data: documents, shares with a composite key, foreign-key cascades on delete |
| Validation | zod | One schema per input; the first problem goes back as a readable message |
| Import | mammoth (.docx), marked (.md), custom (.txt) | Each output goes through the same sanitizer |
| Tests | Vitest | Unit tests plus integration tests against real Postgres |
| Hosting | Vercel (`bom1`) and Postgres on my own server | Free for reviewers; functions sit in the same region as the database |

## Data model

```
users(id, name, email, color)                        -- seeded demo accounts
documents(id uuid, owner_id → users, title, content_html, version, created_at, updated_at)
document_shares(document_id → documents ON DELETE CASCADE, user_id → users, role 'viewer'|'editor', PK(document_id, user_id))
```

Ownership is a column, not a share row, so an owner can never be downgraded by accident. Sharing again with someone updates their role (an upsert).

## Auth

Auth is mocked, as the brief allows. The sign-in screen lists the seeded users. The session is an httpOnly cookie, `userId.HMAC(userId)`, so it can't be edited by hand. Real auth (OAuth, magic link) would only replace `lib/session.ts`. The rest of the app just asks for the current user.

## Things I cut on purpose

- **Real-time co-editing (Yjs or CRDT, presence cursors).** This is the biggest piece of Google Docs. Done well, it needs a websocket service and conflict-free data structures; that alone fills the timebox. Optimistic versioning keeps concurrent edits *safe* rather than *live*.
- **Comments, suggestions and version history.** Version history would build on the existing `version` counter: keep each saved snapshot.
- **Images and attachments inside documents.** The sanitizer drops `<img>` on purpose. Supporting them needs object storage plus scanning.
- **Invite flow for people without an account.** Sharing only works with existing users, and a clear error explains this.
- **PDF export.** I shipped Markdown export instead, because it's cheap and lossless for this formatting set.

## What I'd build next (2–4 hours)

1. Live presence plus Yjs collaboration, behind the same access checks.
2. Version history: list the snapshots and restore one.
3. Real sign-in (email magic link), with share-by-email invites for new users.
4. Playwright end-to-end tests for the browser flows I now check by hand: editor toolbar, share dialog, viewer mode.

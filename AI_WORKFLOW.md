# AI workflow note

## Tools

- **Claude Code (Anthropic Claude):** my main coding agent, in the terminal. I used it for:
  - scaffolding;
  - the first drafts of the service layer, API routes and components;
  - the tests;
  - deployment commands.
- **An AI browser agent:** I used it to click through the live app as each of the three demo users.

## Where AI really sped things up

- **Boilerplate across many files.** That meant the Next.js routes, the zod schemas, the TipTap toolbar wiring, the share dialog and the CSS. AI made it a matter of minutes, and that left time for the parts that need judgement: access rules, concurrency and sanitizing.
- **Test cases.** Once I had decided the rules (404 rather than 403 for hidden documents; viewers can't re-share; stale saves get a 409), AI turned them into full test cases quickly.
- **Debugging deployment.** Here it read the server's Postgres config for me and found the cause of a connection failure in seconds (details below).

## What I changed or rejected

- **Rejected a separate database container on a new port.** It was the first plan. The cloud firewall blocks new ports, so instead I created an isolated database and role on an existing Postgres instance, and allowed SSL-only access for that role alone. I didn't open the firewall more widely.
- **Rejected the default Vercel region.** The first deploy ran in Washington (iad1) while the database is in Mumbai, and saves felt slow. I measured it, pinned the functions to `bom1`, and checked the response header (`bom1::bom1`).
- **Fixed an autosave race the first draft missed.** If you keep typing while a save is in flight, the newer edits must not be marked as saved. I added a change counter so the editor saves again whenever edits arrive during a request.
- **Made the sanitizer stricter.** I kept a tight allow-list: no `style`, no `img`, no `javascript:` links. Every write goes through it, not just imports, because the API can be called without the editor.
- **Kept the scope cut.** AI readily suggests adding real-time collaboration. I chose not to: done badly in two hours, it would make the core flows less reliable.

## How I verified it

1. **Automated checks.**
   - Type-check (`tsc --noEmit`) and a production build.
   - 17 Vitest tests, including integration tests against real Postgres for every sharing rule and the version conflict.
   - The integration test is what first exposed the database access problem, before any UI existed.
2. **Live API checks** against the deployed URL with curl:
   - sign-in;
   - create, save and read back (confirming that an injected `<script>` was stripped);
   - importing real .md, .txt and .docx files;
   - an unsupported file type;
   - a viewer trying to edit or share (403);
   - a request with no session (401);
   - Markdown export.
3. **Manual UX pass** in a browser, as Alice, then Bob, then Carol. It covered:
   - formatting via the toolbar and keyboard shortcuts;
   - rename;
   - reload to confirm persistence;
   - the share dialog (editor and viewer roles);
   - the *Shared with me* list;
   - Carol's read-only view.

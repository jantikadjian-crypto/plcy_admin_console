# PLCY Admin Console

Internal React/TypeScript SPA for the PLCY team to operate the AI Governance &
Policy Enforcement platform across SaaS and air-gapped single-tenant customers.
Stack: React 18 · TypeScript (strict) · Vite · Tailwind · React Router · Recharts.
Front-end prototype driven by mock data in `src/data/*` (no backend).

---

## Working preferences

> This section captures how Jack likes to work. **Add to or edit it any time** —
> just say "add this to my preferences" and it goes here. New sessions read this
> file automatically, so preferences persist across sessions.

1. **Always end an update with a "How to see it" block** so the change can be
   verified. Include:
   - **Preview** — the live artifact link + the exact click-path
     (Sidebar → Page → what to click → what you'll see).
   - **Code** — the commit hash and PR link, so the diff can be read.
   - A **tip** when useful (e.g. hard-refresh, which sample row shows it best).

   Format to follow:
   > **✅ What changed** — one-line summary
   > **How to see it:**
   > • Preview: `<artifact URL>` → *Sidebar → Page → click X* → you'll see Y
   > • Code: commit `<hash>` on PR #<n> → *Files changed*

<!-- Add new preferences below as numbered items. -->

---

## Ship checklist (for the assistant)

Before reporting an update done: `npx tsc --noEmit` → `VITE_HASH_ROUTER=1 npx
vite build --base=./` → browser-verify the change → commit → push to the working
branch → republish the Artifact preview. End the message with the "How to see it"
block above.

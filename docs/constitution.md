# Project Constitution

1. **Minimal stack**: no dependency is added unless it solves a concrete
   problem identified in a spec. No "just in case" libraries.
2. **Spec before code**: every feature has an approved `specs/<feature>/`
   before implementation, and its PR references it.
3. **Data flow**: UI never calls fetch directly. Server Components call
   `services/`; client components use `hooks/` (TanStack Query), which
   call `services/`. Server-side is the default.
4. **Validated boundaries**: every TMDB response is parsed with Zod in
   `services/`. TypeScript strict mode, no `any`.
5. **Tested requirements**: every functional requirement has at least one
   test. No failing tests, no merge.
6. **No own backend**: Next.js server features are used only to proxy TMDB
   and hide the API key. No database. User data persists in `localStorage`,
   accessed only through Zustand stores.
7. **Accessible by default**: WCAG 2.1 AA, full keyboard navigation,
   semantic HTML first.
8. **Performance**: images via `next/image`; Lighthouse ≥ 90 in all
   categories on key pages.
9. **English everywhere**: code, commits, specs, docs and UI text.

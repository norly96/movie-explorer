# Project Constitution

1. **Minimal stack**: no library is added without solving a concrete problem
   already identified in a spec or PR. No "just in case" dependencies.
2. **Spec before code**: no feature is implemented without an approved file
   in `/specs` first. The PR must reference its spec.
3. **Logic separated from UI**: components never call fetch/axios directly.
   All external calls live in `services/`.
4. **Every feature PR includes its test**: spec, code, and test ship
   together in the same PR. No test, no merge.
5. **Local persistence, no custom backend**: no backend/DB is built; the
   only storage allowed is `localStorage` for user data.
6. **Consistent language**: code, variable names, commits, specs, and README
   are all written in English, no exceptions.
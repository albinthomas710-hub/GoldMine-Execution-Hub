# GoldMine — Product Requirements Document

## Original Problem Statement
GoldMine — All-in-One Social Media Content Execution Hub. A browser app to cut through social media junk, save only gold content, organize the best creators, and execute on what you save instead of hoarding it.

## Architecture
- **Frontend:** React 19 + Tailwind 3 + Phosphor Icons + Shadcn UI; client-side routing with `react-router-dom`. Auth via custom `AuthContext` using axios + cookie + bearer token fallback.
- **Backend:** FastAPI single-file (`/app/backend/server.py`) with Motor (async MongoDB). All routes prefixed with `/api`.
- **Database:** MongoDB (`test_database`). Collections: `users`, `user_sessions`, `categories`, `creators`, `vault`, `prompts`, `actions`, `notes`. All scoped by `user_id` with `_id` excluded from responses.
- **Auth:** Dual flow — JWT bearer for email/password (`/api/auth/signup`, `/api/auth/login`) AND Emergent-managed Google OAuth (`/api/auth/google-session`). `get_current_user` accepts either `session_token` cookie or `Authorization: Bearer <token>`.
- **Design:** Dark luxury aesthetic per `/app/design_guidelines.json` — Cabinet Grotesk display + Manrope body, gold accent (#D4AF37) on deep neutrals (#0A0A0A / #121212), flat surfaces with 1px white/6 borders, generous spacing, restrained motion.

## User Personas
- Aspiring startup founders / indie hackers / AI enthusiasts
- Self-improvement consumers tired of doomscrolling
- Single-user (private) app — no multi-tenant features

## Core Requirements (static)
1. **Gold Sources Directory** — CRUD creators with multi-platform links + categories; filter by category × platform.
2. **Content Vault** — Save URLs, auto-detect platform, filter combined; "Move to Action" creates an Action card.
3. **Prompt Vault** — Save prompts, copy-to-clipboard, category filter.
4. **Action Loop** — Action cards (Learn/Build/Try/Share) with deadline + status.
5. **Dashboard** — Accountability score (just a number), save-to-action ratio, weekly counts, overdue list, by-type breakdown.
6. **Notes** — Basic rich text (bold/italic/lists) with platform/category tags + optional source link.

## What's Been Implemented (2026-02-25)
- ✅ Phase 1 — Foundation: auth (Google + email/password), sidebar navigation shell, dark luxury theme
- ✅ Phase 2 — Gold Sources Directory: full CRUD, platform + category filtering, search, multi-link cards
- ✅ Phase 3 — Content Vault: full CRUD with platform auto-detection, combined filters, Move-to-Action
- ✅ Phase 4 — Prompt Vault: full CRUD, category filter, copy-to-clipboard with `execCommand` fallback
- ✅ Phase 5 — Action Loop + Dashboard: action card CRUD, status tracking, accountability score, overdue alerts
- ✅ Phase 6 — Unified Notes: rich text editor (contentEditable), platform/category tags, source links
- ✅ Phase 7 — Polish: empty states with provided imagery, responsive sidebar, sonner toasts, data-testids on every interactive element

## Validation
- Backend: 17/17 pytest tests green (auth, all 6 CRUD resources, dashboard stats, user isolation, vault platform auto-detection, move-to-action)
- Frontend: signup→dashboard, sidebar nav, vault create + move-to-action, prompts copy, notes rich-text, directory CRUD, dashboard render — all verified end-to-end
- Lint: clean (frontend); 1 unused-import warning fixed in backend

## Backlog (P1/P2)
- P1: Add `<DialogDescription className="sr-only">` to all dialogs (Radix a11y warning, non-blocking)
- P1: Cascade-clear `category_id` on creators/vault/prompts/notes when a category is deleted
- P2: Switch `requests.get` in `/api/auth/google-session` to `httpx.AsyncClient` to avoid blocking the event loop
- P2: Optional accountability "consequences" — streak tracking, low-score banner (user opted-out for v1)
- P2: JWT revocation list for hard logout
- P2: Modular backend split (per-resource routers/models)
- P2: Bulk import / browser extension for one-click save

## Next Action Items
- Confirm UX polish details with user; iterate on any specific page they want refined
- Optional: add the suggested business enhancement — public-facing shareable "weekly execution report" landing page so users can post their accountability score for social proof + viral signup loop

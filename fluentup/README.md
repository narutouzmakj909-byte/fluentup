# NORA (formerly FluentUp)
NORA — Learn English, Naturally. English ↔ Somali learning app (PWA + Capacitor Android). Run: `npm run serve` → http://localhost:8080. Test: `npm test`. See docs/STATE.md for exactly what works and what does not.


## Design (v1.0)
Liquid Glass design system: `src/styles/app.css` (tokens, surfaces, buttons, nav, motion) and `src/ui/glass.js` (component builders, sheets/modals). See CONTINUATION.md for the visual/accessibility checks (`tests/e2e/audit.py`, `contrast.py`, `a11y.py`).


## AI Tutor (Phase 1)
Signed-in learners get a Somali-first AI Tutor from the Home tile and Skills area. Setup, deployment, CORS and testing: `docs/TUTOR.md`. Not verified against a live Supabase deployment.


## NORA 1.0 interface update
- CEFR level hub separates A1, A2, B1, B2, C1 and C2 into distinct selectable sections.
- The app header shows only the NORA wordmark on the left and a Profile shortcut on the right.
- Profile contains name editing, sign-out, account deletion, learning preferences, and progress.
- Initial home loading text and the online status badge have been removed; sign-in is shorter and has no tap animation.
- Skills content is also filtered by the chosen CEFR level, so A1 and B2 material are not mixed.

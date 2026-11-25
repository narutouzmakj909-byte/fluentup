# NORA (formerly FluentUp)
NORA — Learn English, Naturally. English ↔ Somali learning app (PWA + Capacitor Android). Run: `npm run serve` → http://localhost:8080. Test: `npm test`. See docs/STATE.md for exactly what works and what does not.


## Design (v0.9.0)
Liquid Glass design system: `src/styles/app.css` (tokens, surfaces, buttons, nav, motion) and `src/ui/glass.js` (component builders, sheets/modals). See CONTINUATION.md for the visual/accessibility checks (`tests/e2e/audit.py`, `contrast.py`, `a11y.py`).


## AI Tutor (Phase 1)
Signed-in learners get a Somali-first AI Tutor (top-bar ✦ button or Home tile). Setup, deployment, CORS and testing: `docs/TUTOR.md`. Not verified against a live Supabase deployment.

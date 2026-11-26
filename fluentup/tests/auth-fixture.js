import { writeFileSync, unlinkSync } from 'node:fs';

// App UI tests run with a synthetic, already-authenticated Supabase session.
// This fixture is test-only; config.js is gitignored and excluded from release artifacts.
export function setupSignedInAuthFixture() {
  writeFileSync(new URL('../config.js', import.meta.url),
    "export default { SUPABASE_URL: 'https://nora-test.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key' };\n");
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Date.now() + 60 * 60 * 1000,
    user: { id: 'nora-test-user', email: 'learner@gmail.com', user_metadata: { full_name: 'Test Learner' } }
  };
  globalThis.localStorage = {
    getItem: key => key === 'fluentup.session' ? JSON.stringify(session) : null,
    setItem: () => {},
    removeItem: () => {}
  };
}

export function cleanupAuthFixture() { try { unlinkSync(new URL('../config.js', import.meta.url)); } catch {} }

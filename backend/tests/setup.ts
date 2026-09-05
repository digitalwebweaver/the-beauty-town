// Runs before each test file (same realm as the tests, unlike
// globalSetup.ts) — points the app's own db module at the dedicated test
// database instead of the real dev database. Must set this BEFORE
// anything imports `@/config/env`, since that module reads process.env
// once at import time.
process.env.PGDATABASE = 'salon_db_test';
process.env.NODE_ENV = 'test';
// A throwaway 32+ char value — nothing in these tests exercises JWT
// signing, but env.ts's schema requires the vars to be present.
process.env.ACCESS_TOKEN_SECRET ??= 'test_access_secret_not_used_for_signing_anything_real';
process.env.REFRESH_TOKEN_SECRET ??= 'test_refresh_secret_not_used_for_signing_anything_real';

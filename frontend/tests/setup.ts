import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// `globals: false` in vite.config.ts means Testing Library's own
// auto-cleanup (which detects a global `afterEach`) never registers —
// without this, DOM from one test leaks into the next, since nothing
// ever unmounts it.
afterEach(cleanup);

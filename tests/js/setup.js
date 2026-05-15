import { vi } from 'vitest';

// Stub the Nextcloud globals that adapter code reads at module load
// (OC.currentUser, OC_requesttoken, i18next). The i18next stub echoes the
// key back so assertions can match on key names rather than translations.
vi.stubGlobal('OC', { currentUser: 'testuser' });
vi.stubGlobal('OC_requesttoken', 'test-csrf-token');
vi.stubGlobal('i18next', {
    t: (key, opts) => (opts?.name ? `${key}:${opts.name}` : key),
});

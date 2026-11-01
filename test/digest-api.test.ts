import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest JSON API', () => {
  it('returns the aggregated rows sorted by job', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    const rows = await res.json();

    expect(res.status).toBe(200);
    expect(rows.map(({ job }: { job: string }) => job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(rows.find(({ job }: { job: string }) => job === 'digest/render')).toMatchObject({ owner: null });
  });

  it('returns 404 for an invalid night or a night without a file', async () => {
    const app = createApp(config);

    expect((await app.request('/api/digest/not-a-date')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-29')).status).toBe(404);
  });
});

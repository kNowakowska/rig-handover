import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const night = '2026-10-28';
const badLineNight = [
  JSON.stringify({ at: '2026-10-28T23:00:02+01:00', job: 'zeta/job', status: 'ok', owner: 'rook' }),
  'this is not json',
  JSON.stringify({
    at: '2026-10-28T23:01:00+01:00',
    job: 'alpha/job',
    status: 'fail',
    owner: null,
    error: 'failed',
  }),
].join('\n');

let runsDir = '';

function makeConfig() {
  return {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  };
}

function writeNight(contents: string) {
  writeFileSync(join(runsDir, `${night}.jsonl`), contents);
}

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('renders a night with a bad line and retains its valid rows', async () => {
    writeNight(badLineNight);

    const response = await createApp(makeConfig()).request(`/digest/${night}`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('alpha/job');
    expect(html).toContain('zeta/job');
    expect(html.indexOf('alpha/job')).toBeLessThan(html.indexOf('zeta/job'));
  });

  it('returns the valid rows as JSON for a night with a bad line', async () => {
    writeNight(badLineNight);

    const response = await createApp(makeConfig()).request(`/api/digest/${night}`);
    const rows = (await response.json()) as DigestRow[];

    expect(response.status).toBe(200);
    expect(rows).toEqual([
      {
        job: 'alpha/job',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'failed',
        firstAt: '2026-10-28T23:01:00+01:00',
        lastAt: '2026-10-28T23:01:00+01:00',
      },
      {
        job: 'zeta/job',
        owner: 'rook',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:02+01:00',
        lastAt: '2026-10-28T23:00:02+01:00',
      },
    ]);
  });

  it('returns an empty page and empty JSON for an empty night', async () => {
    writeNight('');
    const app = createApp(makeConfig());

    const pageResponse = await app.request(`/digest/${night}`);
    const html = await pageResponse.text();
    const apiResponse = await app.request(`/api/digest/${night}`);

    expect(pageResponse.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(apiResponse.status).toBe(200);
    expect(await apiResponse.json()).toEqual([]);
  });

  it('returns 404 from both routes when the night file is missing', async () => {
    const app = createApp(makeConfig());

    expect((await app.request(`/digest/${night}`)).status).toBe(404);
    expect((await app.request(`/api/digest/${night}`)).status).toBe(404);
  });
});

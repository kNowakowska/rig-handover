import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { readNight } from './digest/reader.js';
import type { DigestRow } from './digest/types.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// One source for the page and the JSON, so they never disagree (ADR 0001).
function digestRows(runsDir: string, night: string): DigestRow[] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  if (!existsSync(join(runsDir, `${night}.jsonl`))) return null;
  const { rows } = readNight(runsDir, night);
  return rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    const rows = digestRows(config.runsDir, night);
    if (!rows) return c.notFound();

    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={night} rows={rows} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const rows = digestRows(config.runsDir, c.req.param('night'));
    if (!rows) return c.json({ error: 'Not Found' }, 404);
    return c.json(rows);
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}

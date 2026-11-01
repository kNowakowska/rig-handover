import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Hono } from 'hono';
import { readNight } from './digest/reader.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.json({ error: 'Not Found' }, 404);

    const path = join(config.runsDir, `${night}.jsonl`);
    if (!existsSync(path)) return c.json({ error: 'Not Found' }, 404);

    const rows = readNight(config.runsDir, night).rows;
    rows.sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
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

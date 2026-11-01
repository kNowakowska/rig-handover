import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, DigestStatus, ReadNight } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRunRecord(value: unknown): value is RunRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.at === 'string' &&
    typeof value.job === 'string' &&
    (value.status === 'ok' || value.status === 'retry' || value.status === 'fail') &&
    (typeof value.owner === 'string' || value.owner === null) &&
    (value.error === undefined || typeof value.error === 'string')
  );
}

export const readNight: ReadNight = (runsDir, night): DigestNight => {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  if (contents.length === 0) return { rows: [], badLines: 0 };

  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rowsByJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch {
      badLines += 1;
      continue;
    }

    if (!isRunRecord(value)) {
      badLines += 1;
      continue;
    }

    const existing = rowsByJob.get(value.job);
    if (existing) {
      rowsByJob.set(value.job, {
        ...existing,
        owner: value.owner,
        runs: existing.runs + 1,
        retries: existing.retries + (value.status === 'retry' ? 1 : 0),
        lastStatus: value.status,
        lastError: value.error ?? existing.lastError,
        lastAt: value.at,
      });
    } else {
      rowsByJob.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstAt: value.at,
        lastAt: value.at,
      });
    }
  }

  return { rows: [...rowsByJob.values()], badLines };
};

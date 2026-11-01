import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestStatus } from './types.js';

export type NightCounts = Record<DigestStatus, number>;

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

export function countNightRuns(runsDir: string, night: string): NightCounts {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  if (contents.length === 0) return counts;

  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch {
      continue;
    }

    if (isRunRecord(value)) counts[value.status] += 1;
  }

  return counts;
}

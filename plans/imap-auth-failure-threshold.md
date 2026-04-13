---
status: active
branch: null
worktree: null
created: 2026-04-13
topic: imap-auth-failure-threshold
---

# IMAP Auth-Failure Threshold (COR-162) Implementation Plan

**Goal:** Stop `poll-imap` from permanently deactivating email connections on a single transient auth rejection. Require 5 consecutive auth failures before deactivating.

**Architecture:** Single-file behavior change in `src/coreties-app/pages/api/cron/poll-imap.ts`. Reuses the existing `consecutive_failures` column on `auth.user_email_connections` — no schema changes. Slack + Sentry signals preserved (fire only on final deactivation, same as today). Non-auth failure path unchanged.

**Tech Stack:** Next.js API route, ClickHouse (ReplacingMergeTree), Vitest integration tests with real ClickHouse, `vi.mock` for ImapPollingService / Slack / Sentry.

**Total tasks:** 1 ([1 MED])
**Estimated agent budget:** 2 agents (implement + review)

**Reference:** [COR-162](https://linear.app/coreties/issue/COR-162) — threshold decision in attached comment (5 ticks × 15 min cron = 75 min grace window, covers Google's typical 1h IMAP throttle).

---

### Task 1: Gate auth-failure deactivation behind 5-consecutive threshold `[MED]`

**Files:**
- Modify: `src/coreties-app/pages/api/cron/poll-imap.ts`
- Create: `src/coreties-app/__tests__/integration/services/imapAuthFailureThreshold.test.ts`

**Steps:**
- [ ] Write failing test file with 4 cases (see code below)
- [ ] Run test — expect FAIL on cases 1, 2, 4 (case 3 may pass — current code already resets counter on success)
  - Command: `cd src/coreties-app && pnpm run test -- __tests__/integration/services/imapAuthFailureThreshold.test.ts`
- [ ] Apply the implementation change to `poll-imap.ts` (see code below)
- [ ] Run test — expect PASS (4/4)
- [ ] Run typecheck: `cd src/coreties-app && pnpm exec tsc --noEmit`
- [ ] Commit: `fix(email): gate IMAP auth-failure deactivation behind 5 consecutive failures (COR-162)`

**Context:** ImapFlow returns the same `"LOGIN failed."` / `"Authentication failed."` text for revoked passwords AND transient server-side rejections (Gmail 1h throttle per Workspace docs, Exchange IP lockouts, server restarts). The current code treats any match as permanent and deactivates on first hit. This change accumulates the counter like non-auth failures and only deactivates when the counter reaches 5 AND the latest failure was auth-type.

**Implementation — `poll-imap.ts`:**

Add a new constant next to the existing threshold:

```ts
const CONSECUTIVE_FAILURE_ALERT_THRESHOLD = 3;
// 5 × 15-min cron = 75 min grace window. Covers Google's documented typical
// IMAP throttle (1h) so transient rejections recover automatically. See COR-162.
const CONSECUTIVE_AUTH_FAILURE_DEACTIVATE_THRESHOLD = 5;
const POLL_CONNECTION_TIMEOUT_MS = 45_000;
```

Replace the failure-handling block inside the `for` loop (currently lines 127-186) with:

```ts
if (result.status === 'rejected') {
  const newCount = (Number(connection.consecutive_failures) || 0) + 1;
  // ImapFlow splits the error: `.message` is generic ("Command failed"),
  // `.responseText` has the real IMAP response (e.g. "[AUTHENTICATIONFAILED]
  // Invalid credentials"). We combine both so AUTH_FAILURE_PATTERNS can match
  // against either side.
  const err = result.reason;
  const message = err instanceof Error ? err.message : String(err);
  const responseText = (err as any)?.responseText || '';
  const reason = responseText ? `${message} — ${responseText}` : message;
  const reasonLower = reason.toLowerCase();
  const isAuthFailure = AUTH_FAILURE_PATTERNS.some(pattern => reasonLower.includes(pattern));

  // Only deactivate on SUSTAINED auth failures. A single auth-looking
  // rejection can be transient (Gmail throttle, Exchange IP lockout, server
  // restart). Wait for the counter to cross the deactivation threshold before
  // giving up on the connection. See COR-162.
  if (isAuthFailure && newCount >= CONSECUTIVE_AUTH_FAILURE_DEACTIVATE_THRESHOLD) {
    failureUpdates.push(
      connectionService.deactivateConnection(connection, `IMAP auth failure (${newCount} consecutive): ${reason}`)
        .then(() => {
          Sentry.captureMessage('IMAP connection deactivated due to sustained auth failure', {
            level: 'warning',
            tags: { service: 'poll-imap', email: connection.email },
            extra: { userId: connection.user_id, error: reason, consecutive_failures: newCount },
          });
        })
        .catch((err: unknown) => {
          console.error('[poll-imap] Failed to deactivate auth-failed connection', err);
        })
    );
    continue;
  }

  // Below deactivation threshold (or non-auth failure): accumulate counter.
  // Non-auth path still fires Sentry alert at CONSECUTIVE_FAILURE_ALERT_THRESHOLD.
  failureUpdates.push(
    clickHouseClient.insert({
      table: 'auth.user_email_connections',
      format: 'JSONEachRow',
      values: [{
        ...connection,
        consecutive_failures: newCount,
        last_failure_reason: reason,
        last_failure_at: formattedTimestamp(),
        updated_at: formattedTimestamp(),
      }],
    }).then(() => {
      if (!isAuthFailure && newCount >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD) {
        Sentry.captureMessage('IMAP connection repeatedly failing', {
          level: 'error',
          tags: { service: 'poll-imap', email: connection.email },
          extra: {
            consecutive_failures: newCount,
            userId: connection.user_id,
            error: reason,
          },
        });
      }
    }).catch((err: unknown) => {
      console.error('[poll-imap] Failed to persist failure count', err);
    })
  );
}
```

Also update the JSDoc at the top of the file (currently lines 1-11 and 69-80) to reflect the new behavior:

```ts
/**
 * poll-imap — Cron handler that polls all active SMTP/IMAP connections.
 *
 * Wraps ImapPollingService.pollConnection() in a 45s timeout.
 * Retry structure:
 *   - All failures (auth or other) → increment consecutive_failures
 *   - At threshold 3: non-auth failure fires Sentry alert
 *   - At threshold 5: auth failure triggers deactivation + Slack alert
 *   - On next cron tick, failed UIDs are re-scanned (cursor only advances past successes)
 *
 * Auth failures are not treated as instantly permanent because IMAP servers
 * return the same "Authentication failed." / "LOGIN failed." text for revoked
 * passwords AND transient rejections (Gmail throttle, Exchange IP lockout,
 * server restart). 5 consecutive failures × 15-min cron = 75 min grace window.
 *
 * See also: ImapPollingService, COR-162
 */
```

Update the comment block at the top of the handler function (lines 69-80) similarly — replace the `Auth failure → deactivate immediately` bullet with `Auth failure → increment counter, deactivate at threshold 5`.

**Implementation — `imapAuthFailureThreshold.test.ts`:**

```ts
import { randomUUID } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.mock('@/lib/slack', () => ({
  sendSlackMessage: vi.fn().mockResolvedValue(undefined),
}));

const mockPollConnection = vi.fn();
vi.mock('@/lib/email/services/ImapPollingService', () => ({
  ImapPollingService: vi.fn().mockImplementation(() => ({
    pollConnection: mockPollConnection,
  })),
}));

const sentryCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: any[]) => sentryCaptureMessage(...args),
}));

import handler from '@/pages/api/cron/poll-imap';
import { clickHouseClient } from '@/lib/clickhouse';
import { formattedTimestamp } from '@/utils/Util';
import { resetDatabaseForTest } from '../../setup/test-helpers';

function buildPasswordConnection(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    user_id: (overrides.user_id as string) || `member-live-${randomUUID()}`,
    email: (overrides.email as string) || `${randomUUID()}@example.com`,
    auth_type: 'password',
    imap_host: 'mail.example.com',
    imap_port: 993,
    smtp_host: 'mail.example.com',
    smtp_port: 465,
    imap_username: 'test',
    smtp_username: 'test',
    encrypted_password: 'x',
    encrypted_smtp_password: 'x',
    imap_tls: 'tls',
    smtp_tls: 'tls',
    smtp_imap_same_password: true,
    imap_last_uid: 0,
    is_active: true,
    last_sync_timestamp: formattedTimestamp(now),
    created_at: formattedTimestamp(now),
    updated_at: formattedTimestamp(now),
    oauth_access_token: '',
    oauth_refresh_token: '',
    oauth_expires_at: formattedTimestamp(new Date(0)),
    oauth_token_response: '',
    microsoft_subscription_id: '',
    microsoft_subscription_expiry: null,
    google_subscription_id: '',
    google_subscription_expiry: null,
    google_resource_id: '',
    subscription_status: 'active',
    consecutive_failures: 0,
    last_failure_reason: '',
    last_failure_at: null,
    ...overrides,
  };
}

async function insertConnection(conn: ReturnType<typeof buildPasswordConnection>): Promise<void> {
  await clickHouseClient.insert({
    table: 'auth.user_email_connections',
    format: 'JSONEachRow',
    values: [conn],
  });
}

async function getConnection(userId: string, email: string) {
  const rows = await clickHouseClient.query({
    query: `SELECT * FROM auth.user_email_connections FINAL WHERE user_id = {u:String} AND email = {e:String} LIMIT 1`,
    query_params: { u: userId, e: email },
    format: 'JSONEachRow',
  }).then(r => r.json<any>());
  return rows[0];
}

function mockReqRes() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const res = { status, json } as unknown as NextApiResponse;
  const req = {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  } as unknown as NextApiRequest;
  return { req, res };
}

describe('poll-imap auth-failure threshold (COR-162)', () => {
  beforeEach(async () => {
    await resetDatabaseForTest();
    mockPollConnection.mockReset();
    sentryCaptureMessage.mockReset();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('does not deactivate on a single auth failure (below threshold)', async () => {
    const conn = buildPasswordConnection();
    await insertConnection(conn);

    const authErr = new Error('Command failed') as Error & { responseText?: string };
    authErr.responseText = 'Authentication failed.';
    mockPollConnection.mockRejectedValue(authErr);

    const { req, res } = mockReqRes();
    await handler(req, res);

    const updated = await getConnection(conn.user_id, conn.email);
    expect(updated.is_active).toBe(true);
    expect(Number(updated.consecutive_failures)).toBe(1);
  });

  it('deactivates after 5 consecutive auth failures', async () => {
    const conn = buildPasswordConnection({ consecutive_failures: 4 });
    await insertConnection(conn);

    const authErr = new Error('Command failed') as Error & { responseText?: string };
    authErr.responseText = 'LOGIN failed.';
    mockPollConnection.mockRejectedValue(authErr);

    const { req, res } = mockReqRes();
    await handler(req, res);

    const updated = await getConnection(conn.user_id, conn.email);
    expect(updated.is_active).toBe(false);
    expect(updated.last_failure_reason).toMatch(/IMAP auth failure \(5 consecutive\)/);
  });

  it('resets counter on successful poll', async () => {
    const conn = buildPasswordConnection({ consecutive_failures: 3 });
    await insertConnection(conn);

    mockPollConnection.mockResolvedValue({ processed: 0, repliesProcessed: 0, highestUid: 0 });

    const { req, res } = mockReqRes();
    await handler(req, res);

    const updated = await getConnection(conn.user_id, conn.email);
    expect(Number(updated.consecutive_failures)).toBe(0);
    expect(updated.is_active).toBe(true);
  });

  it('non-auth failures still accumulate without deactivation and fire Sentry at threshold 3', async () => {
    const conn = buildPasswordConnection({ consecutive_failures: 2 });
    await insertConnection(conn);

    mockPollConnection.mockRejectedValue(new Error('Connection timeout'));

    const { req, res } = mockReqRes();
    await handler(req, res);

    const updated = await getConnection(conn.user_id, conn.email);
    expect(updated.is_active).toBe(true);
    expect(Number(updated.consecutive_failures)).toBe(3);
    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      'IMAP connection repeatedly failing',
      expect.objectContaining({ level: 'error' })
    );
  });
});
```

**Verification after commit:**
- All 4 new tests pass
- `pnpm run lint` — clean on modified files
- Typecheck clean on both files
- No regressions in `EmailConnectionRecovery.test.ts`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const out = execFileSync(process.execPath, ['tools/posthog-setup.mjs', '--dry-run'], { encoding: 'utf8' });

test('PostHog 設定腳本: 自己取專案金鑰並提示填進設定', () => {
  assert.match(out, /GET .*\/api\/projects\/[^/\s]+\/?\s/);
  assert.match(out, /posthogKey/);
});
test('PostHog 設定腳本: 儀表板有各遊戲平均遊玩時間', () => {
  assert.match(out, /各遊戲平均遊玩時間/);
});

// e2e 輔助: 在暫存資料夾起一個乾淨的 wrangler pages dev(含本機 D1), 用本機 Chrome 開頁
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WRANGLER = join('node_modules', 'wrangler', 'bin', 'wrangler.js');

export async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), 'pvd-e2e-'));
  const port = 8800 + Math.floor(Math.random() * 190);
  execFileSync(process.execPath, [WRANGLER, 'd1', 'migrations', 'apply', 'pvd', '--local', '--persist-to', dir], { stdio: 'ignore' });
  const proc = spawn(process.execPath, [WRANGLER, 'pages', 'dev', 'site', '--port', String(port), '--persist-to', dir], { stdio: 'ignore' });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return {
    url,
    // 直接對本機 D1 下 SQL(準備測試資料用)
    sql(command) {
      const out = execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', 'pvd', '--local', '--persist-to', dir, '--json', '--command', command], { encoding: 'utf8' });
      return JSON.parse(out)[0].results;
    },
    async stop() {
      proc.kill();
      await new Promise(r => setTimeout(r, 500));
      try { rmSync(dir, { recursive: true, force: true }); } catch {}
    },
  };
}

export const PC = { viewport: { width: 1280, height: 800 } };
export const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
export const PHONE_L = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };

export async function openBrowser() {
  return chromium.launch({ executablePath: CHROME });
}

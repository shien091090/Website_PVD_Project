import { HttpError } from './http.js';

// 社群貼文短連結: /s/<代碼> → 查出平台、活動、貼文代號與導連頁, 帶著來源跳到那一頁
export const PAGES = ['', 'play', 'vote', 'develop'];
export const CODE_RE = /^[A-Za-z0-9]{6,12}$/;
const SLUG_RE = /^[a-z0-9-]{1,40}$/;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // 去掉容易看錯的 0 O 1 l I

export const newCode = (len = 7) => [...crypto.getRandomValues(new Uint8Array(len))].map(b => ALPHA[b % ALPHA.length]).join('');

const shape = r => r && { code: r.code, source: r.source, campaign: r.campaign, content: r.content, page: r.page, note: r.note || '', createdAt: r.created_at };

export function cleanParams(body) {
  const v = k => String(body?.[k] ?? '').trim();
  const source = v('source'), campaign = v('campaign'), content = v('content'), page = v('page');
  if (source && !SLUG_RE.test(source)) throw new HttpError(400, 'bad_source'); // 空白 = 不指定平台
  if (campaign && !SLUG_RE.test(campaign)) throw new HttpError(400, 'bad_campaign');
  if (content && !SLUG_RE.test(content)) throw new HttpError(400, 'bad_content');
  if (!PAGES.includes(page)) throw new HttpError(400, 'bad_page');
  const note = v('note').slice(0, 200);
  return { source, campaign, content, page, note };
}

// 同一組參數重複產生時回傳既有的代碼, 貼出去的連結才不會一組參數好幾條
export async function createLink(db, params, now) {
  const p = cleanParams(params);
  const find = () => db.prepare('SELECT * FROM links WHERE source = ? AND campaign = ? AND content = ? AND page = ?')
    .bind(p.source, p.campaign, p.content, p.page).first();
  const old = await find();
  // 備註不算在參數裡: 同一組參數沿用舊代碼, 有填新備註就更新備註
  const keep = async row => {
    if (p.note && p.note !== row.note) { await db.prepare('UPDATE links SET note = ? WHERE code = ?').bind(p.note, row.code).run(); row = { ...row, note: p.note }; }
    return { ...shape(row), created: false };
  };
  if (old) return keep(old);
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      await db.prepare('INSERT INTO links (code, source, campaign, content, page, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(code, p.source, p.campaign, p.content, p.page, p.note, now).run();
      return { code, ...p, createdAt: now, created: true };
    } catch (e) {
      const dup = await find(); // 同時有人產生同一組
      if (dup) return keep(dup);
    }
  }
  throw new HttpError(500, 'code_collision');
}

export async function findLink(db, code) {
  if (!CODE_RE.test(code || '')) return null;
  return shape(await db.prepare('SELECT * FROM links WHERE code = ?').bind(code).first());
}

export async function allLinks(db) {
  const { results } = await db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
  return results.map(shape);
}

// 交給前台的來源資料: 放在短效 cookie, 前台讀到就刪
export const LINK_COOKIE = 'pvd_link';
export const linkCookie = l => `${LINK_COOKIE}=${encodeURIComponent(JSON.stringify({ c: l.code, s: l.source, ca: l.campaign, co: l.content }))}; Max-Age=600; Path=/; Secure; SameSite=Lax`;

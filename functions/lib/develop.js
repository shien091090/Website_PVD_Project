import { HttpError } from './http.js';

// 開發頁內容(後台編輯): 驗證後整份存成一版; 最新一版就是線上內容
export const LIMITS = { title: 60, updated: 20, sections: 20, secTitle: 40, secBody: 3000, developer: 40, studio: 80, email: 120, links: 8, label: 20, url: 300, bio: 1000 };
export const LOGO_KEY = /^logo\/[a-z0-9-]{1,40}\.(png|jpg|webp|svg)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v, max, code) => {
  if (v == null) return '';
  if (typeof v !== 'string') throw new HttpError(400, code);
  const s = v.replace(/\r\n?/g, '\n').trim();
  if (s.length > max) throw new HttpError(400, code);
  return s;
};

// 台灣時間的今天, 格式 2026/11/05
export const today = now => new Date(now + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '/');

export function cleanContent(c, now) {
  if (!c || typeof c !== 'object') throw new HttpError(400, 'bad_content');
  const sections = c.sections ?? [];
  const links = c.links ?? [];
  if (!Array.isArray(sections) || sections.length > LIMITS.sections) throw new HttpError(400, 'too_many_sections');
  if (!Array.isArray(links) || links.length > LIMITS.links) throw new HttpError(400, 'too_many_links');
  const out = {
    title: str(c.title, LIMITS.title, 'bad_title'),
    autoDate: c.autoDate === true,
    updated: str(c.updated, LIMITS.updated, 'bad_updated'),
    sections: sections.map(s => ({ title: str(s?.title, LIMITS.secTitle, 'bad_section_title'), body: str(s?.body, LIMITS.secBody, 'bad_section_body') }))
      .filter(s => s.title || s.body),
    developer: str(c.developer, LIMITS.developer, 'bad_developer'),
    studio: str(c.studio, LIMITS.studio, 'bad_studio'),
    email: str(c.email, LIMITS.email, 'bad_email'),
    links: links.map(l => ({ label: str(l?.label, LIMITS.label, 'bad_link'), url: str(l?.url, LIMITS.url, 'bad_link') }))
      .filter(l => l.label || l.url),
    bio: str(c.bio, LIMITS.bio, 'bad_bio'),
    logo: str(c.logo, 60, 'bad_logo'),
  };
  if (out.email && !EMAIL.test(out.email)) throw new HttpError(400, 'bad_email');
  if (out.links.some(l => !l.label || !/^https?:\/\/\S+$/.test(l.url))) throw new HttpError(400, 'bad_link');
  if (out.sections.some(s => !s.title)) throw new HttpError(400, 'bad_section_title');
  if (out.logo && !LOGO_KEY.test(out.logo)) throw new HttpError(400, 'bad_logo');
  if (out.autoDate) out.updated = today(now);
  return out;
}

const row = r => r && { id: r.id, content: JSON.parse(r.content), publishedAt: r.published_at, publishedBy: r.published_by };

export async function current(db) {
  return row(await db.prepare('SELECT * FROM develop_versions ORDER BY id DESC LIMIT 1').first());
}

export async function history(db, limit = 20) {
  const { results } = await db.prepare('SELECT id, published_at, published_by FROM develop_versions ORDER BY id DESC LIMIT ?').bind(limit).all();
  return results.map(r => ({ id: r.id, publishedAt: r.published_at, publishedBy: r.published_by }));
}

export async function publish(db, content, now, by) {
  const c = cleanContent(content, now);
  const r = await db.prepare('INSERT INTO develop_versions (content, published_at, published_by) VALUES (?, ?, ?)').bind(JSON.stringify(c), now, by || '').run();
  return { id: r.meta.last_row_id, content: c, publishedAt: now, publishedBy: by || '' };
}

// 退回: 把舊版內容複製成新的一版(紀錄不會被改寫); 舊版勾了自動日期就換成今天
export async function revert(db, id, now, by) {
  const old = row(await db.prepare('SELECT * FROM develop_versions WHERE id = ?').bind(id).first());
  if (!old) throw new HttpError(404, 'not_found');
  return publish(db, old.content, now, by);
}

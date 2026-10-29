export class HttpError extends Error {
  constructor(status, code, message = code) { super(message); this.status = status; this.code = code; }
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

export const fail = (status, code, message = code) => json({ error: { code, message } }, status);

export async function readJson(request, maxBytes = 4096) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(400, 'bad_json');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'bad_json'); }
}

// 測試可以在 context.data 注入 now / verify; 正式環境用預設
export const nowOf = ctx => (ctx.data?.now ? ctx.data.now() : Date.now());

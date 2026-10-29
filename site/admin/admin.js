import { GAMES } from '../js/games.js';

const $ = id => document.getElementById(id);
export const fmt = ms => new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function api(path, method = 'GET', body) {
  const r = await fetch('/api/admin/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => null);
  if (r.status === 401) { document.querySelector('main').innerHTML = '<p class="err">沒有後台權限，請用指定的 email 登入。</p>'; throw new Error('401'); }
  if (!r.ok) throw new Error(d?.error?.code || r.status);
  return d;
}

// 分頁籤
const tabs = {};
export function onTab(name, fn) { tabs[name] = fn; }
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main section').forEach(s => { s.hidden = s.id !== 'tab-' + b.dataset.tab; });
  tabs[b.dataset.tab]?.();
}));

// ---- 留言 ----
$('cgame').innerHTML = GAMES.map(g => `<option value="${g.code}">${esc(g.name)}</option>`).join('');
const alertLine = err => { $('cstat').innerHTML = `<span class="err">操作失敗：${esc(err.message)}</span>`; };
async function loadComments() {
  const game = $('cgame').value;
  $('cstat').textContent = '讀取中…';
  try {
    const [{ comments }, locks] = await Promise.all([api('comments?game=' + game), api('locks')]);
    $('lock').checked = locks[game];
    const live = comments.filter(c => !c.deleted).length;
    $('cstat').textContent = `顯示中 ${live} 則・已刪除 ${comments.length - live} 則`;
    $('clist').innerHTML = comments.map(c => `<tr class="${c.deleted ? 'del' : ''}"><td>${fmt(c.createdAt)}</td><td class="t">${esc(c.body)}</td>
      <td>${c.deleted ? '' : `<button class="b danger" data-del="${c.id}">刪除</button>`}</td></tr>`).join('') || '<tr><td colspan="3" class="msg">沒有留言</td></tr>';
  } catch (e) { if (e.message !== '401') $('cstat').innerHTML = `<span class="err">讀取失敗：${esc(e.message)}</span>`; }
}
$('cgame').addEventListener('change', loadComments);
$('lock').addEventListener('change', async e => {
  try { await api('locks', 'PUT', { game: $('cgame').value, locked: e.target.checked }); }
  catch (err) { e.target.checked = !e.target.checked; alertLine(err); }
});
// 刪除用兩段式按鈕: 第一下變「確定刪除？」, 3 秒內再按才刪
$('clist').addEventListener('click', async e => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  if (!b.classList.contains('arm')) {
    b.classList.add('arm'); b.textContent = '確定刪除？';
    setTimeout(() => { b.classList.remove('arm'); b.textContent = '刪除'; }, 3000);
    return;
  }
  b.disabled = true;
  try { await api('comments?id=' + b.dataset.del, 'DELETE'); loadComments(); } catch (err) { alertLine(err); b.disabled = false; }
});
onTab('comments', loadComments);

// ---- 連結產生 ----
const slug = v => v.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
function buildLink() {
  const q = new URLSearchParams();
  [['utm_source', 'usrc'], ['utm_campaign', 'ucamp'], ['utm_content', 'ucont']].forEach(([k, id]) => { const v = slug($(id).value); if (v) q.set(k, v); });
  const page = $('upage').value;
  $('uout').value = `${location.origin}/?${q}${page ? '#' + page : ''}`;
  $('umsg').textContent = q.get('utm_source') ? '' : '請填平台';
}
['usrc', 'ucamp', 'ucont', 'upage'].forEach(id => $(id).addEventListener('input', buildLink));
$('ucopy').addEventListener('click', async () => {
  buildLink();
  try { await navigator.clipboard.writeText($('uout').value); $('umsg').textContent = '已複製'; } catch { $('uout').select(); $('umsg').textContent = '請手動複製'; }
});
buildLink();

// ---- 投票: 輪次清單、即時票數、同票指定勝出; 時間一律台灣時間 ----
const toInput = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 16);
const fromInput = v => Date.parse(v + ':00+08:00');
const PHASE = { upcoming: '尚未開始', live: '進行中', ended: '已結束' };
const nameOf = code => GAMES.find(g => g.code === code)?.name || code;
async function loadVote() {
  const box = $('vbox');
  box.innerHTML = '<p class="msg">讀取中…</p>';
  let d;
  try { d = await api('rounds'); } catch (e) { if (e.message !== '401') box.innerHTML = `<p class="err">讀取失敗：${esc(e.message)}</p>`; return; }
  const max = r => Math.max(1, ...Object.values(r.counts));
  box.innerHTML = `
    <div class="card"><b>新增一輪</b>
      <div class="row" style="margin-top:8px"><label>開始 <input type="datetime-local" id="nstart"></label><label>截止 <input type="datetime-local" id="nend"></label>
      <button class="b" id="nadd">新增</button><span class="msg" id="nmsg"></span></div></div>` +
    (d.rounds.map(r => `
    <div class="card" data-id="${r.id}"><b>第 ${r.id} 輪</b>・${PHASE[r.phase]}・共 ${r.total} 票${r.winner ? `・勝出：${esc(nameOf(r.winner))}（後台指定）` : ''}
      <div class="row" style="margin-top:8px"><label>開始 <input type="datetime-local" class="rs" value="${toInput(r.startsAt)}"></label>
        <label>截止 <input type="datetime-local" class="re" value="${toInput(r.endsAt)}"></label><button class="b rsave">儲存時間</button><span class="msg rmsg"></span></div>
      <div class="bars">${GAMES.map(g => `<div><span>${esc(g.name)}</span><span style="display:inline-block;height:12px;background:#2fc9ed;width:${r.counts[g.code] / max(r) * 240}px"></span><span>${r.counts[g.code]}</span></div>`).join('')}</div>
      ${r.phase === 'ended' && r.tie ? `<div class="row" style="margin-top:8px"><span class="err">同票，請指定勝出：</span>
        <select class="wsel">${GAMES.filter(g => !r.total || r.counts[g.code] === max(r)).map(g => `<option value="${g.code}" ${r.winner === g.code ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <button class="b wset">指定</button><span class="msg wmsg"></span></div>` : ''}
    </div>`).join('') || '<p class="msg">還沒有任何一輪。</p>');
  $('nadd').addEventListener('click', async () => {
    try { await api('rounds', 'POST', { startsAt: fromInput($('nstart').value), endsAt: fromInput($('nend').value) }); loadVote(); }
    catch (e) { $('nmsg').innerHTML = `<span class="err">${e.message === 'bad_times' ? '截止要晚於開始' : esc(e.message)}</span>`; }
  });
  box.querySelectorAll('.card[data-id]').forEach(card => {
    const id = +card.dataset.id;
    card.querySelector('.rsave').addEventListener('click', async () => {
      try { await api('rounds', 'PUT', { id, startsAt: fromInput(card.querySelector('.rs').value), endsAt: fromInput(card.querySelector('.re').value) }); loadVote(); }
      catch (e) { card.querySelector('.rmsg').innerHTML = `<span class="err">${e.message === 'bad_times' ? '截止要晚於開始' : esc(e.message)}</span>`; }
    });
    card.querySelector('.wset')?.addEventListener('click', async () => {
      try { await api('winner', 'PUT', { roundId: id, game: card.querySelector('.wsel').value }); loadVote(); }
      catch (e) { card.querySelector('.wmsg').innerHTML = `<span class="err">${esc(e.message)}</span>`; }
    });
  });
}
onTab('vote', loadVote);

loadComments();

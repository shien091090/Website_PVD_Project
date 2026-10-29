// 子頁頁首: 首頁鈕 + P/V/D 頁籤 (目前頁黑框) + 右側頁面標題
const TABS = [['play', 'P', 'lay', '試玩', 'var(--red)'], ['vote', 'V', 'ote', '投票', 'var(--teal)'], ['develop', 'D', 'evelop', '開發日誌', 'var(--yellow)']];

export function renderHeaders() {
  document.querySelectorAll('.sh').forEach(h => {
    const cur = h.dataset.cur;
    h.insertAdjacentHTML('afterbegin',
      `<a class="homebtn" href="#"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>首頁</a><span class="sep"></span>
       <nav class="tabs" aria-label="分頁">${TABS.map(([k, l, , zh, c]) =>
        `<a class="tab${k === cur ? ' cur' : ''}" data-k="${k}" href="#${k}" ${k === cur ? 'aria-current="page"' : ''} aria-label="${zh}"><span class="pl" style="--c:${c}">${l}</span>${k === 'vote' ? '<span class="badge">End</span>' : ''}</a>`).join('')}</nav>`);
    const [, l, w, zh, c] = TABS.find(t => t[0] === cur);
    h.insertAdjacentHTML('beforeend', `<h1 class="ptitle" data-k="${cur}" aria-label="${zh}"><span class="pl" style="--c:${c}">${l}</span><b>${w}</b><span>${zh}</span></h1>`);
  });
}

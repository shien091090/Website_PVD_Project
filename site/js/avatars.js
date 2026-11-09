// 留言頭像: 16×16 像素角色; 留言只存頭像編號(順序固定, 新角色只能加在最後)
const K = '#2d2144';
const BGS = ['#aaefd5', '#f29cac', '#f5e291', '#2fc9ed', '#4776c3', '#e0c64f'];
// 每個角色: 名稱, 調色盤, 16 行 × 16 格 ('.' 透明, K/E 深紫)
const CHARS = [
  ['吟遊詩人史萊姆', { H: '#f5554a', B: '#f5e291', F: '#fffaf0', G: '#6fd6a8', L: '#d9fff0' }, [
    '...........FF...','..........FFF...','.....KKKKFFF....','....KHHHHKF.....','...KHHHHHHK.....','..KHHHHHHHHK....','.KBBBBBBBBBBK...','.KGGGGGGGGGGGK..',
    'KGLLGGGGGGGGGGK.','KGLGGGGGGGGGGGK.','KGGGEGGGGGEGGGK.','KGGGEGGGGGEGGGK.','KGGGGGGGGGGGGGK.','KGGGGGGGGGGGGGK.','.KGGGGGGGGGGGK..','..KKKKKKKKKKK...']],
  ['頭上長角的小狗', { H: '#f5e291', D: '#e8b07a', d: '#c48450', W: '#fff8ec', C: '#f29cac', N: K }, [
    '...KK......KK...','..KHK......KHK..','..KHHK....KHHK..','...KHHKKKKHHK...','.KKKDDDDDDDDKKK.','KddKDDDDDDDDKddK','KddKDDDDDDDDKddK','KddKDEDDDDEDKddK',
    '.KKKDEDDDDEDKKK.','...KCDDNNDDCK...','...KDDDDDDDDK...','....KKDDDDKK....','...KDDWWWWDDK...','...KDDWWWWDDK...','...KDDDDDDDDK...','....KKKKKKKK....']],
  ['白鬍子哥布林爺爺', { G: '#7cc46a', g: '#5aa04c', W: '#f4f2ee', R: '#9a6a44' }, [
    '................','....KKKKKKKK....','...KGGGGGGGGK...','..KGGGGGGGGGGK..','K.KGWWGGGGWWGK.K','KGKGGEGGGGEGGKGK','.KKGGGGggGGGGKK.','...KWGGggGGWK...',
    '...KWWWWWWWWK...','..KRKWWWWWWKRK..','.KRRKWWWWWWKRRK.','.KRRRKWWWWKRRRK.','.KRRRRKWWKRRRRK.','.KRRRRRKKRRRRRK.','.KRRRRRRRRRRRRK.','..KKKKKKKKKKKK..']],
  ['抱著花束的幽靈', { W: '#ffffff', s: '#d9d4ea', C: '#f29cac', P: '#f29cac', Y: '#f5e291', R: '#f5554a', G: '#5aa04c' }, [
    '................','.....KKKKKK.....','....KWWWWWWK....','...KWWWWWWWWK...','..KWWWWWWWWWWK..','..KWWEWWWWEWWK..','..KWWEWWWWEWWK..','..KWCWWWWWWCWK..',
    '.KWWWWWWWWPYPK..','KWWWWWWWWRPRYK..','.KWWWWWWWWGGK...','..KWWWWWWsGsWK..','..KWWWWWWWGWWK..','..KWWWWWWWWWWK..','..KWWWWWWWWWWK..','..KKKKKKKKKKKK..']],
  ['尾巴長香菇的幼龍', { T: '#5ccfc4', H: '#f5e291', C: '#f29cac', B: '#f5e291', V: '#ff9b7a', R: '#f5554a', W: '#ffffff', S: '#f3e6c8' }, [
    '................','...K..K.....KK..','..KHKKHK...KRRK.','.KTTTTTTK.KRWRRK','KTTTTTTTTKKWRRWK','KTTETTETTK.KKKK.','KTTETTETTK..KSK.','KTCTTTTCTK..KSK.',
    '.KTTTTTTK...KTK.','..KKTTKK...KTTK.','..KVTTTVK.KTTK..','.KVVBBBVVKTTK...','.KVTBBBTTTTK....','..KTBBBTTTK.....','..KTBBBTTK......','...KKKKKK.......']],
  ['背上噴蜂蜜的鯨魚', { B: '#4776c3', L: '#bfe3f7', C: '#f29cac', Y: '#f5b82e', y: '#ffe08a' }, [
    '....Y.YY.Y......','.....YyyY.......','....YyYYyY......','......YY........','......YY........','...KKKYYKKK.....','..KBBBBBBBBK....','.KBBBBBBBBBBK.KK',
    'KBBEBBBBBBBBBKBK','KBBBBBBBBBBBBBK.','KBCBBBBBBBBBBBK.','KLLLLLLLLBBBBK..','.KLLLLLLLLBBK...','..KKLLLLLLKK....','....KKKKKK......','................']],
  ['戴小禮帽的貓', { O: '#f5a35c', o: '#d97b3a', H: '#3b2f52', R: '#f5554a', W: '#fff8ec', C: '#f29cac', N: '#e06a7a' }, [
    '.....KKKKKK.....','.....KHHHHK.....','.....KRRRRK.....','...KKKKKKKKKK...','..KOKKKKKKKKOK..','..KOOOOOOOOOOK..','.KOOoOOOOOOoOOK.','.KOOEOOOOOOEOOK.',
    '.KOOEOOOOOOEOOK.','.KOCOOONNOOOCOK.','..KOOOOOOOOOOK..','...KKOOOOOOKK...','...KOOWWWWOOK...','..KOOOWWWWOOOK..','..KOoOOOOOOoOK..','...KKKKKKKKKK...']],
  ['一般男性', { h: '#6b4a2e', S: '#ffd9b8', C: '#f7a8a0', B: '#2fc9ed', W: '#ffffff' }, [
    '....KKKKKKKK....','...KhhhhhhhhK...','..KhhhhhhhhhhK..','..KhhhhhhhhhhK..','..KhhSShhSShhK..','..KhSSSSSSSShK..','..KSSESSSSESSK..','..KSSESSSSESSK..',
    '..KSCSSSSSSCSK..','...KSSSSSSSSK...','....KKSSSSKK....','...KBBBWWBBBK...','..KBBBBWWBBBBK..','.KSKBBBBBBBBKSK.','.KKKBBBBBBBBKKK.','...KKKKKKKKKK...']],
  ['一般女性', { h: '#a0522d', S: '#ffd9b8', C: '#f7a8a0', P: '#f29cac', W: '#ffffff', Y: '#f5e291' }, [
    '....KKKKKKKK....','...KhhhhhhhhK...','..KhhhhhhhhYYK..','..KhhhhhhhhhhK..','..KhhhSShhhhhK..','.KhhSSSSSSSShhK.','.KhSSESSSSESShK.','.KhSSESSSSESShK.',
    '.KhSCSSSSSSCShK.','.KhhSSSSSSSShhK.','.KhhKKSSSSKKhhK.','.KhKPPPWWPPPKhK.','.KKPPPPPPPPPPKK.','.KSKPPPPPPPPKSK.','.KKPPPPPPPPPPKK.','..KKKKKKKKKKKK..']],
  ['戴皇冠的青蛙', { F: '#7cc46a', l: '#d6f5b0', W: '#ffffff', Y: '#f5c842', R: '#f5554a', C: '#f29cac' }, [
    '......K.K.K.....','......KYKYK.....','......KYRYK.....','.KKK.KYYYK..KKK.','KWWEKFFFFFFKWWEK','KWWWKFFFFFFKWWWK','KFFFFFFFFFFFFFFK','KFCFFFFFFFFFFCFK',
    'KFFFFFFFFFFFFFFK','.KFFllllllllFFK.','..KFllllllllFK..','.KFFllllllllFFK.','KFFKllllllllKFFK','KFFKKllllllKKFFK','.KKK.KKKKKK.KKK.','................']],
  ['抱星星的貓頭鷹', { N: '#a0784f', l: '#f3e1c4', W: '#ffffff', Y: '#f5c842' }, [
    '..K..........K..','..KK........KK..','..KNKKKKKKKKNK..','.KNNNNNNNNNNNNK.','.KNWWWNNNNWWWNK.','.KWWEWWNNWWEWWK.','.KNWWWNYYNWWWNK.','.KNNNNNNNNNNNNK.',
    'KNNllllllllllNNK','KNlllllYllllllNK','KNNllYYYYYlllNNK','KNNNllYYYlllNNNK','.KNNlYlYlllNNNK.','..KNNllllllNNK..','...KKYKKKKYKK...','................']],
  ['小騎士', { M: '#c9cfe0', m: '#8d94ab', S: '#ffd9b8', R: '#f5554a', B: '#4776c3', Y: '#f5c842' }, [
    '........KRRK....','.......KRRK.....','....KKKKKKKK....','...KMMMMMMMMK...','..KMMMMMMMMMMK..','..KMMMMMMMMMMK..','..KmKKKKKKKKmK..','..KmKSESSESKmK..',
    '..KmKKKKKKKKmK..','..KMMMMMMMMMMK..','...KMMMMMMMMK...','....KKmmmmKK....','..KMMMBBBBMMMK..','.KSKMBBYYBBMKSK.','.KKKMBBBBBBMKKK.','...KKKKKKKKKK...']],
  ['見習魔女', { V: '#7d5bc4', v: '#4a3380', Y: '#f5c842', h: '#e07a5f', S: '#ffd9b8', C: '#f7a8a0' }, [
    '.........KK.....','........KVVK....','.......KVVK.....','......KVVVK.....','.....KVVVVVK....','....KYYYYYYYK...','.KKKKKKKKKKKKKK.','..KhhhhhhhhhhK..',
    '..KhSSSSSSSShK..','..KhSESSSSEShK..','..KhSCSSSSCShK..','..KhhKSSSSKhhK..','.KhKvvvYYvvvKhK.','.KKvvvvvvvvvvKK.','.KSKvvvvvvvvKSK.','..KKKKKKKKKKKK..']],
  ['戴耳機的機器人', { M: '#a9b8d6', D: K, c: '#2fc9ed', R: '#f5554a' }, [
    '.......KK.......','........K.......','....KRRRRRRK....','...KRKKKKKKRK...','..KRKMMMMMMKRK..','.KRRKMDDDDMKRRK.','.KRRKMcDDcMKRRK.','.KRRKMDDDDMKRRK.',
    '..KKKMMMMMMKKK..','......KMMK......','..KKKKKKKKKKKK..','..KMMMMMMMMMMK..','.KMKMMcMMcMMKMK.','.KMKMMMMMMMMKMK.','.KKKMMMMMMMMKKK.','...KKKKKKKKKK...']],
  ['吹泡泡的章魚', { O: '#f29cac', o: '#d96f86', C: '#ff6f91', b: '#8fd8f0' }, [
    '............bb..','.....KKKKKK.b..b','....KOOOOOOK.bb.','...KOOOOOOOOK...','...KOoOOOOoOK...','...KOEOOOOEOK...','...KOEOOOOEOK...','...KOCOOOOCOK...','..KOOOOOOOOOOK..','.KOOOOOOOOOOOOK.','.KOKKOKKKKOKKOK.','.KOKKOK..KOKKOK.','..K..K....K..K..','................','................','................']],
];

const svg = (pal, rows) => {
  const P = { K, E: K, ...pal };
  const rects = rows.map((r, y) => [...r].map((c, x) => P[c] ? `<rect x="${x + 2}" y="${y + 2}" width="1.02" height="1.02" fill="${P[c]}"/>` : '').join('')).join('');
  return `<svg viewBox="0 0 20 20" aria-hidden="true">${rects}</svg>`;
};
export const AV = CHARS.map(([name, pal, rows], i) => ({ name, bg: BGS[i % BGS.length], svg: svg(pal, rows) }));
export const avHtml = i => {
  const a = AV[i] || AV[0];
  return `<span class="av" style="--c:${a.bg}">${a.svg}</span>`;
};

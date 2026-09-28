export const EXTERIOR = {
  wall: { cream: { name: '暖奶油', color: '#efe0bc' }, sage: { name: '鼠尾草', color: '#a7baa0' }, rose: { name: '陶土粉', color: '#d6ac96' } },
  roof: { clay: { name: '赤陶瓦', color: '#bc7054' }, moss: { name: '苔绿瓦', color: '#607e6b' }, blue: { name: '雨蓝瓦', color: '#688e9c' } },
  door: { oak: { name: '橡木门', color: '#ac8156' }, green: { name: '深绿门', color: '#456b54' }, blue: { name: '海蓝门', color: '#58869a' } },
  porch: { open: { name: '露天门阶' }, canopy: { name: '有顶门廊' } },
  path: { stone: { name: '浅石小径', color: '#d4cdb5' }, wood: { name: '木板小径', color: '#bc956c' } },
};
export const YARD_ITEMS = [
  { id: 'bench', name: '木长椅', note: '给发呆留一个位置', w: 2, d: 1, symbol: '▱' },
  { id: 'tree', name: '小枫树', note: '窗外多一点树影', w: 1, d: 1, symbol: '♧' },
  { id: 'flowers', name: '花箱', note: '把颜色摆在门口', w: 1, d: 1, symbol: '✿' },
  { id: 'lamp', name: '庭院路灯', note: '晚上也有一盏暖光', w: 1, d: 1, symbol: '♧' },
  { id: 'laundry', name: '晾衣架', note: '像一个有人住的家', w: 2, d: 1, symbol: '⌑' },
  { id: 'birdbath', name: '浅水鸟盆', note: '给路过的小鸟留点水', w: 1, d: 1, symbol: '○' },
];
export const LIBRARY_STAGES = [
  { qid: 'read-s1', title: '打开一扇窗', change: '清走杂物，打开书屋的门窗。', memory: '连续三天的阅读，让这扇窗重新打开。' },
  { qid: 'read-s2', title: '安好街角书架', change: '把书架和门前的长椅安置好。', memory: '两周的阅读，在街角留下了一排书。' },
  { qid: 'read-s3', title: '为书屋亮一盏灯', change: '修好门廊，点亮窗边的阅读灯。', memory: '一本读完的书，让这间书屋亮了起来。' },
];

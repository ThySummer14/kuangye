// 地图短时空态的准备动作。文字一律取自既有出发手册（第一步或第一条起步办法），不新增有奖内容。
// 做完准备不算完成原任务、不发光；想留下记录，用户把它写成自己的一件事，目标与完成条件由用户自己写。
// minutes 是这一步的参考用时（编辑判断），只决定它出现在哪个短时组合里。
export const PREP_MOVES = [
  { trail: 'outside', from: 'soloMovie', source: 'step', minutes: 10 },
  { trail: 'outside', from: 'climb', source: 'step', minutes: 15 },
  { trail: 'outside', from: 'volunteer', source: 'start', minutes: 15 },
  { trail: 'settle', from: 'live-admin3', source: 'start', minutes: 15 },
  { trail: 'settle', from: 'fixthing', source: 'step', minutes: 10 },
  { trail: 'settle', from: 'live-laundry7', source: 'start', minutes: 15 },
  { trail: 'think', from: 'c0-book1', source: 'start', minutes: 15 },
  { trail: 'think', from: 'research', source: 'start', minutes: 15 },
  { trail: 'think', from: 'words500', source: 'start', minutes: 10 },
  { trail: 'think', from: 'poems10', source: 'step', minutes: 15 },
  { trail: 'make', from: 'design1', source: 'step', minutes: 15 },
  { trail: 'make', from: 'newword', source: 'step', minutes: 10 },
  { trail: 'connect', from: 'courage-meet3', source: 'step', minutes: 15 },
];

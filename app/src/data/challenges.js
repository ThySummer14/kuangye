// 原创内容，按 2026-10-06 用户授权进入 GitHub Pages 预览；尚待实际使用反馈。
export const CHALLENGER_ALBUM = { id: 'challenger', title: '挑战者', subtitle: '越界行动', status: 'pending-review' };
export const CHALLENGE_OPERATIONS = [
  {
    id: 'deep-work', code: 'CH-01', title: '破壁', category: 'mind', field: '深度专注', rating: 4, duration: '约 2 小时',
    premise: '选那件一直卡住你的难题。带着一个能被检查的答案回来。',
    objective: '为一个卡住的难题投入累计 90 分钟专注，完成一份可检查的解答、分析或方案。',
    firstStep: '写下唯一要解决的问题，把手机放到够不到的地方。可分段休息，专注时只做这一件。',
    terms: [
      { id: 'offline', title: '静默频道', weight: 1, condition: '全部专注时段关闭社交消息与短视频。' },
      { id: 'recall', title: '脱稿复现', weight: 2, condition: '结束后不看资料，写出推导过程与关键结论。' },
      { id: 'verify', title: '交叉验证', weight: 3, condition: '用另一种方法验证结果，记录差异并修正一版。' },
    ],
  },
  {
    id: 'hard-book', code: 'CH-02', title: '深潜', category: 'mind', field: '硬核阅读', rating: 5, duration: '分几次完成',
    premise: '走进一本有阻力的书。一直读到你能用自己的话，讲清它。',
    objective: '读完一本有难度的非虚构书中至少 100 页，写 800 字自己的理解，包含三个核心观点。',
    firstStep: '选一本你需要查词、思考或做笔记的书，确定 100 页的范围。',
    terms: [
      { id: 'sources', title: '追到源头', weight: 1, condition: '追读书中两条原始资料并记下来处。' },
      { id: 'explain', title: '无稿讲解', weight: 2, condition: '不看笔记，录下至少 5 分钟的清楚讲解。' },
      { id: 'debate', title: '反向论证', weight: 3, condition: '针对一个核心观点写出有证据的反驳，再回应它。' },
    ],
  },
  {
    id: 'prototype', code: 'CH-03', title: '从零造物', category: 'create', field: '独立创作', rating: 6, duration: '一个完整项目',
    premise: '让脑海中的东西，第一次在真实世界运行。',
    objective: '独立做出一件可使用的原创作品或工具，请一位真实使用者试用，并根据反馈完成一次修订。',
    firstStep: '定下一个具体使用场景和最小成品。可以是程序、桌游、刊物或一件手作。',
    terms: [
      { id: 'process', title: '留下过程', weight: 1, condition: '保留三个制作阶段的文字或图像记录。' },
      { id: 'constraint', title: '自设约束', weight: 2, condition: '开工前写下一条材料或工具限制，全程遵守并说明。' },
      { id: 'test', title: '真实检验', weight: 3, condition: '请三位使用者独立试用，修复他们共同指出的问题。' },
    ],
  },
  {
    id: 'speak', code: 'CH-04', title: '打破静音', category: 'courage', field: '表达勇气', rating: 5, duration: '准备 + 一次表达',
    premise: '把重要的话说出来。让它被真正的人听见。',
    objective: '准备一个自己的观点，向至少两位真实听众做 5 分钟完整表达，主动收集并回应三个问题。',
    firstStep: '约好愿意听的同学或朋友，写下你希望他们记住的那句话。线上线下都可以。',
    terms: [
      { id: 'record', title: '直面回放', weight: 1, condition: '征得同意后录音，回听并记录三处可以改善的地方。' },
      { id: 'no-script', title: '脱离逐字稿', weight: 2, condition: '正式表达仅用关键词提纲，不照读完整稿件。' },
      { id: 'again', title: '再次上场', weight: 3, condition: '根据反馈修改，并向另一组听众再讲一次。' },
    ],
  },
  {
    id: 'field-study', code: 'CH-05', title: '实地求证', category: 'live', field: '城市调查', rating: 4, duration: '半天至数天',
    premise: '别只在屏幕里找答案。去现场，把自己的判断带回来。',
    objective: '选一个身边的真实问题，实地观察三处公共地点，整理至少 12 条发现和一份 600 字调查结论。',
    firstStep: '选一个可观察的问题，例如街区无障碍或树荫分布，规划白天可安全到达的公共地点。',
    terms: [
      { id: 'evidence', title: '可追溯', weight: 1, condition: '为每条发现记录地点、日期和观察依据。' },
      { id: 'interview', title: '听另一面', weight: 2, condition: '征得同意后访谈两位相关的人，保留匿名摘记。' },
      { id: 'revisit', title: '二次求证', weight: 3, condition: '另一天重访三个地点，验证结论并写出变化。' },
    ],
  },
  {
    id: 'skill', code: 'CH-06', title: '陌生领域', category: 'create', field: '技能突破', rating: 6, duration: '至少 5 次练习',
    premise: '从“我不会”出发，直到独立完成一个拿得出手的结果。',
    objective: '选择一项尚不会的具体技能，完成五次各 45 分钟的练习，最后不跟教程独立做出一个完整成果。',
    firstStep: '把目标写成可验证的成果，例如独立弹奏一首曲子、做一个榫卯盒或写一个实用脚本。',
    terms: [
      { id: 'log', title: '每次有据', weight: 1, condition: '五次练习都记录日期、难点和解决办法。' },
      { id: 'variation', title: '迁移应用', weight: 2, condition: '在最终成果中加入教程没有讲过的一个变化。' },
      { id: 'teach', title: '教会别人', weight: 3, condition: '指导一位初学者完成核心步骤，并根据疑问改善讲解。' },
    ],
  },
];
export const CHALLENGE_MEDALS = [
  { id: 'breach', name: '越界者', english: 'FIRST BREACH', motif: 'breach', condition: '完成任意一项挑战', target: 1, metric: 'clears', inscription: '那条线，是你自己跨过去的。' },
  { id: 'resolve', name: '淬火意志', english: 'TEMPERED WILL', motif: 'resolve', condition: '完成挑战等级达到 8 的行动', target: 8, metric: 'best', inscription: '阻力留下的刻痕，成了新的锋面。' },
  { id: 'versatile', name: '多面锋芒', english: 'BEYOND ONE PATH', motif: 'versatile', condition: '完成三种不同的挑战项目', target: 3, metric: 'variety', inscription: '你没有停在最熟悉的那个自己。' },
  { id: 'summit', name: '临界之上', english: 'ABOVE THE LIMIT', motif: 'summit', condition: '完成挑战等级达到 12 的行动', target: 12, metric: 'best', inscription: '所有条件都在场，而你完成了。' },
];

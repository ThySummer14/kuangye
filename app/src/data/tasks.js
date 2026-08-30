// 任务库 v0.1（~70 个，中国语境草稿，来源：DESIGN.md §4.4）
// 字段：cat 领域 / diff 难度 / type 类型(once一次性 streak连击 total累积) / tier 层级(season赛季级 chapter本章)
// chapter: 0翻土 1播种 2发芽；target: streak=天数 total=数量；metric/mv: 完成后计入人生累计卡的量

export const CATS = {
  body: { name: '身体', attr: '体质', color: 'var(--c-body)' },
  mind: { name: '头脑', attr: '心智', color: 'var(--c-mind)' },
  create: { name: '创造', attr: '创造', color: 'var(--c-create)' },
  live: { name: '生活技能', attr: '自立', color: 'var(--c-live)' },
  courage: { name: '勇气与连接', attr: '勇气', color: 'var(--c-courage)' },
}
// 领域色（浅蓝主题版）：身体珊瑚 / 头脑靛蓝 / 创造琥珀 / 生活草绿 / 勇气紫藤

export const DIFF = {
  E: { name: '热身', xp: 10, color: '#7d7b68' },
  D: { name: '入门', xp: 25, color: '#8fae5d' },
  C: { name: '进阶', xp: 50, color: '#6b9bd1' },
  B: { name: '精英', xp: 100, color: '#a06bc9' },
  A: { name: '史诗', xp: 200, color: '#d98a4a' },
  S: { name: '传说', xp: 500, color: '#e0b13f' },
}

export const TYPES = { once: '一次性', streak: '连击', total: '累积' }
export const TYPE_ICONS = { once: '⚡', streak: '🔥', total: '📊' }

// 人生累计卡：按 metric 汇总
export const METRICS = {
  books: { label: '读过的书', unit: '本', icon: '📖' },
  km: { label: '走过的路', unit: '公里', icon: '🏃' },
  meddays: { label: '冥想', unit: '天', icon: '🧘' },
  dishes: { label: '做过的菜', unit: '道', icon: '🍳' },
  summit: { label: '登顶', unit: '座', icon: '⛰️' },
  poems: { label: '背过的诗', unit: '首', icon: '📿' },
  pieces: { label: '发布的作品', unit: '件', icon: '📮' },
  paintings: { label: '画过的小画', unit: '张', icon: '🎨' },
}

// 成长线：由易到难的任务链。stage>1 的任务需先完成同链前序阶段才解锁（不上任务板）。
export const CHAINS = {
  run: { name: '跑步', icon: '🏃', desc: '从 2 公里到 10 公里' },
  swim: { name: '游泳', icon: '🏊', desc: '从怕水到畅游 200 米' },
  read: { name: '阅读', icon: '📖', desc: '从每天 10 分钟到一年 12 本' },
  meditate: { name: '冥想', icon: '🧘', desc: '从 3 次尝试到 30 天不间断' },
  cook: { name: '厨艺', icon: '🍳', desc: '从番茄炒蛋到宴请朋友' },
}

export const TASKS = [
  // ———— 身体（赛季级） ————
  { id: 'run-s1', cat: 'body', diff: 'D', type: 'once', tier: 'season', chain: 'run', stage: 1, title: '完成第一次 2 公里慢跑', desc: '不用快，跑完就算。', metric: 'km', mv: 2 },
  { id: 'run5k', cat: 'body', diff: 'C', type: 'once', tier: 'season', chain: 'run', stage: 2, title: '连续跑完 5 公里不停歇', desc: '中途可以慢，但不能停。', metric: 'km', mv: 5 },
  { id: 'fitgood', cat: 'body', diff: 'C', type: 'once', tier: 'season', title: '体测冲到「良好」以上', desc: '本学年体测成绩达成，才算。' },
  { id: 'swim-s1', cat: 'body', diff: 'D', type: 'once', tier: 'season', chain: 'swim', stage: 1, title: '迈出第一步：报个游泳班', desc: '或完成第一次下水。克服怕水，从这一步开始。' },
  { id: 'swim-s2', cat: 'body', diff: 'C', type: 'once', tier: 'season', chain: 'swim', stage: 2, title: '连续游完 25 米', desc: '第一段不带停的距离。' },
  { id: 'swim200', cat: 'body', diff: 'B', type: 'once', tier: 'season', chain: 'swim', stage: 3, title: '学会游泳，连续游 200 米', desc: '不怕水的那一刻，就赢了一半。' },
  { id: 'climb', cat: 'body', diff: 'C', type: 'once', tier: 'season', title: '爬一座山，到达山顶', desc: '下山时记得回头看一眼来路。', metric: 'summit', mv: 1 },
  { id: 'cold30', cat: 'body', diff: 'B', type: 'streak', tier: 'season', target: 30, title: '连续 30 天洗冷水澡', desc: '每天早上和本能对抗一次。' },
  { id: 'walk10k', cat: 'body', diff: 'A', type: 'streak', tier: 'season', target: 90, title: '连续 90 天每天走 1 万步', desc: '把屏幕时间换成路上的时间。', metric: 'km', mv: 630 },
  { id: 'handstand', cat: 'body', diff: 'A', type: 'once', tier: 'season', title: '学会倒立，稳定 10 秒', desc: '换一个角度看世界。' },
  { id: 'fast24', cat: 'body', diff: 'C', type: 'once', tier: 'season', title: '轻断食 24 小时', desc: '观察自己的饥饿、情绪和念头。' },
  { id: 'martial30', cat: 'body', diff: 'B', type: 'streak', tier: 'season', target: 30, title: '练一项格斗/对抗运动 30 天', desc: '拳击、巴柔、散打，随便哪个。' },
  { id: 'sleep30', cat: 'body', diff: 'A', type: 'streak', tier: 'season', target: 30, title: '连续 30 天 23:30 前睡觉', desc: '熬夜借来的，白天都要还。' },
  { id: 'run10k', cat: 'body', diff: 'A', type: 'once', tier: 'season', chain: 'run', stage: 3, title: '完成一次 10 公里跑', desc: '从 5 公里到 10 公里，中间隔着一个不肯放弃的人。', metric: 'km', mv: 10 },
  { id: 'earlyclass', cat: 'body', diff: 'B', type: 'once', tier: 'season', title: '一学期早八全勤', desc: '学期末自评：一次都没迟到，才算完成。' },

  // ———— 头脑（赛季级） ————
  { id: 'read-s1', cat: 'mind', diff: 'E', type: 'streak', tier: 'season', chain: 'read', stage: 1, target: 3, title: '连续 3 天，每天读 10 分钟', desc: '先让书出现在每一天里。' },
  { id: 'read-s2', cat: 'mind', diff: 'D', type: 'streak', tier: 'season', chain: 'read', stage: 2, target: 14, title: '连续 14 天，每天读 20 分钟', desc: '阅读开始成为习惯。' },
  { id: 'read-s3', cat: 'mind', diff: 'C', type: 'once', tier: 'season', chain: 'read', stage: 3, title: '一个月读完一本书', desc: '写 200 字短评收尾。', metric: 'books', mv: 1 },
  { id: 'med-s1', cat: 'mind', diff: 'D', type: 'once', tier: 'season', chain: 'meditate', stage: 1, title: '完成 3 次冥想尝试', desc: '每次 10 分钟，走神了就拉回来。' },
  { id: 'med30', cat: 'mind', diff: 'C', type: 'streak', tier: 'season', chain: 'meditate', stage: 2, target: 30, title: '连续 30 天冥想 10 分钟', desc: '一天不落。', metric: 'meddays', mv: 30 },
  { id: 'journal90', cat: 'mind', diff: 'B', type: 'streak', tier: 'season', target: 90, title: '连续 90 天晨间写日记', desc: '写给自己，不用写得好。' },
  { id: 'nosocial7', cat: 'mind', diff: 'B', type: 'once', tier: 'season', title: '整整一周不用社交网络', desc: '卸载或断网，回来时看看有什么变化。' },
  { id: 'books12', cat: 'mind', diff: 'S', type: 'total', tier: 'season', chain: 'read', stage: 4, target: 12, unit: '本', title: '一年读完 12 本书', desc: '一月一本，每本写 200 字短评。', metric: 'books' },
  { id: 'chess100', cat: 'mind', diff: 'B', type: 'total', tier: 'season', target: 100, unit: '盘', title: '学国际象棋/围棋，下完 100 盘', desc: '认真下，每一盘都复盘。' },
  { id: 'research', cat: 'mind', diff: 'B', type: 'once', tier: 'season', title: '深研一个一无所知的领域', desc: '写出一篇 3000 字综述，讲给外行听懂。' },
  { id: 'poems10', cat: 'mind', diff: 'D', type: 'total', tier: 'season', target: 10, unit: '首', title: '背诵 10 首触动你的诗', desc: '留给某个需要它的时刻。', metric: 'poems' },
  { id: 'silentday', cat: 'mind', diff: 'B', type: 'once', tier: 'season', title: '独自安静地度过一整天', desc: '一整天不碰屏幕，不说话也行。' },
  { id: 'ownstory', cat: 'mind', diff: 'A', type: 'once', tier: 'season', title: '从头到尾写下你自己的故事', desc: '写完为止，不管长短。' },
  { id: 'cetpass', cat: 'mind', diff: 'C', type: 'once', tier: 'season', title: '四六级过线', desc: '第一道门槛，先迈过去。' },
  { id: 'cet500', cat: 'mind', diff: 'B', type: 'once', tier: 'season', title: '四六级 500 分以上', desc: '过线之上，再高一段。' },
  { id: 'words500', cat: 'mind', diff: 'D', type: 'total', tier: 'season', target: 500, unit: '个', title: '30 天背 500 个新单词', desc: '每天 17 个，不多不少。' },

  // ———— 创造（赛季级） ————
  { id: 'cook-s1', cat: 'create', diff: 'E', type: 'once', tier: 'season', chain: 'cook', stage: 1, title: '学会第一道菜：番茄炒蛋', desc: '所有人厨艺的起点。' },
  { id: 'cook-s2', cat: 'create', diff: 'D', type: 'once', tier: 'season', chain: 'cook', stage: 2, title: '累计学会 3 道菜', desc: '能独立吃上自己做的饭了。', metric: 'dishes', mv: 3 },
  { id: 'cook10', cat: 'create', diff: 'B', type: 'once', tier: 'season', chain: 'cook', stage: 3, title: '学会 10 道菜，并宴请一次朋友', desc: '从零开始，一道一道学。', metric: 'dishes', mv: 10 },
  { id: 'instrument', cat: 'create', diff: 'B', type: 'once', tier: 'season', title: '用乐器完整演奏一首歌', desc: '录下来，哪怕磕磕绊绊。' },
  { id: 'publish', cat: 'create', diff: 'D', type: 'once', tier: 'season', title: '写点东西，公开发布', desc: '任何人可见，包括陌生人。', metric: 'pieces', mv: 1 },
  { id: 'yearlog', cat: 'create', diff: 'S', type: 'total', tier: 'season', target: 365, unit: '天', title: '整整一年记录生活', desc: '每天一张照片或一段话。' },
  { id: 'paint100', cat: 'create', diff: 'A', type: 'total', tier: 'season', target: 100, unit: '张', title: '画满 100 张小画', desc: '画得好不好不重要，画满才算。', metric: 'paintings' },
  { id: 'nopurpose', cat: 'create', diff: 'B', type: 'once', tier: 'season', title: '做一个没有观众也没有目标的项目', desc: '不为简历，不为涨粉，只为做它。' },
  { id: 'selfrec', cat: 'create', diff: 'D', type: 'once', tier: 'season', title: '录下自己说话，然后听回放', desc: '勇气需求高于技术需求。' },
  { id: 'fixthing', cat: 'create', diff: 'D', type: 'once', tier: 'season', title: '亲手修好一件坏掉的东西', desc: '螺丝刀就够，好奇心也够。' },
  { id: 'design1', cat: 'create', diff: 'D', type: 'once', tier: 'season', title: '从无到有设计一样东西', desc: '哪怕很小，从 0 到 1。' },
  { id: 'newword', cat: 'create', diff: 'E', type: 'once', tier: 'season', title: '发明一个新词，使用它 10 次', desc: '让它被至少一个人听懂。' },
  { id: 'shipweb', cat: 'create', diff: 'B', type: 'once', tier: 'season', title: '做一个网站或小游戏并上线', desc: '有公开链接才算。', metric: 'pieces', mv: 1 },

  // ———— 生活技能（赛季级） ————
  { id: 'nocook30', cat: 'live', diff: 'B', type: 'streak', tier: 'season', target: 30, title: '连续 30 天不点外卖', desc: '自己做饭，或去食堂。' },
  { id: 'skills10', cat: 'live', diff: 'C', type: 'total', tier: 'season', target: 10, unit: '项', title: '学会 10 项生活自理技能', desc: '缝补、换灯泡、修车胎、挂号、报税……' },
  { id: 'budget90', cat: 'live', diff: 'B', type: 'streak', tier: 'season', target: 90, title: '记账 90 天 + 存下自由基金', desc: '钱要看得见，才守得住。' },
  { id: 'solotrip', cat: 'live', diff: 'C', type: 'once', tier: 'season', title: '独自完成一次全流程旅行', desc: '自己做攻略、订票、住宿，一个人走。' },
  { id: 'license', cat: 'live', diff: 'B', type: 'once', tier: 'season', title: '考下驾照', desc: '趁学生时代便宜。' },
  { id: 'movehouse', cat: 'live', diff: 'A', type: 'once', tier: 'season', title: '搬一次家，全程自己搞定', desc: '打包、搬运、复原，一个人。' },

  // ———— 勇气与连接（赛季级） ————
  { id: 'meal4parents', cat: 'courage', diff: 'C', type: 'once', tier: 'season', title: '给爸妈做一顿完整的饭', desc: '三菜一汤，他们在座。' },
  { id: 'publictalk', cat: 'courage', diff: 'B', type: 'once', tier: 'season', title: '当众完成一次分享/演出', desc: '台下至少 10 个人。' },
  { id: 'askmentor', cat: 'courage', diff: 'B', type: 'once', tier: 'season', title: '约一位敬佩的人请教 30 分钟', desc: '主动发出的邀请才算。' },
  { id: 'soloEat', cat: 'courage', diff: 'E', type: 'once', tier: 'season', title: '一个人吃一顿正餐', desc: '不看手机的那种。' },
  { id: 'soloMovie', cat: 'courage', diff: 'D', type: 'once', tier: 'season', title: '一个人看一场电影', desc: '工作日白天的场次，效果最佳。' },
  { id: 'letter10y', cat: 'courage', diff: 'E', type: 'once', tier: 'season', title: '给 10 年后的自己写一封信', desc: '封好，设定一个打开的日子。' },
  { id: 'volunteer', cat: 'courage', diff: 'D', type: 'once', tier: 'season', title: '参加一次志愿活动', desc: '半天以上。' },
  { id: 'strangerchat', cat: 'courage', diff: 'B', type: 'once', tier: 'season', title: '和陌生人深聊 30 分钟以上', desc: '聊真的东西，不是寒暄。' },

  // ———— 第一章「翻土」 ————
  { id: 'c0-walk14', cat: 'body', diff: 'D', type: 'streak', tier: 'chapter', chapter: 0, target: 14, title: '连续 14 天每天走 8000 步', desc: '本章热身，先把身体摇醒。' },
  { id: 'c0-run3', cat: 'body', diff: 'D', type: 'once', tier: 'chapter', chapter: 0, title: '完成一次 3 公里跑', desc: '不用快，跑完就行。', metric: 'km', mv: 3 },
  { id: 'c0-sleep7', cat: 'body', diff: 'D', type: 'streak', tier: 'chapter', chapter: 0, target: 7, title: '连续 7 天 23:30 前睡觉', desc: '第一周，先赢在床上。' },
  { id: 'c0-med7', cat: 'mind', diff: 'D', type: 'streak', tier: 'chapter', chapter: 0, target: 7, title: '连续 7 天冥想 10 分钟', desc: '给大脑一个静音键。' },
  { id: 'c0-book1', cat: 'mind', diff: 'D', type: 'once', tier: 'chapter', chapter: 0, title: '读完一整本书，写 200 字短评', desc: '本月这本，由你选。', metric: 'books', mv: 1 },
  { id: 'c0-nosvideo', cat: 'mind', diff: 'E', type: 'once', tier: 'chapter', chapter: 0, title: '24 小时不碰短视频', desc: '试试看，天不会塌。' },
  { id: 'c0-cook3', cat: 'create', diff: 'D', type: 'once', tier: 'chapter', chapter: 0, title: '学会 3 道新菜', desc: '从最想吃的开始。', metric: 'dishes', mv: 3 },
  { id: 'c0-photo14', cat: 'create', diff: 'D', type: 'streak', tier: 'chapter', chapter: 0, target: 14, title: '每天一张照片，连续 14 天', desc: '开始记录，就已经在创作。' },
  { id: 'c0-skill3', cat: 'live', diff: 'D', type: 'once', tier: 'chapter', chapter: 0, title: '学会 3 项生活技能', desc: '缝扣子、换灯泡、报修，都算。' },
  { id: 'c0-tidy', cat: 'live', diff: 'E', type: 'once', tier: 'chapter', chapter: 0, title: '大扫除：扔掉 30 件东西', desc: '物理空间先清爽起来。' },
  { id: 'c0-call30', cat: 'courage', diff: 'E', type: 'once', tier: 'chapter', chapter: 0, title: '给爸妈打一通 30 分钟以上的电话', desc: '不是有事才打的那种。' },
  { id: 'c0-newfriend', cat: 'courage', diff: 'D', type: 'once', tier: 'chapter', chapter: 0, title: '认识一位新朋友，深聊 20 分钟', desc: '越过寒暄那一层。' },

  // ———— 第二章「播种」 ————
  { id: 'c1-pushup21', cat: 'body', diff: 'C', type: 'streak', tier: 'chapter', chapter: 1, target: 21, title: '连续 21 天每天 30 个俯卧撑', desc: '分三组也行，做完才算。' },
  { id: 'c1-ride20', cat: 'body', diff: 'D', type: 'once', tier: 'chapter', chapter: 1, title: '一次骑行 20 公里', desc: '傍晚出发最好。', metric: 'km', mv: 20 },
  { id: 'c1-journal21', cat: 'mind', diff: 'C', type: 'streak', tier: 'chapter', chapter: 1, target: 21, title: '连续 21 天晨间日记', desc: '三周，把习惯种下去。' },
  { id: 'c1-demo', cat: 'mind', diff: 'D', type: 'once', tier: 'chapter', chapter: 1, title: '学一样新东西，并向别人演示', desc: '教是最好的学。' },
  { id: 'c1-write1k', cat: 'create', diff: 'D', type: 'once', tier: 'chapter', chapter: 1, title: '写一篇 1000 字文章并发布', desc: '发布给真实世界。', metric: 'pieces', mv: 1 },
  { id: 'c1-handcraft', cat: 'create', diff: 'E', type: 'once', tier: 'chapter', chapter: 1, title: '手工做一件小物', desc: '折纸、木工、陶土，都行。' },
  { id: 'c1-budget7', cat: 'live', diff: 'E', type: 'streak', tier: 'chapter', chapter: 1, target: 7, title: '连续 7 天记账', desc: '先看清钱去了哪。' },
  { id: 'c1-askhelp', cat: 'courage', diff: 'D', type: 'once', tier: 'chapter', chapter: 1, title: '主动向人求助一次', desc: '示弱也是一种能力。' },

  // ———— 第三章「发芽」 ————
  { id: 'c2-walk30', cat: 'body', diff: 'C', type: 'streak', tier: 'chapter', chapter: 2, target: 30, title: '连续 30 天每天 8000 步', desc: '发芽期，稳住节奏。' },
  { id: 'c2-read30', cat: 'mind', diff: 'C', type: 'streak', tier: 'chapter', chapter: 2, target: 30, title: '连续 30 天睡前阅读 20 分钟', desc: '用书收尾一天。' },
  { id: 'c2-letter', cat: 'mind', diff: 'E', type: 'once', tier: 'chapter', chapter: 2, title: '给下学期的自己写一封信', desc: '写完封好，别偷看。' },
  { id: 'c2-film', cat: 'create', diff: 'D', type: 'once', tier: 'chapter', chapter: 2, title: '拍一支 1 分钟短片并发布', desc: '手机就够。', metric: 'pieces', mv: 1 },
  { id: 'c2-cook5', cat: 'create', diff: 'C', type: 'once', tier: 'chapter', chapter: 2, title: '菜单扩充到 5 道拿手菜', desc: '可以招待朋友的那种。', metric: 'dishes', mv: 2 },
  { id: 'c2-thanks', cat: 'courage', diff: 'E', type: 'once', tier: 'chapter', chapter: 2, title: '认真地向一个人道谢', desc: '说清楚谢的是什么。' },
  { id: 'c2-alone', cat: 'courage', diff: 'D', type: 'once', tier: 'chapter', chapter: 2, title: '一个人度过一个充实的周末', desc: '独处而不孤独。' },
]

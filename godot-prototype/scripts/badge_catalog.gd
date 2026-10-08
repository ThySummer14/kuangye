# Frozen definitions copied from Kuangye main 764e83d.
# Runtime constants mirror the JSON audit copies in data/.
extends RefCounted

const LIFETIME = [
  {
    "id": "life-cet6",
    "title": "英语六级600分以上",
    "category": "mind",
    "field": "求知",
    "objective": "六级成绩达到 600 分及以上。",
    "name": "越过六百",
    "english": "BEYOND 600",
    "inscription": "语言的高墙，终于成为远处的风景。",
    "ordinal": 1,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-novel",
    "title": "自己写一本小说",
    "category": "create",
    "field": "文字",
    "objective": "写完一本属于自己的小说，让故事走到结尾。",
    "name": "世界落笔",
    "english": "WORLDBUILDER",
    "inscription": "那些只存在于心里的地方，如今有人能够抵达。",
    "ordinal": 2,
    "needsDefinition": false,
    "supported": true
  },
  {
    "id": "life-vocal",
    "title": "制作一首术曲",
    "category": "create",
    "field": "音乐",
    "objective": "制作完成一首自己的术曲。",
    "name": "赋声者",
    "english": "SYNTHESIS",
    "inscription": "你把想说的话，交给了一个新生的声音。",
    "ordinal": 3,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-compose",
    "title": "编一首曲",
    "category": "create",
    "field": "音乐",
    "objective": "完成一首自己的曲子。",
    "name": "旋律初生",
    "english": "FIRST MOTIF",
    "inscription": "原本寂静的地方，从此有了你的旋律。",
    "ordinal": 4,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-painting",
    "title": "绘出一张优秀的画，板绘",
    "category": "create",
    "field": "绘画",
    "objective": "完成一张你认可为优秀的板绘作品。",
    "name": "光落于笔",
    "english": "LIGHTKEEPER",
    "inscription": "你看见的那束光，终于留在了画面里。",
    "ordinal": 5,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-pv",
    "title": "制作出一个pv",
    "category": "create",
    "field": "影像",
    "objective": "制作完成一个 PV。",
    "name": "时间剪影",
    "english": "FRAME BY FRAME",
    "inscription": "你让静止的画面，拥有了时间。",
    "ordinal": 6,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-mv",
    "title": "为自己的术曲制作MV",
    "category": "create",
    "field": "声画",
    "objective": "为自己制作的术曲，完成一支 MV。",
    "name": "声画同生",
    "english": "RESONANCE",
    "inscription": "你的声音与画面，在这里成为同一个作品。",
    "ordinal": 7,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-bilibili",
    "title": "经营自己的b站账号到1W粉丝",
    "category": "courage",
    "field": "传播",
    "objective": "将自己的 B 站账号经营到 1 万粉丝。",
    "name": "万人回响",
    "english": "TEN THOUSAND",
    "inscription": "你发出的声音，越过了一万次相遇。",
    "ordinal": 8,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-income",
    "title": "赚取第一百元",
    "category": "live",
    "field": "自立",
    "objective": "凭自己的劳动、技能或作品，累计赚到第一百元。",
    "name": "第一份回报",
    "english": "FIRST EARNED",
    "inscription": "第一份被认真交换的价值，来自你自己的双手。",
    "ordinal": 9,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-pixel",
    "title": "制作一个像素游戏",
    "category": "create",
    "field": "游戏",
    "objective": "制作出一个可以游玩的像素游戏。",
    "name": "方寸宇宙",
    "english": "PIXEL WORLD",
    "inscription": "小小的方格里，装得下你亲手创造的世界。",
    "ordinal": 10,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-math",
    "title": "学习数学",
    "category": "mind",
    "field": "求知",
    "objective": "完成自己为这次数学挑战定下的学习目标。",
    "name": "万象有解",
    "english": "THE PATTERN",
    "inscription": "混沌里，你辨认出一条清晰的线。",
    "ordinal": 11,
    "needsDefinition": true,
    "supported": false
  },
  {
    "id": "life-book",
    "title": "读第一本书",
    "category": "mind",
    "field": "阅读",
    "objective": "完整读完自己选择的第一本书。",
    "name": "第一扇窗",
    "english": "OPEN A WORLD",
    "inscription": "翻过最后一页时，你已经走到了别处。",
    "ordinal": 12,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-silksong",
    "title": "玩通关《空洞骑士：丝之歌》",
    "category": "courage",
    "field": "远征",
    "objective": "通关《空洞骑士：丝之歌》。",
    "name": "丝尽之处",
    "english": "THREAD'S END",
    "inscription": "穿过一次次坠落，你听见了抵达的回声。",
    "ordinal": 13,
    "needsDefinition": false,
    "supported": false
  },
  {
    "id": "life-essay",
    "title": "写出第一篇文章并发布到微信公众号",
    "category": "create",
    "field": "发表",
    "objective": "写完第一篇文章，并发布到自己的微信公众号。",
    "name": "向世界发信",
    "english": "INTO THE OPEN",
    "inscription": "这一页文字，终于离开了只属于你的房间。",
    "ordinal": 14,
    "needsDefinition": false,
    "supported": false
  }
]

const CONTRACT = [
  {
    "id": "breach",
    "name": "越界者",
    "condition": "完成任意一项加码行动",
    "metric": "clears",
    "target": 1,
    "supported": true
  },
  {
    "id": "resolve",
    "name": "淬火意志",
    "condition": "完成挑战等级达到 8 的行动",
    "metric": "best",
    "target": 8,
    "supported": true
  },
  {
    "id": "versatile",
    "name": "多面锋芒",
    "condition": "完成三种不同的挑战项目",
    "metric": "variety",
    "target": 3,
    "supported": false
  },
  {
    "id": "summit",
    "name": "临界之上",
    "condition": "完成挑战等级达到 12 的行动",
    "metric": "best",
    "target": 12,
    "supported": false
  }
]

const FIELD = {
  "id": "field-study",
  "title": "实地求证",
  "rating": 4,
  "objective": "选一个身边的真实问题，实地观察三处公共地点，整理至少 12 条发现和一份 600 字调查结论。",
  "terms": [
    {
      "id": "evidence",
      "title": "可追溯",
      "weight": 1,
      "condition": "为每条发现记录地点、日期和观察依据。"
    },
    {
      "id": "interview",
      "title": "听另一面",
      "weight": 2,
      "condition": "征得同意后访谈两位相关的人，保留匿名摘记。"
    },
    {
      "id": "revisit",
      "title": "二次求证",
      "weight": 3,
      "condition": "另一天重访三个地点，验证结论并写出变化。"
    }
  ]
}


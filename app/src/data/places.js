// 地图场所声明：地图路牌、顶栏标题与图标共用一份，组件里不再各存一份名字。
// tone 只决定路牌徽章的色调（表现层），不参与任何规则。
export const MAP_PLACES = [
  { id: "tasks", name: "任务岩壁", short: "岩壁", hint: "接一件真实的事", tone: "ember" },
  { id: "home", name: "小芽的家", short: "小家", hint: "布置与陪伴", tone: "moss" },
  { id: "shop", name: "林间集市", short: "集市", hint: "用光换家具", tone: "glow" },
  { id: "journal", name: "瞭望台 · 成长手记", short: "瞭望台", hint: "回望走过的路", tone: "lake" },
  { id: "library", name: "街角书屋", short: "书屋", hint: "阅读与问题", tone: "ink" },
  { id: "yard", name: "家门前的院子", short: "院子", hint: "花草与院落", tone: "leaf" },
  { id: "woodshop", name: "木器铺", short: "木器铺", hint: "扩建与外观", tone: "wood" },
  { id: "atelier", name: "小小画室", short: "画室", hint: "创作与作品集", tone: "plum" },
];

// 顶栏显示的当前场所（路由名 → 标题、图标）。
export const PLACE_TITLES = {
  tasks: ["任务岩壁", "tasks"],
  quest: ["任务岩壁", "tasks"],
  home: ["小芽的家", "home"],
  shop: ["林间集市", "shop"],
  panel: ["成长手记", "journal"],
  woodshop: ["木器铺", "woodshop"],
  yard: ["家门前的院子", "yard"],
  library: ["街角书屋", "library"],
  chains: ["成长线", "chains"],
  atelier: ["小小画室", "atelier"],
};

import { furnitureById } from "../data/furniture.js";
import { footprint, furnitureLayer } from "./placement.js";
// Half-metre cells are also the walk graph; rugs are walkable, solid furniture is not.
export function occupiedCells(home) {
  const blocked = new Set();
  for (const p of home.placed) {
    const item =
      furnitureById[home.inventory.find((i) => i.uid === p.uid)?.fid];
    if (!item || furnitureLayer(item) === "floor") continue;
    const f = footprint(item, p.rotation);
    for (let x = p.x; x < p.x + f.w; x++)
      for (let z = p.z; z < p.z + f.d; z++) blocked.add(`${x},${z}`);
  }
  return blocked;
}
export function walkPath(from, to, room, blocked) {
  const inside = (p) =>
    Number.isInteger(p.x) &&
    Number.isInteger(p.z) &&
    p.x >= 0 &&
    p.z >= 0 &&
    p.x < room.w &&
    p.z < room.d;
  const key = (p) => `${p.x},${p.z}`;
  if (!inside(from) || !inside(to) || blocked.has(key(to))) return [];
  const queue = [from],
    previous = new Map([[key(from), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(to)) {
      const path = [];
      let cursor = p;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous.get(key(cursor));
      }
      return path;
    }
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next = { x: p.x + dx, z: p.z + dz };
      if (inside(next) && !blocked.has(key(next)) && !previous.has(key(next))) {
        previous.set(key(next), p);
        queue.push(next);
      }
    }
  }
  return [];
}
export function nearestFree(point, room, blocked) {
  let best = null,
    distance = Infinity;
  for (let x = 0; x < room.w; x++)
    for (let z = 0; z < room.d; z++) {
      const d = (point.x - x) ** 2 + (point.z - z) ** 2;
      if (!blocked.has(`${x},${z}`) && d < distance) {
        best = { x, z };
        distance = d;
      }
    }
  return best;
}
export function approachFurniture(from, placed, item, room, blocked) {
  const size = footprint(item, placed.rotation),
    candidates = [];
  for (let x = placed.x; x < placed.x + size.w; x++) {
    candidates.push({ x, z: placed.z - 1 }, { x, z: placed.z + size.d });
  }
  for (let z = placed.z; z < placed.z + size.d; z++) {
    candidates.push({ x: placed.x - 1, z }, { x: placed.x + size.w, z });
  }
  if (furnitureLayer(item) === "floor")
    candidates.push({ x: placed.x, z: placed.z });
  return (
    candidates
      .map((c) => walkPath(from, c, room, blocked))
      .filter((p) => p.length)
      .sort((a, b) => a.length - b.length)[0] || []
  );
}
export const INTERACTIONS = {
  plant: {
    name: "一起浇浇花",
    action: "water",
    mood: "happy",
    text: "叶子喝饱水了，小芽也精神起来。",
    discovery: "小芽发现了家里的第一位绿叶朋友。",
  },
  flowers: {
    name: "闻闻这束花",
    action: "sniff",
    mood: "loved",
    text: "这朵花闻起来，像今天的好天气。",
  },
  moss: {
    name: "看看小森林",
    action: "sniff",
    mood: "curious",
    text: "原来这么小的地方，也住着一片森林。",
  },
  stand: {
    name: "照顾小花园",
    action: "water",
    mood: "happy",
    text: "每一盆都照顾到啦。",
  },
  sofa: {
    name: "请小芽坐一会儿",
    action: "sit",
    mood: "loved",
    text: "软软的，今天最喜欢这个角落。",
  },
  bed: {
    name: "让小芽打个盹",
    action: "sleep",
    mood: "sleepy",
    text: "呼……梦里也是暖暖的小家。",
  },
  stool: {
    name: "在这里歇歇脚",
    action: "sit",
    mood: "happy",
    text: "蹦跶累了，坐下来晃晃叶子。",
  },
  rug: {
    name: "在毯子上打个滚",
    action: "roll",
    mood: "celebrate",
    text: "这块地毯好软呀，再滚一圈。",
  },
  mat: {
    name: "坐下来晒太阳",
    action: "sit",
    mood: "proud",
    text: "晒到了，是暖暖的阳光。",
  },
  radio: {
    name: "一起听一首歌",
    action: "dance",
    mood: "celebrate",
    text: "这个节拍，小芽也会跟着摇摆。",
  },
  chime: {
    name: "听听风铃",
    action: "dance",
    mood: "happy",
    text: "叮——风也来我们家做客了。",
  },
  books: {
    name: "翻翻旧故事",
    action: "read",
    mood: "curious",
    text: "这一页的故事，小芽想和你一起看。",
  },
  shelf: {
    name: "一起读一会儿",
    action: "read",
    mood: "curious",
    text: "书架上又发现了一段小小的远方。",
  },
  lamp: {
    name: "点亮这盏灯",
    action: "light",
    mood: "loved",
    text: "灯亮了，小家又暖了一点。",
  },
  lantern: {
    name: "点亮一小团光",
    action: "light",
    mood: "loved",
    text: "就算天黑，小芽也找得到回家的路。",
  },
  fireplace: {
    name: "一起烤烤火",
    action: "sit",
    mood: "happy",
    text: "噼啪，今天的疲惫被烤化了。",
  },
  table: {
    name: "坐下喝杯茶",
    action: "tea",
    mood: "happy",
    text: "不着急，再坐一小会儿。",
  },
  desk: {
    name: "看看新点子",
    action: "read",
    mood: "proud",
    text: "你认真做的东西，小芽都喜欢。",
  },
  cushion: {
    name: "抱一抱软枕头",
    action: "roll",
    mood: "loved",
    text: "这个抱枕，小芽先替你抱一下。",
  },
  telescope: {
    name: "一起看看远方",
    action: "look",
    mood: "shocked",
    text: "看见了！远方好像也在闪闪发光。",
  },
  tapestry: {
    name: "看看墙上的远方",
    action: "look",
    mood: "curious",
    text: "等下次冒险，就去画里的地方。",
  },
};

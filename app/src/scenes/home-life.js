import * as THREE from "three";
import {
  occupiedCells,
  nearestFree,
  walkPath,
  approachFurniture,
  INTERACTIONS,
} from "../game/buddy-walk.js";
import { footprint, furnitureLayer } from "../game/placement.js";
import { roomOf } from "../game/room.js";
import { furnitureById } from "../data/furniture.js";
export function homeLife(engine, getHome, onMoment) {
  let cell = { x: 4, z: 4 },
    path = [],
    segment = 0,
    last = 0,
    idleUntil = 0,
    pending = null,
    action = null,
    signature = "",
    blocked = new Set();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas),
    effect = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      }),
    );
  effect.scale.set(0.6, 0.6, 0.6);
  effect.visible = false;
  engine.world.add(effect);
  function obstacles() {
    const h = getHome(),
      sig = JSON.stringify([h.placed, h.inventory.map((i) => [i.uid, i.fid])]);
    if (sig !== signature) {
      signature = sig;
      blocked = occupiedCells(h);
      if (path.some((p) => blocked.has(`${p.x},${p.z}`))) {
        path = [];
        pending = null;
      }
    }
    return blocked;
  }
  function plan(target, interaction) {
    const home = getHome(),
      room = roomOf(home),
      stepping = path.length > 0 && segment > 0,
      start = stepping ? path[0] : cell,
      next = walkPath(start, target, room, obstacles());
    if (!next.length) return false;
    path = stepping ? [start, ...next.slice(1)] : next.slice(1);
    if (!stepping) segment = 0;
    pending = interaction;
    return true;
  }
  function startEffect(a) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = a.action === "water" ? "#6babbf" : "#c09a56";
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.fillText(
      {
        dance: "♪",
        sleep: "z",
        water: "⋮",
        read: "▤",
        sniff: "♡",
        light: "✦",
        tea: "♨",
      }[a.action] || "♡",
      64,
      85,
    );
    texture.needsUpdate = true;
  }
  engine.setHomeTick((t, buddy) => {
    if (!buddy) return;
    const home = getHome(),
      room = roomOf(home),
      blocked = obstacles(),
      dt = Math.min((t - last) / 1000 || 0.016, 0.05);
    last = t;
    if (
      blocked.has(`${cell.x},${cell.z}`) ||
      cell.x >= room.w ||
      cell.z >= room.d
    ) {
      const free = nearestFree(cell, room, blocked);
      buddy.visible = !!free;
      if (!free) return;
      cell = free;
      path = [];
    }
    buddy.visible = true;
    buddy.scale.setScalar(1.3);
    effect.visible = !!action && t < action.until;
    if (path.length) {
      segment += dt * 2.1;
      const dest = path[0],
        u = Math.min(1, segment);
      buddy.position.set(
        cell.x + (dest.x - cell.x) * u - room.w / 2 + 0.5,
        0.05 + (reduced ? 0 : Math.sin(u * Math.PI) * 0.28),
        cell.z + (dest.z - cell.z) * u - room.d / 2 + 0.5,
      );
      buddy.rotation.y = Math.atan2(dest.x - cell.x, dest.z - cell.z);
      if (!reduced) buddy.scale.y = 1.3 + Math.sin(u * Math.PI * 2) * 0.1;
      if (u >= 1) {
        cell = path.shift();
        segment = 0;
      }
    } else {
      buddy.position.set(
        cell.x - room.w / 2 + 0.5,
        0.05,
        cell.z - room.d / 2 + 0.5,
      );
      buddy.rotation.y = Math.atan2(
        engine.camera.position.x - buddy.position.x,
        engine.camera.position.z - buddy.position.z,
      );
      if (pending) {
        action = { ...pending, started: t, until: t + 5000 };
        pending = null;
        idleUntil = t + 6500;
        buddy.userData.mood = action.mood;
        buddy.userData.moodUntil = Date.now() + 5000;
        startEffect(action);
        onMoment(action);
      }
      if (action && t < action.until) {
        if (action.seat) {
          const enter = Math.min(1, (t - action.started) / 650),
            leave = Math.min(1, (action.until - t) / 650),
            v = Math.max(0, Math.min(enter, leave));
          const u = v * v * (3 - 2 * v);
          buddy.position.x += (action.seat.x - buddy.position.x) * u;
          buddy.position.z += (action.seat.z - buddy.position.z) * u;
          buddy.position.y += action.seat.y * u;
        }
        if (!reduced && ["dance", "roll"].includes(action.action)) {
          buddy.position.y += Math.abs(Math.sin(t * 0.01)) * 0.25;
          buddy.rotation.z = Math.sin(t * 0.007) * 0.25;
        } else if (["sit", "sleep", "tea", "read"].includes(action.action)) {
          buddy.scale.y = 1.08;
          buddy.rotation.z =
            action.action === "sleep"
              ? 0.25
              : reduced
                ? 0
                : Math.sin(t * 0.002) * 0.06;
        } else if (!reduced) buddy.rotation.z = Math.sin(t * 0.006) * 0.15;
      } else {
        action = null;
        if (t > idleUntil && !reduced) {
          const free = nearestFree(
            {
              x: Math.floor(Math.random() * room.w),
              z: Math.floor(Math.random() * room.d),
            },
            room,
            blocked,
          );
          if (free) plan(free);
          idleUntil = t + 5000 + Math.random() * 5000;
        }
      }
    }
    // Contact follows the actual support surface, including rugs and seats.
    let support = 0.018;
    for (const p of home.placed) {
      const f = furnitureById[home.inventory.find((i) => i.uid === p.uid)?.fid];
      if (!f || furnitureLayer(f) !== "floor") continue;
      const size = footprint(f, p.rotation),
        x = buddy.position.x + room.w / 2,
        z = buddy.position.z + room.d / 2;
      if (x >= p.x && x < p.x + size.w && z >= p.z && z < p.z + size.d)
        support = Math.max(support, f.model === "mat" ? 0.095 : 0.12);
    }
    buddy.position.y += support - 0.07;
    buddy.userData.supportHeight = support;
    if (action?.seat && t - action.started > 650 && action.until - t > 650)
      buddy.userData.supportHeight = support + action.seat.y;
    effect.position.copy(buddy.position);
    if (action?.target && ["water", "light", "sniff"].includes(action.action))
      effect.position.set(action.target.x, action.target.y, action.target.z);
    effect.position.y += 1.55 + (reduced ? 0 : Math.sin(t * 0.004) * 0.09);
  });
  return {
    walk(target) {
      action = null;
      idleUntil = last + 7000;
      return plan(target);
    },
    pet() {
      pending = {
        action: "dance",
        mood: "loved",
        text: "嘿嘿，今天也被你喜欢着。",
        model: "pet",
      };
      path = segment > 0 && path.length ? [path[0]] : [];
    },
    interact(uid) {
      const home = getHome(),
        p = home.placed.find((p) => p.uid === uid),
        f = furnitureById[home.inventory.find((i) => i.uid === uid)?.fid];
      if (!p || !f) return false;
      const info = INTERACTIONS[f.model] || {
        action: "look",
        mood: "curious",
        text: "这是你为我挑的，我很喜欢。",
      };
      const route = approachFurniture(cell, p, f, roomOf(home), obstacles());
      if (!route.length) return false;
      action = null;
      const room = roomOf(home),
        rot = p.rotation % 2,
        w = rot ? f.d : f.w,
        d = rot ? f.w : f.d,
        target = {
          x: p.x - room.w / 2 + w / 2,
          z: p.z - room.d / 2 + d / 2,
          y: 0.1,
        };
      const heights = {
        sofa: 0.8,
        bed: 0.9,
        stool: 0.6,
        rug: 0.08,
        mat: 0.08,
        cushion: 0.25,
      };
      return plan(route.at(-1), {
        ...info,
        model: f.model,
        target,
        seat:
          heights[f.model] !== undefined
            ? { ...target, y: heights[f.model] }
            : null,
      });
    },
  };
}

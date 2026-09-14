import { nextTick } from "vue";
import { state, levelInfo, buddyBus } from "../store.js";
import { EXPRESSIONS } from "./emotions.js";
import { QA, SCENARIOS } from "./qa.js";
import { emptyHome } from "./home.js";
export function registerGameTools(navigate, getPlace = () => location.hash.slice(1) || "map") {
  const snapshot = () => JSON.parse(JSON.stringify({
    place: getPlace(), navigation: { hash: location.hash, dialog: !!document.querySelector("dialog[open]"), returnTo: "map" },
    emotion: { mood: buddyBus.mood, parameters: EXPRESSIONS[buddyBus.mood] || EXPRESSIONS.idle },
    home: state.home, activeTasks: state.active.length, completedTasks: state.done.length,
    viewport: { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth },
  }));
  window.__KUANGYE__ = Object.freeze({ snapshot, ...(QA ? {
    scenarios: Object.keys(SCENARIOS),
    async reset(name) {
      if (!(name in SCENARIOS)) throw new Error("Unknown scenario");
      const home = emptyHome();
      home.lumens = home.earned = 500;
      home.decor.light = "day"; home.decor.weather = "clear";
      Object.assign(state, { home, active: [], done: [], abandoned: [], settings: {} });
      Object.assign(buddyBus, { mood: "idle", at: 0, text: "" });
      navigate("map"); await nextTick(); return snapshot();
    },
  } : {}) });
  const context = document.modelContext;
  if (!context?.registerTool) return () => { delete window.__KUANGYE__; };
  const lifecycle = new AbortController();
  const tools = [
    {
      name: "get_kuangye_progress",
      title: "查看旷野进度",
      description:
        "Read local progress, light balance, inventory and placed furniture counts without modifying anything.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (input && Object.keys(input).length)
          throw new Error("This tool takes no arguments");
        return {
          light: state.home.lumens,
          level: levelInfo.value.level,
          activeTasks: state.active.map((a) => a.qid),
          completedTasks: state.done.length,
          inventory: state.home.inventory.length,
          placed: state.home.placed.length,
        };
      },
    },
    {
      name: "navigate_kuangye",
      title: "前往旷野的场所",
      description:
        "Navigate to a place in the visible app. Does not accept or complete tasks, buy or place furniture.",
      inputSchema: {
        type: "object",
        properties: {
          place: {
            type: "string",
            enum: ["map", "tasks", "home", "shop", "panel"],
          },
        },
        required: ["place"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (
          !input ||
          Object.keys(input).length !== 1 ||
          !["map", "tasks", "home", "shop", "panel"].includes(input.place)
        )
          throw new Error("Choose a valid place");
        navigate(input.place);
        await nextTick();
        return { place: input.place };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser capability; the visible game remains fully functional. */
    }
  }
  return () => { lifecycle.abort(); delete window.__KUANGYE__; };
}

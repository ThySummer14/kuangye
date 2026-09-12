import { nextTick } from "vue";
import { state, levelInfo } from "../store.js";
export function registerGameTools(navigate) {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
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
  return () => lifecycle.abort();
}

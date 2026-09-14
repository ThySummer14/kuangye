// QA is restricted to the local Vite development server and an explicit URL flag.
export const QA = !!import.meta.env?.DEV && typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("qa");
export const SCENARIOS = { "map-navigation": "map", woodshop: "map", "emotion-lab": "idle" };

export const WEATHER = {
  clear: "晴朗",
  cloud: "流云",
  wind: "起风",
  rain: "雨天",
  snow: "落雪",
  frost: "霜晨",
  moon: "月夜",
};
export function normalizeAtmosphere(raw = {}) {
  if (raw.atmosphereVersion !== 1) raw = {};
  return {
    atmosphereVersion: 1,
    weather:
      raw.weather === "auto" || WEATHER[raw.weather] ? raw.weather : "auto",
    light: ["auto", "day", "sunset", "night"].includes(raw.light)
      ? raw.light
      : "auto",
  };
}
export function eastEightHour(date = new Date()) {
  return ((date.getUTCHours() + 8) % 24) + date.getUTCMinutes() / 60;
}
export function daylight(hour) {
  const dawn = Math.max(0, Math.min(1, (hour - 5) / 2)),
    dusk = Math.max(0, Math.min(1, (19 - hour) / 2));
  return Math.min(dawn, dusk);
}
export function weatherFromCurrent(c) {
  if (!c || !Number.isFinite(c.weather_code)) throw Error("天气数据不完整");
  const code = c.weather_code;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if (code >= 51) return "rain";
  if (code === 48 || (c.temperature_2m <= 0 && c.relative_humidity_2m >= 85))
    return "frost";
  if (c.wind_speed_10m >= 25) return "wind";
  if (code >= 2 || code === 45) return "cloud";
  return "clear";
}

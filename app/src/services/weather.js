import { weatherFromCurrent } from "../game/atmosphere.js";
const fallback = { latitude: 35.3, longitude: 113.93, label: "新乡" };
let location = fallback,
  request = 0;
export async function locateWeather() {
  if (!navigator.geolocation) return fallback;
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: Math.round(p.coords.latitude * 100) / 100,
          longitude: Math.round(p.coords.longitude * 100) / 100,
          label: "设备附近",
        }),
      () => resolve(fallback),
      { timeout: 7000, maximumAge: 1800000, enableHighAccuracy: false },
    ),
  );
}
export async function fetchWeather({ locate = false, signal } = {}) {
  const id = ++request;
  if (locate) location = await locateWeather();
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    timezone: "Asia/Shanghai",
  });
  const response = await fetch(
    "https://api.open-meteo.com/v1/forecast?" + params,
    { signal },
  );
  if (!response.ok) throw Error("天气服务暂时不可用");
  const body = await response.json();
  if (id !== request) throw Error("已由新请求替代");
  return {
    kind: weatherFromCurrent(body.current),
    temperature: body.current.temperature_2m,
    label: location.label,
    at: Date.now(),
  };
}

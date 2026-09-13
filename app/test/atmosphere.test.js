import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAtmosphere,
  eastEightHour,
  daylight,
  weatherFromCurrent,
} from "../src/game/atmosphere.js";
import { blinkAt } from "../src/scenes/face-paint.js";
test("old light settings migrate to outdoor sync and explicit overrides persist", () => {
  assert.equal(normalizeAtmosphere({ light: "day" }).light, "auto");
  assert.deepEqual(
    normalizeAtmosphere({
      atmosphereVersion: 1,
      weather: "snow",
      light: "night",
    }),
    { atmosphereVersion: 1, weather: "snow", light: "night" },
  );
  assert.equal(
    normalizeAtmosphere({ atmosphereVersion: 1, weather: "invalid" }).weather,
    "auto",
  );
});
test("east-eight clock is independent from host timezone and daylight is continuous", () => {
  assert.equal(eastEightHour(new Date("2026-01-01T00:30:00Z")), 8.5);
  assert.equal(daylight(12), 1);
  assert.equal(daylight(23), 0);
  assert.ok(Math.abs(daylight(6) - daylight(6.001)) < 0.001);
});
test("weather codes map to supported scenes without inventing unavailable data", () => {
  for (const [code, result] of [
    [0, "clear"],
    [3, "cloud"],
    [63, "rain"],
    [75, "snow"],
    [48, "frost"],
  ])
    assert.equal(weatherFromCurrent({ weather_code: code }), result);
  assert.equal(
    weatherFromCurrent({ weather_code: 0, wind_speed_10m: 30 }),
    "wind",
  );
  assert.throws(() => weatherFromCurrent({}));
});
test("blink closes and opens continuously without hard steps", () => {
  for (let t = 0; t < 11000; t++) {
    assert.ok(blinkAt(t) >= 0.05);
    assert.ok(Math.abs(blinkAt(t + 1) - blinkAt(t)) < 0.02);
  }
});

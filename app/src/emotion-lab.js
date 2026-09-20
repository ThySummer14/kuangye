import { createApp } from "vue";
import EmotionLab from "./components/EmotionLab.vue";
createApp(EmotionLab).mount("#app");

// The lab icon uses the same palette and silhouette, not a second hard-coded skin.
import { paintSprout } from "./scenes/sprout-paint.js";
import { EMOTION_POSES } from "./game/emotions.js";
const icon = document.createElement("canvas");
icon.width = icon.height = 256;
paintSprout(icon.getContext("2d"), EMOTION_POSES.idle, 0, {
  blink: false,
  breath: false,
});
document.querySelector('link[rel="icon"]').href = icon.toDataURL();

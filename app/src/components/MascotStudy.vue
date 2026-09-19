<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as THREE from "three";
import { makeSoftCorner } from "../scenes/mascot-model.js";
const props = defineProps({
  mood: { default: "idle" },
  size: { default: 400 },
  frequency: Number,
  damping: Number,
  blink: { default: true },
  breath: { default: true },
  paused: Boolean,
});
const host = ref(null),
  failed = ref(false);
let renderer,
  scene,
  buddy,
  camera,
  frame,
  last = 0,
  time = 0,
  observer;
let drag = null,
  yaw = 0,
  gaze = { x: 0, y: 0 };
function move(e) {
  const r = host.value.getBoundingClientRect();
  gaze = {
    x: ((e.clientX - r.left) / r.width) * 2 - 1,
    y: ((e.clientY - r.top) / r.height) * 2 - 1,
  };
  if (drag !== null) {
    yaw += (e.clientX - drag) * 0.012;
    drag = e.clientX;
  }
}
function render(t) {
  const dt = Math.min(t - last || 16, 100);
  last = t;
  if (!props.paused) time += dt;
  buddy.userData.drawFace(time);
  buddy.rotation.y = yaw;
  renderer.render(scene, camera);
  host.value.dataset.ready = "true";
  frame = requestAnimationFrame(render);
}
onMounted(() => {
  try {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    host.value.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight("#fffaf2", "#c8c6c0", 2.2));
    const light = new THREE.DirectionalLight("#fffaf2", 2.5);
    light.position.set(-3, 5, 4);
    scene.add(light);
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0.65, 2.25);
    camera.lookAt(0, 0.41, 0);
    buddy = makeSoftCorner(scene, {
      getMood: () => props.mood,
      getGaze: () => gaze,
      getOptions: () => props,
    });
    const shadow = buddy.userData.contactShadow;
    shadow.position.y = 0.012;
    observer = new ResizeObserver(() => {
      const w = host.value.clientWidth;
      renderer.setSize(w, w);
    });
    observer.observe(host.value);
    frame = requestAnimationFrame(render);
  } catch {
    failed.value = true;
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  observer?.disconnect();
  scene?.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  renderer?.dispose();
  renderer?.forceContextLoss();
});
defineExpose({
  snapshot: () => buddy?.userData.emotionSnapshot(),
  reset: (m) => {
    buddy?.userData.resetEmotion(m);
    time = 0;
    yaw = 0;
  },
});
</script>
<template>
  <div
    ref="host"
    class="mascot-study sprout-portrait"
    :style="{ width: size + 'px', maxWidth: '100%', aspectRatio: 1 }"
    role="img"
    aria-label="可拖动旋转的软角立体形象"
    @pointerdown="
      (e) => {
        drag = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    "
    @pointermove="move"
    @pointerup="drag = null"
    @pointercancel="drag = null"
    @pointerleave="gaze = { x: 0, y: 0 }"
  >
    <p v-if="failed">立体预览暂不可用，可以切回平面表情。</p>
  </div>
</template>
<style scoped>
.mascot-study {
  touch-action: none;
  cursor: grab;
}
.mascot-study:active {
  cursor: grabbing;
}
.mascot-study:deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

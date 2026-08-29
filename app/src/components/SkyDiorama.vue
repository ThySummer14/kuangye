<script setup>
// 小芽的 3D 家：漂浮草岛微缩场景（three.js）。
// 可拖转、可点击让小芽跳一下。刻意低成本：低多边形 + 透明背景 + 两灯。
import * as THREE from 'three'
import { onMounted, onBeforeUnmount, ref } from 'vue'

const host = ref(null)

let renderer, scene, camera, raf = 0
let island, sprout, leafL, leafR, cloudA, cloudB
let observer = null
let last = performance.now()

const state = { yaw: 0.55, pitch: 0, targetYaw: 0.55, dragging: false, lastX: 0, lastY: 0, moved: 0, lastInteract: 0, t: 0 }
const jump = { x: 0, v: 0 }
let reduce = false

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

function makeCloud(scale) {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })
  for (const [x, y, z, r] of [[0, 0, 0, 0.42], [-0.4, -0.05, 0.1, 0.3], [0.42, -0.04, -0.05, 0.34]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat)
    m.position.set(x, y, z)
    g.add(m)
  }
  g.scale.setScalar(scale)
  return g
}

function init() {
  const el = host.value
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, 1.7, 6.6)
  camera.lookAt(0, 0.7, 0)

  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xd8e8d0, 1.15))
  const sun = new THREE.DirectionalLight(0xfff3dd, 1.7)
  sun.position.set(3, 5, 4)
  scene.add(sun)

  // ———— 漂浮草岛 ————
  island = new THREE.Group()
  const grass = new THREE.Mesh(
    new THREE.SphereGeometry(1.32, 20, 12),
    new THREE.MeshStandardMaterial({ color: 0x7cbf62, roughness: 0.95, flatShading: true })
  )
  grass.scale.set(1, 0.42, 1)
  const dirt = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xa9825a, roughness: 1, flatShading: true })
  )
  dirt.scale.set(1, 0.55, 1)
  dirt.position.y = -0.22

  // 几株小草点缀
  const blades = new THREE.Group()
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5f9c48, roughness: 1, flatShading: true })
  for (const [x, z] of [[0.8, 0.5], [-0.7, 0.6], [0.35, 0.95], [-0.4, -0.85], [0.85, -0.45]]) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), bladeMat)
    b.position.set(x, 0.32, z)
    b.rotation.z = (Math.random() - 0.5) * 0.5
    blades.add(b)
  }

  // ———— 小芽 ————
  sprout = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 28, 20),
    new THREE.MeshStandardMaterial({ color: 0x8fbb63, roughness: 0.8 })
  )
  body.scale.set(1, 0.94, 1)
  body.position.y = 0.5
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xc4d99e, roughness: 0.9 })
  )
  belly.scale.set(1, 0.55, 0.5)
  belly.position.set(0, 0.3, 0.31)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2c3a2a, roughness: 0.4 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), eyeMat)
  eyeL.position.set(-0.17, 0.58, 0.42)
  const eyeR = eyeL.clone()
  eyeR.position.x = 0.17
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xf0a18e, roughness: 1, transparent: true, opacity: 0.65 })
  const blushL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), blushMat)
  blushL.scale.set(1, 0.6, 0.5)
  blushL.position.set(-0.3, 0.46, 0.38)
  const blushR = blushL.clone()
  blushR.position.x = 0.3
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: 0x5f8c44, roughness: 1 })
  )
  stem.position.set(0, 1.02, 0)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x6ea84e, roughness: 0.9, flatShading: true })
  leafL = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), leafMat)
  leafL.scale.set(1, 0.3, 0.55)
  leafL.position.set(-0.2, 1.2, 0)
  leafL.rotation.z = 0.55
  leafR = leafL.clone()
  leafR.position.x = 0.2
  leafR.rotation.z = -0.55

  sprout.add(body, belly, eyeL, eyeR, blushL, blushR, stem, leafL, leafR)
  sprout.position.y = 0.5

  island.add(grass, dirt, blades, sprout)
  scene.add(island)

  cloudA = makeCloud(1)
  cloudA.position.set(2.1, 1.4, -1.2)
  cloudB = makeCloud(0.75)
  cloudB.position.set(-2.3, 2.0, -1.8)
  scene.add(cloudA, cloudB)

  // ———— 交互：拖转 + 点击跳 ————
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)

  const resize = () => {
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  observer = new ResizeObserver(resize)
  observer.observe(el)
  resize()
}

function onDown(e) {
  state.dragging = true
  state.moved = 0
  state.lastX = e.clientX
  state.lastY = e.clientY
  host.value.setPointerCapture(e.pointerId)
}
function onMove(e) {
  if (!state.dragging) return
  const dx = e.clientX - state.lastX
  const dy = e.clientY - state.lastY
  state.moved += Math.abs(dx) + Math.abs(dy)
  state.targetYaw += dx * 0.007
  state.pitch = clamp(state.pitch + dy * 0.003, -0.18, 0.25)
  state.lastX = e.clientX
  state.lastY = e.clientY
  state.lastInteract = performance.now()
}
function onUp() {
  if (!state.dragging) return
  state.dragging = false
  state.lastInteract = performance.now()
  if (state.moved < 8) jump.v = 3.6 // 当作点击：小芽跳一下
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  state.t += dt

  // 跳跃弹簧（半隐式欧拉，120Hz 子步长）
  const h = 1 / 120
  let acc = dt
  while (acc > 0) {
    const s = Math.min(h, acc)
    jump.v += (160 * (0 - jump.x) - 12 * jump.v) * s
    jump.x += jump.v * s
    if (jump.x < 0) { jump.x = 0; jump.v *= -0.3 }
    acc -= s
  }

  // 无人打扰时缓慢自转
  if (!state.dragging && now - state.lastInteract > 2600) state.targetYaw += dt * 0.12
  state.yaw += (state.targetYaw - state.yaw) * Math.min(1, dt * 8)

  const m = reduce ? 0 : 1
  island.rotation.y = state.yaw
  island.rotation.x = state.pitch
  island.position.y = Math.sin(state.t * 1.1) * 0.06 * m
  sprout.position.y = 0.5 + jump.x
  sprout.rotation.z = Math.sin(state.t * 1.5) * 0.04 * m
  leafL.rotation.z = 0.55 + Math.sin(state.t * 2.1) * 0.09 * m
  leafR.rotation.z = -0.55 - Math.sin(state.t * 2.1 + 0.4) * 0.09 * m
  cloudA.position.x = 2.1 + Math.sin(state.t * 0.22) * 0.4 * m
  cloudB.position.x = -2.3 + Math.sin(state.t * 0.16 + 2) * 0.35 * m

  renderer.render(scene, camera)
}

onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    init()
    raf = requestAnimationFrame(frame)
  } catch (err) {
    window.__kyErr = String(err && err.stack ? err.stack : err)
    console.warn('WebGL 不可用，3D 场景跳过', err)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  renderer?.dispose()
  renderer?.domElement?.remove()
})
</script>

<template>
  <div ref="host" class="diorama" aria-label="小芽的漂浮草岛，可拖转"></div>
</template>

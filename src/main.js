/**
 * main.js — Integrity Market, Phase 1: Foundation
 *
 * Boots the Three.js renderer, scene, lights, and wires together
 * the Camera, Level, Player, and InputManager modules.
 *
 * Entry point loaded by index.html.
 */

import * as THREE from 'three';
import { IsometricCamera } from './Camera.js';
import { Level            } from './Level.js';
import { Player           } from './Player.js';
import { InputManager     } from './InputManager.js';

// ── Renderer ─────────────────────────────────────────────────────────────────

const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  // powerPreference: 'high-performance' helps on iPad Pro with discrete GPU
  powerPreference: 'high-performance',
});

// Cap pixel ratio at 2 — retina gives plenty of quality without 3× cost on iPad
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0e1012);

// Tone mapping gives a subtle filmic look without full post-processing
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

container.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();

// Fog reinforces the isometric depth cue and hides level edges cleanly
scene.fog = new THREE.Fog(0x0e1012, 40, 90);

// ── Lighting ──────────────────────────────────────────────────────────────────

// Ambient: cool base fill (concrete under fluorescents)
const ambient = new THREE.AmbientLight(0xc8d8e8, 0.55);
scene.add(ambient);

// Key light: warm directional from above-right — mimics a skylight
const key = new THREE.DirectionalLight(0xfff2d9, 1.15);
key.position.set(25, 40, 20);
key.castShadow              = true;
key.shadow.mapSize.width    = 2048;
key.shadow.mapSize.height   = 2048;
key.shadow.camera.near      = 5;
key.shadow.camera.far       = 120;
key.shadow.camera.left      = -32;
key.shadow.camera.right     =  32;
key.shadow.camera.top       =  32;
key.shadow.camera.bottom    = -32;
key.shadow.bias             = -0.0008;
key.shadow.normalBias       =  0.04;
scene.add(key);

// Fill light: cooler, from the opposite side — separates geometry edges
const fill = new THREE.DirectionalLight(0xb0ccff, 0.28);
fill.position.set(-20, 15, -18);
scene.add(fill);

// Rim / back light: very subtle, lifts dark walls off the background
const rim = new THREE.DirectionalLight(0x8899aa, 0.12);
rim.position.set(0, 5, -30);
scene.add(rim);

// ── World ─────────────────────────────────────────────────────────────────────

const isoCamera = new IsometricCamera();
const level     = new Level(scene);
const player    = new Player(scene);
const input     = new InputManager();

// Start camera looking at the spawn position immediately (no lerp lag on load)
isoCamera.snapTo(player.getPosition());

// ── Move-hint fade ────────────────────────────────────────────────────────────

const hint = document.getElementById('hint');
let hintVisible   = true;
let hintTimer     = 0;
const HINT_DELAY  = 3.5; // seconds before fading

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  isoCamera.resize(window.innerWidth, window.innerHeight);
});

// ── Game loop ─────────────────────────────────────────────────────────────────

let lastTimestamp = performance.now();

function loop(timestamp) {
  requestAnimationFrame(loop);

  // Delta time capped at 50 ms to avoid spiral-of-death on tab switch / slow frames
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  // ── Input → movement ──
  const dir = input.getDirection();
  const moving = Math.abs(dir.x) > 0.01 || Math.abs(dir.y) > 0.01;

  if (moving) {
    player.move(dir.x, dir.y, dt, level);

    // Any input dismisses the move hint
    if (hintVisible) {
      hintVisible = false;
      hint.classList.add('hidden');
    }
  }

  // ── Player animation ──
  player.update(dt);

  // ── Auto-fade hint after HINT_DELAY seconds ──
  if (hintVisible) {
    hintTimer += dt;
    if (hintTimer >= HINT_DELAY) {
      hintVisible = false;
      hint.classList.add('hidden');
    }
  }

  // ── Camera follow ──
  isoCamera.follow(player.getPosition(), dt);

  // ── Render ──
  renderer.render(scene, isoCamera.threeCamera);
}

requestAnimationFrame(loop);

/**
 * main.js — Integrity Market, Phase 2: Stealth Core
 *
 * Adds: guards with patrol routes + vision cones, alert state,
 * one interactable dossier, and win/lose conditions.
 */

import * as THREE from 'three';
import { IsometricCamera } from './Camera.js';
import { Level            } from './Level.js';
import { Player           } from './Player.js';
import { InputManager     } from './InputManager.js';
import { Guard            } from './Guard.js';
import { Dossier          } from './Dossier.js';
import { GameState, AlertLevel, MissionState } from './GameState.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled      = true;
renderer.shadowMap.type         = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0e1012);
renderer.toneMapping            = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure    = 1.1;
container.appendChild(renderer.domElement);

// ── Scene + fog ───────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.fog   = new THREE.Fog(0x0e1012, 40, 90);

// ── Lighting ──────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0xc8d8e8, 0.55));

const key = new THREE.DirectionalLight(0xfff2d9, 1.15);
key.position.set(25, 40, 20);
key.castShadow           = true;
key.shadow.mapSize.width = key.shadow.mapSize.height = 2048;
key.shadow.camera.near   = 5;  key.shadow.camera.far    = 120;
key.shadow.camera.left   = -32; key.shadow.camera.right  =  32;
key.shadow.camera.top    =  32; key.shadow.camera.bottom = -32;
key.shadow.bias          = -0.0008;
key.shadow.normalBias    =  0.04;
scene.add(key);

const fill = new THREE.DirectionalLight(0xb0ccff, 0.28);
fill.position.set(-20, 15, -18);
scene.add(fill);

const rim = new THREE.DirectionalLight(0x8899aa, 0.12);
rim.position.set(0, 5, -30);
scene.add(rim);

// ── Core world objects ────────────────────────────────────────────────────────

const isoCamera = new IsometricCamera();
const level     = new Level(scene);
const player    = new Player(scene);
const input     = new InputManager();
const gameState = new GameState();

isoCamera.snapTo(player.getPosition());

// ── Guards ────────────────────────────────────────────────────────────────────
// Guard 1 — "Security", patrols south open-plan (blue-grey uniform)
// Guard 2 — "Compliance", patrols north-west wing (darker uniform)

const V = (x, z) => new THREE.Vector3(x, 0, z);

const guards = [
  new Guard(scene, {
    color: 0x3a4f6a,
    waypoints: [V(-14, 10), V(10, 10), V(10, 17), V(-14, 17)],
  }),
  new Guard(scene, {
    color: 0x2e3e30,
    waypoints: [V(-14, -16), V(-7, -16), V(-7, -4), V(-14, -4)],
  }),
];

// ── Dossier ───────────────────────────────────────────────────────────────────
// Placed on the server rack in the NE secure room (x=14, z=−12).

const dossier = new Dossier(
  scene,
  new THREE.Vector3(14, 2, -12),
  'MINISTER CONTRADICTIONS VOL.1'
);

// ── Exit zone ─────────────────────────────────────────────────────────────────
// Glowing green zone near the south entrance (z=18, x=0).

const EXIT_RADIUS = 2.5;

const exitMat = new THREE.MeshBasicMaterial({
  color: 0x00ff88, transparent: true, opacity: 0.13,
  side: THREE.DoubleSide, depthWrite: false,
});
const exitDisc = new THREE.Mesh(new THREE.CircleGeometry(EXIT_RADIUS, 32), exitMat);
exitDisc.rotation.x = -Math.PI / 2;
exitDisc.position.set(0, 0.04, 18);
scene.add(exitDisc);

// Ring border
const exitRingMat = new THREE.MeshBasicMaterial({
  color: 0x00ff88, transparent: true, opacity: 0.4,
  side: THREE.DoubleSide, depthWrite: false,
});
const exitRing = new THREE.Mesh(
  new THREE.RingGeometry(EXIT_RADIUS - 0.08, EXIT_RADIUS, 32),
  exitRingMat,
);
exitRing.rotation.x = -Math.PI / 2;
exitRing.position.set(0, 0.05, 18);
scene.add(exitRing);

const EXIT_POS = new THREE.Vector3(0, 0, 18);

// ── HUD elements ──────────────────────────────────────────────────────────────

const elHint       = document.getElementById('hint');
const elAlertLabel = document.getElementById('alert-label');
const elAlertBar   = document.getElementById('alert-bar');
const elDossierHUD = document.getElementById('dossier-status');
const elPrompt     = document.getElementById('interact-prompt');
const elHarvestBtn = document.getElementById('harvest-btn');
const elOverlay    = document.getElementById('overlay');
const elOverlayTitle = document.getElementById('overlay-title');
const elOverlaySub   = document.getElementById('overlay-sub');
const elRestartBtn   = document.getElementById('restart-btn');

// Wire the on-screen harvest button to the input manager
elHarvestBtn?.addEventListener('pointerdown', e => {
  e.preventDefault();
  input.flagInteract();
});

elRestartBtn?.addEventListener('click', () => location.reload());

// ── HUD update ────────────────────────────────────────────────────────────────

const ALERT_LABELS = ['CLEAR', 'EYES ON', 'HIGH ALERT', 'CAUGHT'];
const ALERT_COLORS = ['#00c8e8', '#ffcc00', '#ff6600', '#ff1111'];

let prevAlertLevel = -1;

function updateHUD(canInteract, hasDoc) {
  const al = gameState.alertLevel;

  // Alert bar — only update DOM on change
  if (al !== prevAlertLevel) {
    prevAlertLevel = al;
    if (elAlertLabel) {
      elAlertLabel.textContent  = ALERT_LABELS[al];
      elAlertLabel.style.color  = ALERT_COLORS[al];
    }
    if (elAlertBar) {
      elAlertBar.dataset.level = al;
    }
  }

  // Dossier HUD
  if (elDossierHUD) elDossierHUD.classList.toggle('hidden', !hasDoc);

  // Interact prompt + harvest button
  if (elPrompt)     elPrompt.classList.toggle('hidden',     !canInteract);
  if (elHarvestBtn) elHarvestBtn.classList.toggle('hidden', !canInteract);

  // End-state overlay
  if (gameState.isComplete() || gameState.isCaught()) {
    if (elOverlay && elOverlay.classList.contains('hidden')) {
      elOverlay.classList.remove('hidden');
      if (gameState.isComplete()) {
        if (elOverlayTitle) elOverlayTitle.textContent = 'DOSSIER SECURED';
        if (elOverlaySub)   elOverlaySub.textContent   = 'The market will be pleased.';
      } else {
        if (elOverlayTitle) elOverlayTitle.textContent = 'IDENTIFIED';
        if (elOverlaySub)   elOverlaySub.textContent   = 'Contract restructuring in progress…';
      }
    }
  }
}

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  isoCamera.resize(window.innerWidth, window.innerHeight);
});

// ── Game loop ─────────────────────────────────────────────────────────────────

let hasDossier  = false;
let hintVisible = true;
let hintTimer   = 0;
let exitPulse   = 0;

let lastTimestamp = performance.now();

function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  const active = gameState.isPlaying();

  // ── Input → movement (freeze on end-state) ──
  if (active) {
    const dir    = input.getDirection();
    const moving = Math.abs(dir.x) > 0.01 || Math.abs(dir.y) > 0.01;
    if (moving) {
      player.move(dir.x, dir.y, dt, level);
      if (hintVisible) { hintVisible = false; elHint?.classList.add('hidden'); }
    }
    if (hintVisible) {
      hintTimer += dt;
      if (hintTimer > 3.5) { hintVisible = false; elHint?.classList.add('hidden'); }
    }
  }

  player.update(dt);

  // ── Guards ──
  let maxSuspicion = 0;
  for (const guard of guards) {
    const s = guard.update(dt, player.getPosition(), active);
    if (s > maxSuspicion) maxSuspicion = s;
  }

  // ── Dossier ──
  dossier.update(dt);
  const canInteract = active && !hasDossier && dossier.canInteract(player.getPosition());

  if (canInteract && input.consumeInteract()) {
    dossier.collect();
    hasDossier = true;
  }

  // ── Exit zone ──
  const pos2 = player.getPosition();
  const toExit = pos2.distanceTo(EXIT_POS);
  const atExit = toExit < EXIT_RADIUS;

  // Pulse exit ring when player holds dossier
  exitPulse += dt;
  const exitGlow = hasDossier ? (0.12 + Math.sin(exitPulse * 3) * 0.06) : 0.07;
  exitMat.opacity = exitGlow;

  // ── Game state ──
  gameState.update(dt, maxSuspicion, atExit, hasDossier);

  // ── HUD ──
  updateHUD(canInteract, hasDossier);

  // ── Camera ──
  isoCamera.follow(player.getPosition(), dt);

  renderer.render(scene, isoCamera.threeCamera);
}

requestAnimationFrame(loop);

/**
 * main.js — Integrity Market, Phase 3: The Economy
 *
 * Adds: multiple contradiction types, harvest-moment card (said-vs-did),
 * live Integrity Market panel with price-crash-on-flood mechanic, and
 * an itemised sell sequence at the exit.
 */

import * as THREE from 'three';
import { IsometricCamera } from './Camera.js';
import { Level            } from './Level.js';
import { Player           } from './Player.js';
import { InputManager     } from './InputManager.js';
import { Guard            } from './Guard.js';
import { Dossier          } from './Dossier.js';
import { GameState, AlertLevel } from './GameState.js';
import { Market           } from './Market.js';
import { HarvestModal     } from './HarvestModal.js';
import { SellPanel        } from './SellPanel.js';
import { CType, CONTRADICTIONS } from './Contradiction.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

const container = document.getElementById('app');
const renderer  = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0e1012);
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.fog   = new THREE.Fog(0x0e1012, 40, 90);

// ── Lighting ──────────────────────────────────────────────────────────────────

scene.add(new THREE.AmbientLight(0xc8d8e8, 0.55));

const key = new THREE.DirectionalLight(0xfff2d9, 1.15);
key.position.set(25, 40, 20);
key.castShadow           = true;
key.shadow.mapSize.width = key.shadow.mapSize.height = 2048;
key.shadow.camera.near   = 5;   key.shadow.camera.far    = 120;
key.shadow.camera.left   = -32; key.shadow.camera.right  = 32;
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

// ── World ─────────────────────────────────────────────────────────────────────

const isoCamera = new IsometricCamera();
const level     = new Level(scene);
const player    = new Player(scene);
const input     = new InputManager();
const gameState = new GameState();
const market    = new Market();

isoCamera.snapTo(player.getPosition());

// ── Guards ────────────────────────────────────────────────────────────────────

const V = (x, z) => new THREE.Vector3(x, 0, z);

const guards = [
  new Guard(scene, { color: 0x3a4f6a, waypoints: [V(-14, 10), V(10, 10), V(10, 17), V(-14, 17)] }),
  new Guard(scene, { color: 0x2e3e30, waypoints: [V(-14, -16), V(-7, -16), V(-7, -4), V(-14, -4)] }),
];

// ── Dossiers ──────────────────────────────────────────────────────────────────
// Two HOUSING dossiers so the player sees the price crash within one run.
// CLIMATE in the central north (moderate risk).
// DONATIONS in the NE secure room (highest value, deepest in map).

const dossiers = [
  new Dossier(scene, new THREE.Vector3(-2,  1.88, 5.5),  CType.HOUSING),   // reception desk
  new Dossier(scene, new THREE.Vector3(-12, 1.52, 8),    CType.HOUSING),   // SW desk (guard patrol zone)
  new Dossier(scene, new THREE.Vector3(3,   0.77, -5),   CType.CLIMATE),   // central atrium table
  new Dossier(scene, new THREE.Vector3(14,  3.0,  -12),  CType.DONATIONS), // NE server rack
];

// ── Exit zone ─────────────────────────────────────────────────────────────────

const EXIT_RADIUS  = 2.5;
const EXIT_POS     = new THREE.Vector3(0, 0, 18);

const exitDiscMat = new THREE.MeshBasicMaterial({
  color: 0x00ff88, transparent: true, opacity: 0.10,
  side: THREE.DoubleSide, depthWrite: false,
});
const exitDisc = new THREE.Mesh(new THREE.CircleGeometry(EXIT_RADIUS, 32), exitDiscMat);
exitDisc.rotation.x = -Math.PI / 2;
exitDisc.position.set(EXIT_POS.x, 0.04, EXIT_POS.z);
scene.add(exitDisc);

const exitRingMat = new THREE.MeshBasicMaterial({
  color: 0x00ff88, transparent: true, opacity: 0.45,
  side: THREE.DoubleSide, depthWrite: false,
});
const exitRing = new THREE.Mesh(new THREE.RingGeometry(EXIT_RADIUS - 0.08, EXIT_RADIUS, 32), exitRingMat);
exitRing.rotation.x = -Math.PI / 2;
exitRing.position.set(EXIT_POS.x, 0.05, EXIT_POS.z);
scene.add(exitRing);

// ── Economy controllers ───────────────────────────────────────────────────────

const harvestModal = new HarvestModal();
const sellPanel    = new SellPanel();

// Dossiers collected this run (typeIds in collection order)
const inventory = [];

// ── HUD element refs ──────────────────────────────────────────────────────────

const elHint       = document.getElementById('hint');
const elAlertLabel = document.getElementById('alert-label');
const elAlertBar   = document.getElementById('alert-bar');
const elHarvestBtn = document.getElementById('harvest-btn');
const elOverlay    = document.getElementById('overlay');
const elOvTitle    = document.getElementById('overlay-title');
const elOvSub      = document.getElementById('overlay-sub');
const elRestartBtn = document.getElementById('restart-btn');
const elInvChips   = document.getElementById('inv-chips');
const elMarketRows = document.getElementById('market-rows');
const elMpBalance  = document.getElementById('market-balance-value');

elHarvestBtn?.addEventListener('pointerdown', e => { e.preventDefault(); input.flagInteract(); });
elRestartBtn?.addEventListener('click', () => location.reload());

// ── Market panel render ───────────────────────────────────────────────────────

function renderMarketPanel() {
  if (!elMarketRows) return;
  elMarketRows.innerHTML = market.getAllPrices().map(p => {
    const hex  = `#${p.color.toString(16).padStart(6, '0')}`;
    const pct  = Math.round((p.price / p.basePrice) * 100);
    const drop = p.sells > 0 ? `<span class="mp-trend">↓${100 - pct}%</span>` : '';
    return `<div class="mp-row">
      <div class="mp-dot" style="background:${hex}"></div>
      <div class="mp-label">${p.label}</div>
      <div class="mp-price ${p.sells > 0 ? 'fatigued' : ''}">$${p.price.toLocaleString()}${drop}</div>
    </div>`;
  }).join('');
  if (elMpBalance) elMpBalance.textContent = `$${market.balance.toLocaleString()}`;
}
renderMarketPanel();

// ── Inventory chips ───────────────────────────────────────────────────────────

function renderInventory() {
  if (!elInvChips) return;
  elInvChips.innerHTML = inventory.map(typeId => {
    const d   = CONTRADICTIONS[typeId];
    const hex = `#${d.color.toString(16).padStart(6, '0')}`;
    return `<span class="inv-chip" style="border-color:${hex};color:${hex}">${d.id}</span>`;
  }).join('');
}

// ── Alert HUD ─────────────────────────────────────────────────────────────────

const ALERT_LABELS = ['CLEAR', 'EYES ON', 'HIGH ALERT', 'CAUGHT'];
const ALERT_COLORS = ['#00c8e8', '#ffcc00', '#ff6600', '#ff1111'];
let prevAlertLevel = -1;

function updateAlertHUD() {
  const al = gameState.alertLevel;
  if (al === prevAlertLevel) return;
  prevAlertLevel = al;
  if (elAlertLabel) { elAlertLabel.textContent = ALERT_LABELS[al]; elAlertLabel.style.color = ALERT_COLORS[al]; }
  if (elAlertBar) elAlertBar.dataset.level = al;
}

// ── Exit / completion flow ────────────────────────────────────────────────────

function triggerExit() {
  if (inventory.length > 0) {
    const breakdown = market.sellAll([...inventory]);
    inventory.length = 0;
    renderInventory();
    renderMarketPanel();
    sellPanel.show(breakdown, market.balance).then(() => showEndOverlay('sold'));
  } else {
    showEndOverlay('empty');
  }
}

function showEndOverlay(reason) {
  if (elOverlay)  elOverlay.classList.remove('hidden');
  if (reason === 'sold') {
    if (elOvTitle) elOvTitle.textContent = 'TRANSACTION COMPLETE';
    if (elOvSub)   elOvSub.textContent   = `$${market.balance.toLocaleString()} deposited. The market is pleased.`;
  } else if (reason === 'caught') {
    if (elOvTitle) elOvTitle.textContent = 'IDENTIFIED';
    if (elOvSub)   elOvSub.textContent   = 'Contract restructuring in progress…';
  } else {
    if (elOvTitle) elOvTitle.textContent = 'MISSION ABANDONED';
    if (elOvSub)   elOvSub.textContent   = 'No data acquired. The agency is disappointed.';
  }
}

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  isoCamera.resize(window.innerWidth, window.innerHeight);
});

// ── Game loop ─────────────────────────────────────────────────────────────────

let hintVisible = true;
let hintTimer   = 0;
let exitPulse   = 0;
let missionDone = false;

let lastTimestamp = performance.now();

function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  const modalOpen = harvestModal.isOpen || sellPanel.isOpen;
  const active    = gameState.isPlaying && !missionDone && !modalOpen;

  // ── Movement ──
  if (active) {
    const dir = input.getDirection();
    if (Math.abs(dir.x) > 0.01 || Math.abs(dir.y) > 0.01) {
      player.move(dir.x, dir.y, dt, level);
      if (hintVisible) { hintVisible = false; elHint?.classList.add('hidden'); }
    }
    if (hintVisible && (hintTimer += dt) > 3.5) {
      hintVisible = false; elHint?.classList.add('hidden');
    }
  }
  player.update(dt);

  // ── Guards (freeze while harvest card is showing) ──
  let maxSuspicion = 0;
  for (const g of guards) {
    const s = g.update(dt, player.getPosition(), active && !harvestModal.isOpen);
    if (s > maxSuspicion) maxSuspicion = s;
  }

  // ── Dossier interaction ──
  let interactable = null;
  for (const d of dossiers) {
    d.update(dt);
    if (active && !harvestModal.isOpen && d.canInteract(player.getPosition())) {
      interactable = d;
    }
  }

  if (interactable && input.consumeInteract()) {
    const typeId = interactable.typeId;
    interactable.collect();
    harvestModal.show(typeId, market).then(() => {
      inventory.push(typeId);
      renderInventory();
    });
  }

  // ── Exit trigger ──
  if (!missionDone && active && player.getPosition().distanceTo(EXIT_POS) < EXIT_RADIUS) {
    missionDone = true;
    triggerExit();
  }

  // Pulse exit glow when carrying dossiers
  exitPulse += dt;
  exitDiscMat.opacity = inventory.length > 0
    ? 0.10 + Math.sin(exitPulse * 3) * 0.05
    : 0.07;

  // ── Game state ──
  gameState.update(dt, maxSuspicion);
  updateAlertHUD();

  if (gameState.isCaught && !missionDone) {
    missionDone = true;
    showEndOverlay('caught');
  }

  // ── Harvest button visibility ──
  if (elHarvestBtn) elHarvestBtn.classList.toggle('hidden', !interactable || modalOpen);

  // ── Camera + render ──
  isoCamera.follow(player.getPosition(), dt);
  renderer.render(scene, isoCamera.threeCamera);
}

requestAnimationFrame(loop);

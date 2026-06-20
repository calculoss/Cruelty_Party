import * as THREE from 'three';

/**
 * Guard — patrols a waypoint loop, has a visible vision cone,
 * and accumulates suspicion when the player enters the cone.
 *
 * Suspicion is a 0–1 scalar. max suspicion across all guards
 * drives the alert state in GameState.
 *
 * speedMult and suspicionMult are set by ContractManager each run.
 * Guards see through walls — line-of-sight raycasting comes in Phase 5.
 */

const BASE_SPEED       = 2.8;  // world units/sec at speedMult = 1
const VISION_RANGE     = 8;    // world units
const VISION_HALF_ANG  = 55;   // degrees each side
const SUSPICION_RISE   = 1.0;  // per second at suspicionMult = 1
const SUSPICION_DECAY  = 0.6;  // per second (decay is not multiplied — player can always retreat)

const CONE_CLEAR   = new THREE.Color(0xffcc00);
const CONE_ALERTED = new THREE.Color(0xff2200);

export class Guard {
  /**
   * @param {THREE.Scene} scene
   * @param {{ waypoints: THREE.Vector3[], color?: number,
   *           speedMult?: number, suspicionMult?: number }} opts
   */
  constructor(scene, { waypoints, color = 0x4a5a6a, speedMult = 1, suspicionMult = 1 }) {
    this._waypoints     = waypoints;
    this._wpIndex       = 0;
    this._suspicion     = 0;
    this._speedMult     = speedMult;
    this._suspicionMult = suspicionMult;

    this._group = new THREE.Group();
    scene.add(this._group);
    this._group.position.copy(waypoints[0]);

    this._buildBody(color);
    this._buildVisionCone();
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _buildBody(color) {
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xc8a882 });
    const legMat  = new THREE.MeshLambertMaterial({ color: 0x2a3040 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.90, 0.28), bodyMat);
    body.position.y = 0.65; body.castShadow = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.30), headMat);
    head.position.y = 1.27; head.castShadow = true;

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.28, 0.22), legMat);
    const legR  = legL.clone();
    legL.position.set(-0.13, 0.14, 0);
    legR.position.set( 0.13, 0.14, 0);
    legL.castShadow = legR.castShadow = true;

    this._group.add(body, head, legL, legR);
  }

  _buildVisionCone() {
    const halfRad = (VISION_HALF_ANG * Math.PI) / 180;
    const R = VISION_RANGE;
    const SEGS = 18;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 0; i <= SEGS; i++) {
      const a = -halfRad + (i / SEGS) * halfRad * 2;
      shape.lineTo(Math.sin(a) * R, Math.cos(a) * R);
    }
    shape.closePath();

    this._coneMat = new THREE.MeshBasicMaterial({
      color: CONE_CLEAR.clone(),
      transparent: true, opacity: 0.11,
      side: THREE.DoubleSide, depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), this._coneMat);
    // +π/2 maps shape's +Y to group's +Z, matching _inVisionCone forward direction.
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = 0.06;
    this._group.add(mesh);
  }

  // ── Update ───────────────────────────────────────────────────────────────

  /**
   * @param {number}        dt
   * @param {THREE.Vector3} playerPos
   * @param {boolean}       gameActive
   * @returns {number}  suspicion 0–1
   */
  update(dt, playerPos, gameActive) {
    if (!gameActive) return this._suspicion;

    this._patrol(dt);

    const inCone = this._inVisionCone(playerPos);

    if (inCone) {
      this._suspicion = Math.min(1, this._suspicion + SUSPICION_RISE * this._suspicionMult * dt);
    } else {
      this._suspicion = Math.max(0, this._suspicion - SUSPICION_DECAY * dt);
    }

    this._coneMat.color.lerpColors(CONE_CLEAR, CONE_ALERTED, this._suspicion);
    this._coneMat.opacity = 0.10 + this._suspicion * 0.22;

    return this._suspicion;
  }

  // ── API ──────────────────────────────────────────────────────────────────

  /** Update difficulty multipliers for a new contract tier. */
  setMultipliers(speedMult, suspicionMult) {
    this._speedMult     = speedMult;
    this._suspicionMult = suspicionMult;
  }

  /** Return guard to start of patrol route and clear suspicion. */
  reset() {
    this._wpIndex   = 0;
    this._suspicion = 0;
    this._group.position.copy(this._waypoints[0]);
    this._coneMat.color.copy(CONE_CLEAR);
    this._coneMat.opacity = 0.11;
  }

  get suspicion() { return this._suspicion; }

  // ── Private ──────────────────────────────────────────────────────────────

  _patrol(dt) {
    const target = this._waypoints[this._wpIndex];
    const pos    = this._group.position;
    const dx     = target.x - pos.x;
    const dz     = target.z - pos.z;
    const dist   = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.2) {
      this._wpIndex = (this._wpIndex + 1) % this._waypoints.length;
      return;
    }

    const step = Math.min(BASE_SPEED * this._speedMult * dt, dist);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    this._group.rotation.y = Math.atan2(dx, dz);
  }

  _inVisionCone(playerPos) {
    const pos = this._group.position;
    const dx  = playerPos.x - pos.x;
    const dz  = playerPos.z - pos.z;

    if (dx * dx + dz * dz > VISION_RANGE * VISION_RANGE) return false;

    const fx  = Math.sin(this._group.rotation.y);
    const fz  = Math.cos(this._group.rotation.y);
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return true;

    const dot = (fx * dx + fz * dz) / len;
    return dot > Math.cos((VISION_HALF_ANG * Math.PI) / 180);
  }
}

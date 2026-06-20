import * as THREE from 'three';

/**
 * Guard — patrols a waypoint loop, has a visible vision cone,
 * accumulates suspicion when the player enters the cone AND
 * has line-of-sight to the player (raycasted against wall meshes).
 *
 * speedMult / suspicionMult are scaled per contract tier by ContractManager.
 */

const BASE_SPEED      = 2.8;  // world units/sec at speedMult = 1
const VISION_RANGE    = 8;
const VISION_HALF_ANG = 55;   // degrees each side
const SUSPICION_RISE  = 1.0;  // per second at suspicionMult = 1
const SUSPICION_DECAY = 0.6;  // per second (not multiplied — retreat always works)
const EYE_HEIGHT      = 1.6;  // ray origin Y — above desk tops, below wall tops

const CONE_CLEAR   = new THREE.Color(0xffcc00);
const CONE_ALERTED = new THREE.Color(0xff2200);

export class Guard {
  /**
   * @param {THREE.Scene} scene
   * @param {{ waypoints: THREE.Vector3[], color?: number,
   *           speedMult?: number, suspicionMult?: number,
   *           wallMeshes?: THREE.Mesh[] }} opts
   */
  constructor(scene, { waypoints, color = 0x4a5a6a, speedMult = 1, suspicionMult = 1, wallMeshes = [] }) {
    this._waypoints     = waypoints;
    this._wpIndex       = 0;
    this._suspicion     = 0;
    this._speedMult     = speedMult;
    this._suspicionMult = suspicionMult;
    this._wallMeshes    = wallMeshes;

    // Pre-allocated to avoid per-frame GC pressure
    this._raycaster = new THREE.Raycaster();
    this._raycaster.near = 0.5; // skip guard's own volume
    this._rayFrom   = new THREE.Vector3();
    this._rayDir    = new THREE.Vector3();
    this._rayTo     = new THREE.Vector3();

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
    mesh.rotation.x = Math.PI / 2; // +π/2 maps shape +Y → group +Z (matches facing direction)
    mesh.position.y = 0.06;
    this._group.add(mesh);
  }

  // ── Update ───────────────────────────────────────────────────────────────

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

  setMultipliers(speedMult, suspicionMult) {
    this._speedMult     = speedMult;
    this._suspicionMult = suspicionMult;
  }

  setWaypoints(waypoints) {
    this._waypoints = waypoints;
  }

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
    const distSq = dx * dx + dz * dz;

    if (distSq > VISION_RANGE * VISION_RANGE) return false;

    const fx  = Math.sin(this._group.rotation.y);
    const fz  = Math.cos(this._group.rotation.y);
    const len = Math.sqrt(distSq);
    if (len < 0.01) return true; // player standing on guard

    const dot = (fx * dx + fz * dz) / len;
    if (dot <= Math.cos((VISION_HALF_ANG * Math.PI) / 180)) return false;

    // Line-of-sight: cast a ray at eye height and check for wall intersections
    if (this._wallMeshes.length > 0) {
      this._rayFrom.set(pos.x, EYE_HEIGHT, pos.z);
      this._rayTo.set(playerPos.x, EYE_HEIGHT, playerPos.z);
      this._rayDir.subVectors(this._rayTo, this._rayFrom).normalize();
      this._raycaster.set(this._rayFrom, this._rayDir);
      const hits = this._raycaster.intersectObjects(this._wallMeshes, false);
      // Blocked if a wall is closer than the player
      if (hits.length > 0 && hits[0].distance < len - 0.2) return false;
    }

    return true;
  }
}

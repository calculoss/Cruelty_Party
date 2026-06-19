import * as THREE from 'three';

/**
 * Dossier — the interactable pickup at the heart of Phase 2.
 *
 * A glowing teal file folder sitting on a surface. Floats and rotates
 * to draw the eye. Shows a floor ring indicating the interact radius.
 *
 * The contradiction text is placeholder in Phase 2; real flavour text
 * and the harvest-moment UI land in Phase 5.
 */

const INTERACT_RANGE = 2.5;  // world units
const COLOR          = 0x00c8e8;

export class Dossier {
  /**
   * @param {THREE.Scene}     scene
   * @param {THREE.Vector3}   position   world-space position (floor level)
   * @param {string}          label      short identifier shown in the UI
   */
  constructor(scene, position, label = 'DOSSIER') {
    this.label       = label;
    this._pos        = position.clone();
    this._collected  = false;
    this._animTime   = 0;

    this._group = new THREE.Group();
    this._group.position.copy(position);
    scene.add(this._group);

    this._build();
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _build() {
    const mat = new THREE.MeshLambertMaterial({ color: COLOR });

    // File folder — thin flat box
    this._file = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.40), mat);
    this._file.castShadow = true;

    // Glow point light
    this._light = new THREE.PointLight(COLOR, 1.0, 5, 2);
    this._light.position.y = 0.4;

    // Floor ring — shows interact radius
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLOR, transparent: true, opacity: 0.07,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(INTERACT_RANGE - 0.08, INTERACT_RANGE, 36),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y  = 0.02;

    this._group.add(this._file, this._light, ring);
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  update(dt) {
    if (this._collected) return;
    this._animTime += dt;
    // Gentle float + slow spin
    this._file.position.y = 0.08 + Math.sin(this._animTime * 2.1) * 0.055;
    this._file.rotation.y = this._animTime * 0.7;
    // Pulse glow
    this._light.intensity = 0.7 + Math.sin(this._animTime * 2.8) * 0.25;
  }

  // ── API ──────────────────────────────────────────────────────────────────

  /** True if the player centre is within interact distance. */
  canInteract(playerPos) {
    if (this._collected) return false;
    const dx = playerPos.x - this._pos.x;
    const dz = playerPos.z - this._pos.z;
    return dx * dx + dz * dz < INTERACT_RANGE * INTERACT_RANGE;
  }

  /** Remove the dossier from the scene; returns the label. */
  collect() {
    if (this._collected) return null;
    this._collected      = true;
    this._group.visible  = false;
    return this.label;
  }

  get collected() { return this._collected; }

  /** World-space XZ position (for UI distance hints etc.). */
  get position() { return this._pos; }
}

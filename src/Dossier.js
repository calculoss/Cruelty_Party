import * as THREE from 'three';
import { CONTRADICTIONS } from './Contradiction.js';

/**
 * Dossier — interactable pickup.
 *
 * Each dossier carries a contradiction type (CType.*) which determines
 * its colour, glow, and what the harvest card displays.
 */

const INTERACT_RANGE = 2.5;

export class Dossier {
  /**
   * @param {THREE.Scene}   scene
   * @param {THREE.Vector3} position   world-space position (surface level)
   * @param {string}        typeId     one of CType.*
   */
  constructor(scene, position, typeId) {
    const data     = CONTRADICTIONS[typeId];
    this.typeId    = typeId;
    this.label     = data.label;
    this._pos      = position.clone();
    this._collected = false;
    this._animTime  = 0;

    this._group = new THREE.Group();
    this._group.position.copy(position);
    scene.add(this._group);

    this._build(data.color);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _build(color) {
    const mat = new THREE.MeshLambertMaterial({ color });

    this._file = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.40), mat);
    this._file.castShadow = true;

    this._light = new THREE.PointLight(color, 1.0, 5, 2);
    this._light.position.y = 0.4;

    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.07,
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
    this._file.position.y = 0.08 + Math.sin(this._animTime * 2.1) * 0.055;
    this._file.rotation.y = this._animTime * 0.7;
    this._light.intensity = 0.7 + Math.sin(this._animTime * 2.8) * 0.25;
  }

  // ── API ──────────────────────────────────────────────────────────────────

  canInteract(playerPos) {
    if (this._collected) return false;
    const dx = playerPos.x - this._pos.x;
    const dz = playerPos.z - this._pos.z;
    return dx * dx + dz * dz < INTERACT_RANGE * INTERACT_RANGE;
  }

  collect() {
    if (this._collected) return;
    this._collected     = true;
    this._group.visible = false;
  }

  get collected()  { return this._collected; }
  get position()   { return this._pos; }
}

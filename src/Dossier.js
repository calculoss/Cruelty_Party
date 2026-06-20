import * as THREE from 'three';
import { CONTRADICTIONS } from './Contradiction.js';

const INTERACT_RANGE = 2.5;

export class Dossier {
  constructor(scene, position, typeId) {
    this._scene      = scene;
    this._collected  = false;
    this._animTime   = 0;
    this._pos        = position.clone();

    this._group = new THREE.Group();
    this._group.position.copy(position);
    scene.add(this._group);

    this._buildMeshes();
    this._applyType(typeId);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _buildMeshes() {
    this._mat     = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this._ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.07,
      side: THREE.DoubleSide, depthWrite: false,
    });

    this._file = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.40), this._mat);
    this._file.castShadow = true;

    this._light = new THREE.PointLight(0xffffff, 1.0, 5, 2);
    this._light.position.y = 0.4;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(INTERACT_RANGE - 0.08, INTERACT_RANGE, 36),
      this._ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y  = 0.02;

    this._group.add(this._file, this._light, ring);
  }

  _applyType(typeId) {
    const data   = CONTRADICTIONS[typeId];
    this.typeId  = typeId;
    this.label   = data.label;
    const color  = data.color;
    this._mat.color.setHex(color);
    this._ringMat.color.setHex(color);
    this._light.color.setHex(color);
  }

  // ── Per-frame ────────────────────────────────────────────────────────────

  update(dt) {
    if (this._collected) return;
    this._animTime += dt;
    this._file.position.y  = 0.08 + Math.sin(this._animTime * 2.1) * 0.055;
    this._file.rotation.y  = this._animTime * 0.7;
    this._light.intensity  = 0.7 + Math.sin(this._animTime * 2.8) * 0.25;
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

  reset() {
    this._collected     = false;
    this._animTime      = 0;
    this._group.visible = true;
  }

  /** Move to a new world position and change contradiction type. */
  reposition(newPos, newTypeId) {
    this._pos.copy(newPos);
    this._group.position.copy(newPos);
    this._applyType(newTypeId);
    this.reset();
  }

  get collected() { return this._collected; }
  get position()  { return this._pos; }
}

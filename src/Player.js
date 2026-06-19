import * as THREE from 'three';

/**
 * Player — low-poly contractor character.
 *
 * Visual design: clean box geometry, teal palette (nodding at the
 * teal-independent archetype the player embodies before they're compromised).
 *
 * Movement uses an isometric screen-space → world-space mapping so that
 * joystick/keyboard "up" always means "into the scene" regardless of camera.
 *
 * Isometric mapping (camera at +x+y+z corner, looking at origin):
 *   screen right (+jx) → world (+X, −Z)
 *   screen up    (+jy) → world (−X, −Z)
 *   Combined:
 *     worldX = jx − jy
 *     worldZ = −jx − jy   (then normalised)
 */

const SPEED       = 7;     // world units per second
const BODY_COLOR  = 0x00aece;
const HEAD_COLOR  = 0x00cce8;
const SHADOW_OPACITY = 0.28;

export class Player {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this._group = new THREE.Group();
    scene.add(this._group);

    this._buildMesh();

    // Point light that follows the player — subtle teal glow
    this._light = new THREE.PointLight(0x00b8d4, 0.6, 8, 2);
    this._light.position.set(0, 2, 0);
    this._group.add(this._light);

    // Bob state
    this._bobTime = 0;
    this._isMoving = false;
  }

  _buildMesh() {
    const bodyMat   = new THREE.MeshLambertMaterial({ color: BODY_COLOR });
    const headMat   = new THREE.MeshLambertMaterial({ color: HEAD_COLOR });
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: SHADOW_OPACITY,
    });

    // Body — elongated box, centred at y=0 (feet on the floor)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.90, 0.28), bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.30), headMat);
    head.position.y = 1.27;
    head.castShadow = true;

    // Legs (two small boxes; stay static, body bobs)
    const legMat = new THREE.MeshLambertMaterial({ color: 0x007fa8 });
    const legL   = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.28, 0.22), legMat);
    const legR   = legL.clone();
    legL.position.set(-0.13, 0.14, 0);
    legR.position.set( 0.13, 0.14, 0);
    legL.castShadow = legR.castShadow = true;

    // Ground shadow disc (cheap depth cue)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), shadowMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.01; // just above floor to avoid z-fighting

    this._body = body; // keep reference for bob animation

    this._group.add(body, head, legL, legR, disc);
  }

  /**
   * Move the player using screen-space direction input.
   *
   * @param {number} sx  screen-space X (right +)
   * @param {number} sy  screen-space Y (up +)
   * @param {number} dt  delta time in seconds
   * @param {import('./Level.js').Level} level
   */
  move(sx, sy, dt, level) {
    // Map screen direction → world XZ
    const wx = sx - sy;
    const wz = -sx - sy;

    const len = Math.sqrt(wx * wx + wz * wz);
    if (len < 0.01) {
      this._isMoving = false;
      return;
    }

    const nx = wx / len;
    const nz = wz / len;
    const step = SPEED * dt;

    this._group.position.x += nx * step;
    this._group.position.z += nz * step;

    // Keep inside the level perimeter
    if (level) level.clamp(this._group.position);

    // Face the movement direction (Y rotation around world up)
    const angle = Math.atan2(nx, nz);
    this._group.rotation.y = angle;

    this._isMoving = true;
    this._bobTime += dt;
  }

  /**
   * Per-frame update (animations that run regardless of movement).
   * @param {number} dt
   */
  update(dt) {
    if (!this._isMoving) {
      // Settle body back to rest
      this._body.position.y = 0.65 + Math.sin(this._bobTime * 1.2) * 0.005;
      this._bobTime += dt;
      return;
    }

    // Gentle walk bob on the body
    const bob = Math.sin(this._bobTime * 12) * 0.022;
    this._body.position.y = 0.65 + bob;

    this._isMoving = false; // reset each frame; move() sets it back if active
  }

  /** World-space position of the character root. */
  getPosition() {
    return this._group.position;
  }
}

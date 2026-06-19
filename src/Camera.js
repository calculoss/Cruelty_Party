import * as THREE from 'three';

/**
 * IsometricCamera
 *
 * Uses an OrthographicCamera positioned at equal distance on all three axes
 * (classic "military isometric" 45° horizontal, ~35.26° vertical).
 *
 * FRUSTUM_SIZE is the half-height of the visible world area in world units.
 * Increase it to zoom out, decrease to zoom in.
 */

const FRUSTUM_HALF_HEIGHT = 16; // world units visible from centre to top/bottom edge
const FOLLOW_SPEED        = 7;  // lerp rate for camera tracking

// The isometric offset keeps the same angle regardless of where we look.
// (d, d, d) with equal components gives the canonical isometric angle.
const ISO_OFFSET = new THREE.Vector3(22, 22, 22);

export class IsometricCamera {
  constructor() {
    // Placeholder frustum — sized properly in resize()
    this._cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);

    // The smooth-follow target (lerped position)
    this._lookAt = new THREE.Vector3();

    // Position the camera for the isometric angle
    this._cam.position.copy(ISO_OFFSET);
    this._cam.lookAt(0, 0, 0);

    this.resize(window.innerWidth, window.innerHeight);
  }

  /**
   * Call on every window resize to keep the aspect ratio correct.
   */
  resize(width, height) {
    const aspect = width / height;
    const h = FRUSTUM_HALF_HEIGHT;
    const w = h * aspect;

    this._cam.left   = -w;
    this._cam.right  =  w;
    this._cam.top    =  h;
    this._cam.bottom = -h;
    this._cam.updateProjectionMatrix();
  }

  /**
   * Smooth-follow a world position each frame.
   * @param {THREE.Vector3} target
   * @param {number} dt  delta time in seconds
   */
  follow(target, dt) {
    // Exponential lerp so the camera settles quickly but never overshoots
    const alpha = 1 - Math.exp(-FOLLOW_SPEED * dt);
    this._lookAt.lerp(target, alpha);

    // Maintain the isometric angle by adding the fixed offset
    this._cam.position.copy(this._lookAt).add(ISO_OFFSET);
    this._cam.lookAt(this._lookAt);
  }

  /** Snap to a position immediately (no lerp). Useful on spawn. */
  snapTo(target) {
    this._lookAt.copy(target);
    this._cam.position.copy(this._lookAt).add(ISO_OFFSET);
    this._cam.lookAt(this._lookAt);
  }

  /** The underlying Three.js camera object — pass to renderer.render(). */
  get threeCamera() {
    return this._cam;
  }
}

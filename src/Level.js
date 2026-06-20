import * as THREE from 'three';

/**
 * Level — grey-box government building.
 *
 * Palette chosen for legibility: walls noticeably lighter than floor so the
 * isometric silhouette reads clearly under the three-point lighting rig.
 *
 * Interior collision: every wall, pillar and piece of furniture registers its
 * XZ footprint in this._solids. Player.move() calls collidesAt() per axis
 * for sliding AABB collision.
 */

const MAT = {
  floor:    new THREE.MeshLambertMaterial({ color: 0x1e2226 }),
  wall:     new THREE.MeshLambertMaterial({ color: 0x5e6b78 }),
  obstacle: new THREE.MeshLambertMaterial({ color: 0x383e44 }),
  pillar:   new THREE.MeshLambertMaterial({ color: 0x4a5862 }),
};

export class Level {
  constructor(scene) {
    this._group     = new THREE.Group();
    scene.add(this._group);

    this._solids    = []; // { minX, maxX, minZ, maxZ } for AABB collision
    this._wallMeshes = []; // THREE.Mesh refs for guard LoS raycasting

    this.bounds = { minX: -19, maxX: 19, minZ: -19, maxZ: 19 };

    this._build();
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  _build() {
    const HALF = 20;
    const WH   = 3;    // wall height
    const WT   = 0.5;  // wall thickness

    // Ground plane (not solid — players walk on it)
    this._box(0, -0.25, 0,  HALF * 2, 0.5, HALF * 2, MAT.floor, false);

    // ── Perimeter walls (collision handled by clamp() — no need in _solids) ──
    this._box( 0,    WH / 2, -HALF,  HALF * 2, WH, WT, MAT.wall, false);
    this._box( 0,    WH / 2,  HALF,  HALF * 2, WH, WT, MAT.wall, false);
    this._box(-HALF, WH / 2,  0,     WT, WH, HALF * 2, MAT.wall, false);
    this._box( HALF, WH / 2,  0,     WT, WH, HALF * 2, MAT.wall, false);

    // ── Interior walls ──

    // Horizontal divider at z = 2 (north / south split), 8u doorway at x = −4..4
    this._box(-12,  WH / 2,  2,    16, WH, WT, MAT.wall, true);
    this._box( 12,  WH / 2,  2,    16, WH, WT, MAT.wall, true);

    // Vertical divider at x = −5 (north section), 6u doorway at z = −8..−2
    this._box(-5, WH / 2, -14,   WT, WH, 12, MAT.wall, true);  // z = −20..−8
    this._box(-5, WH / 2,   0,   WT, WH,  4, MAT.wall, true);  // z = −2..2

    // NE secure room
    this._box( 12.5, WH / 2, -6,    15, WH, WT, MAT.wall, true); // south wall
    this._box(    5, WH / 2, -15.5, WT, WH,  9, MAT.wall, true); // west wall z=−20..−11
    this._box(    5, WH / 2, -7,    WT, WH,  2, MAT.wall, true); // west wall z=−8..−6

    // ── Structural pillars ──
    for (const [px, pz] of [[-9,-9],[0,-9],[9,-9],[-9,9],[9,9]]) {
      this._box(px, WH / 2, pz,  0.9, WH, 0.9, MAT.pillar, true);
    }

    // ── Furniture / obstacles ──

    this._box( -2, 0.6,   6,    5,   1.2, 1.8, MAT.obstacle, true); // reception desk
    this._box(-12, 0.5,   8,  3.5,   1,   1.5, MAT.obstacle, true); // SW desk row
    this._box(-12, 0.5,  12,  3.5,   1,   1.5, MAT.obstacle, true);
    this._box(-12, 0.5,  16,  3.5,   1,   1.5, MAT.obstacle, true);
    this._box( 11, 0.5,   8,  3.5,   1,   1.5, MAT.obstacle, true); // SE desk row
    this._box( 11, 0.5,  12,  3.5,   1,   1.5, MAT.obstacle, true);
    this._box( 11, 0.5,  16,  3.5,   1,   1.5, MAT.obstacle, true);
    this._box(-13, 0.75, -14,   1, 1.5,   8,   MAT.obstacle, true); // filing cabinet row
    this._box( 13, 1,   -15,   3,   2,    7,   MAT.obstacle, true); // server rack 1
    this._box( 17, 1,   -15,   3,   2,    7,   MAT.obstacle, true); // server rack 2
    this._box(  3, 0.25, -5,   3,   0.5,  2,   MAT.obstacle, true); // atrium table
  }

  // ── Collision ─────────────────────────────────────────────────────────────

  /**
   * Returns true if a circle of radius r centred at (x, z) overlaps any solid.
   * Treated as AABB vs AABB (square player footprint) for simplicity.
   * @param {number} x
   * @param {number} z
   * @param {number} r  half-size of player footprint (default 0.35)
   */
  collidesAt(x, z, r = 0.35) {
    const px0 = x - r, px1 = x + r;
    const pz0 = z - r, pz1 = z + r;
    for (const b of this._solids) {
      if (px1 > b.minX && px0 < b.maxX && pz1 > b.minZ && pz0 < b.maxZ) return true;
    }
    return false;
  }

  /**
   * Clamp pos to walkable perimeter bounds (safety net, runs after collision).
   * @param {THREE.Vector3} pos
   * @param {number} radius
   */
  clamp(pos, radius = 0.35) {
    pos.x = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, pos.x));
    pos.z = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, pos.z));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _box(x, y, z, w, h, d, mat, solid = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this._group.add(mesh);
    if (solid) {
      this._solids.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      this._wallMeshes.push(mesh);
    }
    return mesh;
  }

  /** THREE.Mesh array for guard line-of-sight raycasting. */
  get wallMeshes() { return this._wallMeshes; }
}

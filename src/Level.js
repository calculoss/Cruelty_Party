import * as THREE from 'three';

/**
 * Level — grey-box government building (Phase 1).
 *
 * Palette:
 *   floor     #222426  very dark concrete
 *   wall      #353a3d  mid grey concrete
 *   obstacle  #2d3133  slightly darker than wall (furniture / cabinets)
 *   accent    #2a3438  blue-grey tint for structural pillars
 *
 * The level is 40 × 40 world units.
 * Walkable bounds are set slightly inside the perimeter walls.
 *
 * Phase 1 has no collision with interior walls — that comes in Phase 2.
 * Only the level bounds (perimeter) are enforced.
 */

// ── Materials ──────────────────────────────────────────────────────────────
const MAT = {
  floor:    new THREE.MeshLambertMaterial({ color: 0x222426 }),
  wall:     new THREE.MeshLambertMaterial({ color: 0x353a3d }),
  obstacle: new THREE.MeshLambertMaterial({ color: 0x2d3133 }),
  pillar:   new THREE.MeshLambertMaterial({ color: 0x2a3438 }),
  // Slightly lighter wall face for the east-facing surfaces (painted manually)
  wallLit:  new THREE.MeshLambertMaterial({ color: 0x3f4548 }),
};

export class Level {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this._group = new THREE.Group();
    scene.add(this._group);

    /**
     * Walkable AABB in world XZ.
     * The player's clamp() uses these to stay inside the building.
     */
    this.bounds = {
      minX: -19,
      maxX:  19,
      minZ: -19,
      maxZ:  19,
    };

    this._build();
  }

  // ── Layout construction ──────────────────────────────────────────────────

  _build() {
    const HALF = 20; // half-size of the 40×40 floor
    const WH   = 3;  // wall height
    const WT   = 0.5; // wall thickness

    // ── Ground plane ──
    this._box(0, -0.25, 0,   HALF * 2, 0.5, HALF * 2,  MAT.floor);

    // ── Perimeter walls ──
    // North (−Z edge)
    this._box( 0,    WH / 2, -HALF,   HALF * 2, WH, WT, MAT.wall);
    // South (+Z edge)
    this._box( 0,    WH / 2,  HALF,   HALF * 2, WH, WT, MAT.wall);
    // West (−X edge)
    this._box(-HALF, WH / 2,  0,      WT,  WH, HALF * 2, MAT.wall);
    // East (+X edge)
    this._box( HALF, WH / 2,  0,      WT,  WH, HALF * 2, MAT.wall);

    // ── Interior walls (open doorways created by leaving gaps) ──

    // Horizontal divider at z = 2 — splits building into NORTH / SOUTH
    //   West segment: x = −20..−4  (gap from x=−4 to x=4, i.e. 8u doorway)
    this._box(-12,   WH / 2, 2,    16, WH, WT, MAT.wall);
    //   East segment: x = 4..20
    this._box( 12,   WH / 2, 2,    16, WH, WT, MAT.wall);

    // Vertical divider at x = −5 — north section only, z = −20..0
    //   Upper segment: z = −20..−8  (gap from z=−8 to z=−2, i.e. 6u doorway)
    this._box(-5, WH / 2, -14,   WT, WH, 12,  MAT.wall);
    //   Lower segment: z = −2..2 (joins horizontal divider)
    this._box(-5, WH / 2, 0,     WT, WH, 4,   MAT.wall);

    // Small room in NE corner — "executive suite"
    // South wall of room (z = −6), x = 5..20
    this._box( 12.5, WH / 2, -6,    15, WH, WT, MAT.wall);
    // West wall of room (x = 5), with a 3u doorway gap at z = −11..−8
    this._box( 5,    WH / 2, -15.5, WT, WH,  9, MAT.wall); // z = −20..−11
    this._box( 5,    WH / 2, -7,    WT, WH,  2, MAT.wall); // z = −8..−6

    // ── Structural pillars (accent grey, add depth) ──
    const pillarPositions = [
      [-9, -9], [ 0, -9], [ 9, -9],
      [-9,  9],            [ 9,  9],
    ];
    for (const [px, pz] of pillarPositions) {
      this._box(px, WH / 2, pz,   0.9, WH, 0.9, MAT.pillar);
    }

    // ── Furniture / obstacles ──

    // Reception desk (main lobby, south section)
    this._box(-2, 0.6, 6,   5, 1.2, 1.8, MAT.obstacle);

    // Open-plan desks (south-west cluster)
    this._box(-12, 0.5,  8,   3.5, 1, 1.5, MAT.obstacle);
    this._box(-12, 0.5, 12,   3.5, 1, 1.5, MAT.obstacle);
    this._box(-12, 0.5, 16,   3.5, 1, 1.5, MAT.obstacle);

    // Office desks (south-east)
    this._box( 11, 0.5,  8,   3.5, 1, 1.5, MAT.obstacle);
    this._box( 11, 0.5, 12,   3.5, 1, 1.5, MAT.obstacle);
    this._box( 11, 0.5, 16,   3.5, 1, 1.5, MAT.obstacle);

    // Filing cabinet row (north-west office)
    this._box(-13, 0.75, -14,   1, 1.5, 8, MAT.obstacle);

    // Server racks (NE corner secure room)
    this._box( 13, 1,  -15,   3, 2, 7,   MAT.obstacle);
    this._box( 17, 1,  -15,   3, 2, 7,   MAT.obstacle);

    // Central atrium low table
    this._box( 3, 0.25, -5,   3, 0.5, 2, MAT.obstacle);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Clamp a THREE.Vector3 position to the walkable floor bounds.
   * Mutates pos in place.
   * @param {THREE.Vector3} pos
   * @param {number} radius  player half-size for offset
   */
  clamp(pos, radius = 0.4) {
    pos.x = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, pos.x));
    pos.z = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, pos.z));
  }

  /**
   * Create a box mesh and add it to the level group.
   */
  _box(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this._group.add(mesh);
    return mesh;
  }
}

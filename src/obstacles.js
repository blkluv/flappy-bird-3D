import * as THREE from 'three';

const SPACING = 26;
const COUNT = 7;
const FIRST_Z = -70;
const FLOOR_BASE = -9.5;
const CEIL_BASE = 19;
const COL_RADIUS = 1.35;

// Crystal gate columns rising from the sea and hanging from the sky.
export class Obstacles {
  constructor(scene, config) {
    this.config = config;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x3a4663, roughness: 0.92, flatShading: true,
      emissive: 0x2a3450, emissiveIntensity: 0.5,
    });
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9ff3e8, emissive: 0x46e0c8, emissiveIntensity: 1.5,
      roughness: 0.25, flatShading: true,
    });
    this.crystalDim = new THREE.MeshStandardMaterial({
      color: 0x6fb8d8, emissive: 0x2e90b8, emissiveIntensity: 0.6,
      roughness: 0.4, flatShading: true,
    });

    this.pairs = [];
    for (let i = 0; i < COUNT; i++) this.pairs.push(this.makePair(i));
    this.lastScored = null;
    this.reset();
  }

  makeColumn(up) {
    const col = new THREE.Group();
    const prism = new THREE.Mesh(
      new THREE.CylinderGeometry(COL_RADIUS, COL_RADIUS * 1.35, 1, 6), this.rockMat
    );
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.7, 6), this.crystalMat);
    if (!up) tip.rotation.x = Math.PI;
    col.add(prism, tip);

    // small glowing shards near the gate mouth
    const shards = new THREE.Group();
    for (let s = 0; s < 3; s++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9 + Math.random() * 0.7, 5), this.crystalDim);
      const a = (s / 3) * Math.PI * 2 + Math.random();
      shard.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
      shard.rotation.z = (Math.random() - 0.5) * 0.5;
      if (!up) shard.rotation.x = Math.PI;
      shards.add(shard);
    }
    col.add(shards);
    col.userData = { prism, tip, shards, up };
    return col;
  }

  makePair(i) {
    const group = new THREE.Group();
    const bottom = this.makeColumn(true);
    const top = this.makeColumn(false);
    bottom.rotation.y = Math.random() * Math.PI;
    top.rotation.y = Math.random() * Math.PI;
    group.add(bottom, top);
    this.group.add(group);
    return { group, bottom, top, gapY: 2, gapHalf: 3.5, scored: false };
  }

  setColumn(col, gapEdgeY) {
    const { prism, tip, shards, up } = col.userData;
    // tip apex sits exactly at the gap edge
    tip.position.y = gapEdgeY + (up ? -0.85 : 0.85);
    const prismTop = gapEdgeY + (up ? -1.5 : 1.5);
    const base = up ? FLOOR_BASE : CEIL_BASE;
    const h = Math.abs(prismTop - base);
    prism.scale.y = h;
    prism.position.y = (prismTop + base) / 2;
    shards.position.y = gapEdgeY + (up ? -2.1 : 2.1);
  }

  configure(pair, score) {
    const { gapStart, gapMin, gapShrink } = this.config;
    const gap = Math.max(gapMin, gapStart - score * gapShrink);
    pair.gapHalf = gap / 2;
    pair.gapY = THREE.MathUtils.lerp(-2.2, 6.8, Math.random());
    pair.scored = false;
    this.setColumn(pair.bottom, pair.gapY - pair.gapHalf);
    this.setColumn(pair.top, pair.gapY + pair.gapHalf);
  }

  reset() {
    this.pairs.forEach((pair, i) => {
      pair.group.position.z = FIRST_Z - i * SPACING;
      this.configure(pair, 0);
    });
  }

  // Advance by dz; returns how many gates were passed this frame.
  update(dz, score) {
    let passed = 0;
    for (const pair of this.pairs) {
      pair.group.position.z += dz;
      if (!pair.scored && pair.group.position.z > 2.4) {
        pair.scored = true;
        passed++;
        this.lastScored = pair;
      }
      if (pair.group.position.z > 34) {
        let minZ = Infinity;
        for (const p of this.pairs) minZ = Math.min(minZ, p.group.position.z);
        pair.group.position.z = minZ - SPACING;
        this.configure(pair, score);
      }
    }
    return passed;
  }

  // Forgiving collision: the bird's effective radius is shrunk a touch.
  hits(y, radius) {
    const r = radius * 0.78;
    for (const pair of this.pairs) {
      if (Math.abs(pair.group.position.z) < COL_RADIUS + r) {
        if (y - r < pair.gapY - pair.gapHalf || y + r > pair.gapY + pair.gapHalf) {
          return true;
        }
      }
    }
    return false;
  }

  setVisible(v) {
    this.group.visible = v;
  }
}

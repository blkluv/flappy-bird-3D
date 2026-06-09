import * as THREE from 'three';

// Particle bursts, score rings, and camera shake.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.rings = [];
    this.shake = 0;
  }

  burst(pos, { count = 50, color = 0xfff6ec, speed = 7, life = 1.3, size = 0.26, gravity = -9 } = {}) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      // random direction, varied magnitude
      const v = new THREE.Vector3(
        Math.random() - 0.5, Math.random() - 0.35, Math.random() - 0.5
      ).normalize().multiplyScalar(speed * (0.35 + Math.random() * 0.65));
      velocities[i * 3] = v.x;
      velocities[i * 3 + 1] = v.y;
      velocities[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 1, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life, maxLife: life, gravity });
  }

  feathers(pos) {
    this.burst(pos, { count: 60, color: 0xfff6ec, speed: 9, life: 1.5 });
    this.burst(pos, { count: 25, color: 0xff8e5e, speed: 6, life: 1.2, size: 0.2 });
    this.shake = 1;
  }

  puff(pos) {
    this.burst(pos, { count: 8, color: 0xffe8d4, speed: 2.2, life: 0.45, size: 0.14, gravity: -2 });
  }

  ring(pos, color = 0x9ff3e8) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.07, 8, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false })
    );
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0.55, maxLife: 0.55 });
  }

  update(dt, rawDt) {
    this.shake *= Math.exp(-rawDt * 4.5);

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const pos = b.points.geometry.attributes.position.array;
      for (let p = 0; p < pos.length; p += 3) {
        b.velocities[p + 1] += b.gravity * dt;
        pos[p] += b.velocities[p] * dt;
        pos[p + 1] += b.velocities[p + 1] * dt;
        pos[p + 2] += b.velocities[p + 2] * dt;
      }
      b.points.geometry.attributes.position.needsUpdate = true;
      b.points.material.opacity = b.life / b.maxLife;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      const s = 1 + t * 3.2;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = 0.9 * (1 - t);
    }
  }
}

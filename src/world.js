import * as THREE from 'three';

// Four moods the sky cycles through as your score climbs.
const PALETTES = [
  { // golden hour
    zenith: 0x3b2d5e, horizon: 0xff8e5e, sun: 0xffd9a0, fog: 0xf08a60,
    hemiSky: 0xffb98a, hemiGround: 0x2a3a5e, dir: 0xffd9a0, ocean: 0x14445c,
    cloud: 0xffe8d4, night: 0.0,
  },
  { // dusk
    zenith: 0x1a1038, horizon: 0xb84a7e, sun: 0xff9ecb, fog: 0x8e4470,
    hemiSky: 0xc06090, hemiGround: 0x181838, dir: 0xffb0d8, ocean: 0x0e2a4a,
    cloud: 0xe8c0e0, night: 0.35,
  },
  { // starlight
    zenith: 0x050514, horizon: 0x1b2a5a, sun: 0xcfe6ff, fog: 0x141e44,
    hemiSky: 0x32488e, hemiGround: 0x0a0a20, dir: 0xbcd8ff, ocean: 0x06182e,
    cloud: 0x44507e, night: 1.0,
  },
  { // dawn
    zenith: 0x274a7a, horizon: 0xffc46e, sun: 0xfff1c4, fog: 0xe8a878,
    hemiSky: 0xffd0a0, hemiGround: 0x24405e, dir: 0xfff1c4, ocean: 0x1e4a6a,
    cloud: 0xfff0dc, night: 0.1,
  },
];

const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  void main() {
    vec3 d = normalize(vWorld);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.62));
    float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sunAmt, 700.0) * 1.6;  // disc
    col += uSunColor * pow(sunAmt, 16.0) * 0.32;  // halo
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.sunDir = new THREE.Vector3(0.35, 0.22, -0.85).normalize();

    // working colors, lerped each frame
    this.cols = {};
    for (const k of ['zenith', 'horizon', 'sun', 'fog', 'hemiSky', 'hemiGround', 'dir', 'ocean', 'cloud']) {
      this.cols[k] = new THREE.Color();
    }
    this._a = new THREE.Color();
    this._b = new THREE.Color();
    this.night = 0;

    scene.fog = new THREE.Fog(0xf08a60, 60, 240);

    this.buildSky();
    this.buildLights();
    this.buildOcean();
    this.buildClouds();
    this.buildMountains();
    this.buildStars();
    this.applyPalette(0);
  }

  buildSky() {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uSunColor: { value: new THREE.Color() },
        uSunDir: { value: this.sunDir },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), this.skyMat);
    this.scene.add(sky);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.25);
    this.dir = new THREE.DirectionalLight(0xffffff, 2.2);
    this.dir.position.copy(this.sunDir).multiplyScalar(80);
    this.scene.add(this.hemi, this.dir);
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(620, 460, 56, 38);
    geo.rotateX(-Math.PI / 2);
    this.oceanGeo = geo;
    this.oceanBase = geo.attributes.position.array.slice();
    this.oceanMat = new THREE.MeshStandardMaterial({
      color: 0x14445c, roughness: 0.42, metalness: 0.25, flatShading: true,
      emissive: 0x14445c, emissiveIntensity: 0.45,
    });
    const ocean = new THREE.Mesh(geo, this.oceanMat);
    ocean.position.set(0, -8.2, -120);
    this.scene.add(ocean);
  }

  buildClouds() {
    this.clouds = [];
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffe8d4, roughness: 1, flatShading: true,
      emissive: 0xffe8d4, emissiveIntensity: 0.4,
    });
    for (let i = 0; i < 16; i++) {
      const cluster = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), this.cloudMat);
        puff.position.set((p - puffs / 2) * 1.6 + Math.random(), Math.random() * 0.8, Math.random() * 1.4);
        const s = 1.1 + Math.random() * 1.6;
        puff.scale.set(s * 1.5, s * 0.55, s);
        puff.rotation.y = Math.random() * Math.PI;
        cluster.add(puff);
      }
      cluster.position.set(
        (Math.random() - 0.5) * 130,
        6 + Math.random() * 16,
        -300 + Math.random() * 320
      );
      cluster.userData.drift = 0.3 + Math.random() * 0.5;
      this.scene.add(cluster);
      this.clouds.push(cluster);
    }
  }

  buildMountains() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a3050, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const h = 16 + Math.random() * 26;
      const m = new THREE.Mesh(new THREE.ConeGeometry(10 + Math.random() * 14, h, 5), mat);
      const side = i % 2 === 0 ? -1 : 1;
      m.position.set(side * (26 + Math.random() * 60), -8 + h / 2, -160 - Math.random() * 90);
      m.rotation.y = Math.random() * Math.PI;
      this.scene.add(m);
    }
  }

  buildStars() {
    const count = 450;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // random point on upper dome
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85); // bias toward zenith
      const r = 390;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) + 4;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xeef4ff, size: 1.7, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false,
    });
    this.scene.add(new THREE.Points(geo, this.starMat));
  }

  // t: continuous palette position (score / 8). Crossfades between moods.
  applyPalette(t) {
    const n = PALETTES.length;
    const idx = Math.floor(t) % n;
    const next = (idx + 1) % n;
    const f = THREE.MathUtils.smoothstep(t - Math.floor(t), 0, 1);
    const A = PALETTES[idx];
    const B = PALETTES[next];
    for (const k in this.cols) {
      this._a.setHex(A[k]);
      this._b.setHex(B[k]);
      this.cols[k].lerpColors(this._a, this._b, f);
    }
    this.night = THREE.MathUtils.lerp(A.night, B.night, f);

    this.skyMat.uniforms.uZenith.value.copy(this.cols.zenith);
    this.skyMat.uniforms.uHorizon.value.copy(this.cols.horizon);
    this.skyMat.uniforms.uSunColor.value.copy(this.cols.sun);
    this.scene.fog.color.copy(this.cols.fog);
    this.hemi.color.copy(this.cols.hemiSky);
    this.hemi.groundColor.copy(this.cols.hemiGround);
    this.dir.color.copy(this.cols.dir);
    this.dir.intensity = THREE.MathUtils.lerp(2.2, 0.9, this.night);
    this.oceanMat.color.copy(this.cols.ocean);
    this.oceanMat.emissive.copy(this.cols.ocean);
    this.cloudMat.color.copy(this.cols.cloud);
    this.cloudMat.emissive.copy(this.cols.cloud);
    this.starMat.opacity = this.night * 0.95;
  }

  update(dt, elapsed, paletteT) {
    this.applyPalette(paletteT);

    // rolling low-poly waves
    const pos = this.oceanGeo.attributes.position;
    const base = this.oceanBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.array[i * 3 + 1] =
        Math.sin(x * 0.14 + elapsed * 1.3) * 0.55 +
        Math.sin(z * 0.11 + elapsed * 0.9) * 0.7 +
        Math.sin((x + z) * 0.06 + elapsed * 0.5) * 0.4;
    }
    pos.needsUpdate = true;
    this.oceanGeo.computeVertexNormals();

    // drifting clouds
    for (const c of this.clouds) {
      c.position.z += c.userData.drift * dt * 10;
      if (c.position.z > 40) {
        c.position.z = -300;
        c.position.x = (Math.random() - 0.5) * 130;
        c.position.y = 6 + Math.random() * 16;
      }
    }
  }
}

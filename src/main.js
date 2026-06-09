import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World } from './world.js';
import { Bird } from './bird.js';
import { Obstacles } from './obstacles.js';
import { Effects } from './effects.js';
import { SFX } from './audio.js';

const CONFIG = {
  gravity: -30,
  flap: 10.4,
  maxFall: -22,
  speedStart: 13,
  speedMax: 22,
  speedRamp: 0.12,
  gapStart: 7.4,
  gapMin: 5.0,
  gapShrink: 0.05,
  ceiling: 15.5,
  floor: -7.4,
  birdRadius: 0.55,
};

const BEST_KEY = 'aetherwing-best';

// ── scene plumbing ─────────────────────────────────────────────
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 4.5, 11.5);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.7, 0.8
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const world = new World(scene);
const bird = new Bird(scene);
const obstacles = new Obstacles(scene, CONFIG);
const effects = new Effects(scene);
const sfx = new SFX();

// ── HUD ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const hud = {
  score: $('score'), menu: $('menu'), over: $('gameover'),
  finalScore: $('final-score'), finalBest: $('final-best'),
  menuBest: $('menu-best'), flash: $('flash'), newbest: $('newbest'),
};

// ── state ──────────────────────────────────────────────────────
let state = 'menu'; // menu | playing | dead
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let vy = 0;
let speed = CONFIG.speedStart;
let timeScale = 1;
let deathT = 0;
let overShown = false;
let elapsed = 0;
let paletteT = 0;

hud.menuBest.textContent = best;
obstacles.setVisible(false);

function startGame() {
  state = 'playing';
  score = 0;
  vy = CONFIG.flap * 0.6;
  speed = CONFIG.speedStart;
  bird.reset();
  obstacles.reset();
  obstacles.setVisible(true);
  hud.menu.classList.add('hidden');
  hud.over.classList.add('hidden');
  hud.score.classList.remove('hidden');
  hud.score.textContent = '0';
  sfx.start();
}

function flap() {
  vy = CONFIG.flap;
  bird.flap();
  sfx.flap();
  const p = bird.group.position;
  effects.puff(new THREE.Vector3(p.x, p.y - 0.4, p.z + 0.3));
}

function die() {
  state = 'dead';
  deathT = 0;
  overShown = false;
  sfx.crash();
  effects.feathers(bird.group.position.clone());
  hud.flash.classList.remove('boom');
  void hud.flash.offsetWidth; // restart the animation
  hud.flash.classList.add('boom');
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
    hud.newbest.classList.remove('hidden');
  } else {
    hud.newbest.classList.add('hidden');
  }
}

function showOver() {
  overShown = true;
  hud.finalScore.textContent = score;
  hud.finalBest.textContent = best;
  hud.score.classList.add('hidden');
  hud.over.classList.remove('hidden');
}

function restart() {
  hud.menuBest.textContent = best;
  startGame();
}

function onScore(passed) {
  score += passed;
  hud.score.textContent = score;
  hud.score.classList.remove('pop');
  void hud.score.offsetWidth;
  hud.score.classList.add('pop');
  sfx.score(score);
  const pair = obstacles.lastScored;
  if (pair) effects.ring(new THREE.Vector3(0, pair.gapY, pair.group.position.z));
}

// ── input ──────────────────────────────────────────────────────
function action() {
  if (state === 'menu') startGame();
  else if (state === 'playing') flap();
  else if (state === 'dead' && overShown) restart();
}

window.addEventListener('pointerdown', action);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!e.repeat) action();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ── game loop ──────────────────────────────────────────────────
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const rawDt = Math.min(clock.getDelta(), 1 / 30);

  // slow-mo on death, easing back for the game-over panel
  if (state === 'dead') {
    deathT += rawDt;
    timeScale += (0.14 - timeScale) * Math.min(1, rawDt * 8);
    if (deathT > 0.9 && !overShown) showOver();
  } else {
    timeScale += (1 - timeScale) * Math.min(1, rawDt * 4);
  }
  const dt = rawDt * timeScale;
  elapsed += dt;

  if (state === 'playing') {
    vy = Math.max(vy + CONFIG.gravity * dt, CONFIG.maxFall);
    bird.group.position.y += vy * dt;

    // soft ceiling — you can't flap out of the world
    if (bird.group.position.y > CONFIG.ceiling) {
      bird.group.position.y = CONFIG.ceiling;
      vy = Math.min(vy, 0);
    }

    speed = Math.min(CONFIG.speedMax, speed + CONFIG.speedRamp * dt);
    const passed = obstacles.update(speed * dt, score);
    if (passed) onScore(passed);

    if (bird.group.position.y < CONFIG.floor + CONFIG.birdRadius ||
        obstacles.hits(bird.group.position.y, CONFIG.birdRadius)) {
      die();
    }
  } else if (state === 'menu') {
    bird.group.position.y = 1.5 + Math.sin(elapsed * 2.1) * 0.45;
  } else if (state === 'dead') {
    vy = Math.max(vy + CONFIG.gravity * dt, CONFIG.maxFall);
    const y = bird.group.position.y + vy * dt;
    bird.group.position.y = Math.max(y, CONFIG.floor + 0.3);
    bird.group.rotation.z += dt * 7;
    bird.group.rotation.x += dt * 3;
  }

  // the sky shifts moods every 8 gates; idles gently on the menu
  paletteT = state === 'menu' ? elapsed * 0.012 : score / 8;

  bird.update(dt, vy, state);
  world.update(dt, elapsed, paletteT);
  effects.update(dt, rawDt);

  // chase camera with a touch of sway and shake
  const by = bird.group.position.y;
  const shakeX = (Math.random() - 0.5) * effects.shake * 0.7;
  const shakeY = (Math.random() - 0.5) * effects.shake * 0.7;
  camera.position.x += (Math.sin(elapsed * 0.22) * 0.5 + shakeX - camera.position.x) * Math.min(1, rawDt * 6);
  const camY = 4.2 + by * 0.42 + shakeY;
  camera.position.y += (camY - camera.position.y) * Math.min(1, rawDt * 5);
  camera.lookAt(0, by * 0.5 + 1.0, -10);

  composer.render();
}

tick();

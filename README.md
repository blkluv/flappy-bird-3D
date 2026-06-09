# 🕊️ AETHERWING — a 3D Flappy Odyssey

> Flap an origami bird through glowing crystal gates, above a glass sea, while the sky itself remembers your score.

**AETHERWING** is a fully 3D reimagining of Flappy Bird, built with Three.js and zero build tooling — pure ES modules, one `index.html`, no bundler, no dependencies to install. Open it and fly.

**🎮 Play it live → https://flappy-bird-3d-omega.vercel.app**

---

## ✨ What makes it pretty

| Feature | How it works |
|---|---|
| **Living sky** | A custom GLSL gradient dome with an analytic sun disc + halo. The palette crossfades through four moods — *golden hour → dusk → starlight → dawn* — every 8 gates you pass. Your score literally changes the weather. |
| **Glass sea** | A flat-shaded ocean of rolling low-poly waves, displaced on the CPU every frame and re-lit with recomputed normals. |
| **Crystal gates** | Hexagonal rock columns rise from the sea and hang from the sky, tipped with emissive crystals that bloom under an `UnrealBloomPass`. The glowing tips mark the exact collision boundary — what you see is what kills you. |
| **Origami bird** | Procedurally folded from flat-shaded triangles — no models, no textures. Wings are spring-driven: ambient glide plus a flap impulse that decays naturally. The bird pitches with vertical velocity. |
| **Cinematic death** | Collision triggers a feather burst (two-tone particle systems), a white flash, camera shake, and a slow-motion ease to 0.14× time before the score panel rises. |
| **Procedural audio** | Every sound — wing whoosh, pentatonic score chimes that climb with your streak, the crash — is synthesized live with WebAudio. No audio files exist in this repo. |
| **Atmosphere** | Distance fog tinted to the horizon, drifting icosahedral clouds with parallax, cone mountains on the skyline, and 450 stars that fade in at night. |

## 🎯 How to play

| Input | Action |
|---|---|
| `Space` / `↑` | flap |
| Click / tap | flap |

Pass through the gap between crystal tips. Each gate scores a point. The gaps shrink and the world speeds up as you go. Best score persists in `localStorage`.

## 🛠️ Tech

- **Three.js 0.165** via CDN import map — `WebGLRenderer` + `EffectComposer` (`RenderPass` → `UnrealBloomPass` → `OutputPass`), ACES filmic tone mapping
- **Custom shaders** for the sky dome (zenith/horizon gradient + sun)
- **Object pooling** for the gate columns — seven pairs recycle forever, zero allocation during play
- **WebAudio API** for fully procedural sound synthesis
- **Climate Crisis + Outfit** typefaces for the HUD
- **No build step.** Deployable as a static site anywhere.

## 🚀 Run locally

```bash
git clone https://github.com/SaiAmartya/flappy-bird-3D.git
cd flappy-bird-3D
python3 -m http.server 4173   # or any static server
# open http://localhost:4173
```

## 📁 Structure

```
index.html          HUD markup, import map, fonts
src/
  main.js           game loop, state machine, physics, camera, input
  world.js          sky shader, palettes, ocean, clouds, mountains, stars
  bird.js           procedural origami bird + wing animation
  obstacles.js      pooled crystal gate columns + collision
  effects.js        particle bursts, score rings, camera shake
  audio.js          WebAudio procedural sound synthesis
```

---

*created by **Claude Fable 5*** — designed, coded, play-tested, and deployed autonomously. 🤖

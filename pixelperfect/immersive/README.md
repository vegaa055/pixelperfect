# The Exhibit — an immersive WebGL gallery

A first-person art gallery for the Pixel Perfect collection, built with Three.js.
No build step, no framework, no CDN at runtime — open `index.html` and it runs.

## Layout

A single hall 18 m wide and 104 m long, divided into three wings by partition
walls with central archways:

| Wing | z-range | Contents |
|---|---|---|
| Gallery | −2 → −30 | 10 photographs |
| Portfolio | −36 → −62 | 10 illustrations + a freestanding feature wall |
| Journal | −68 → −94 | 5 entries, each a plate plus a readable wall card |

A single large print closes the hall on the end wall at z = −96.

Tall windows run down the **left** wall every 8 m. Everything about the lighting
follows from that one decision.

## How the light works

The sun direction is defined once in `config.js` and shared by every effect, so
they agree with each other:

```js
export const SUN_DIR = new THREE.Vector3(0.58, -0.66, 0.14).normalize();
```

**Light shafts** (`atmosphere.js`) — each window extrudes a four-sided beam along
`SUN_DIR`. The faces are additively blended and double-sided, so front and back
surfaces sum through each other and read as volume without any raymarching.
A value-noise term keeps each beam from looking like flat glass.

**Dust motes** — a `Points` cloud animated entirely in the vertex shader (slow
convection with wrap-around, plus a wandering drift). Each mote asks the same
question the shafts answer: *am I inside a beam?* That test is analytic rather
than sampled:

```glsl
float shaftMask(vec3 p, out float travel) {
    float t = (uWallX - p.x) / uSun.x;   // trace back to the window wall
    vec3 hit = p + uSun * t;             // where on the wall did I come from?
    // …inside the vertical aperture, and inside a periodic window opening?
}
```

Because the windows are evenly spaced, membership is a `floor()` and a
`smoothstep()` — no loop over light sources. Motes inside a beam brighten, warm
up and swell slightly, which is what actually sells the effect.

## Files

| File | Responsibility |
|---|---|
| `config.js` | Hall dimensions, window layout, sun vector, palette, quality tiers |
| `exhibit-data.js` | The manifest — what hangs where, with titles and wall text |
| `architecture.js` | Floor, ceiling, walls pierced by windows, archways, benches |
| `artwork.js` | Frames, plaques, picture-light glow, floor reflections, texture loading |
| `atmosphere.js` | Light shafts, dust motes, floor light pools |
| `controls.js` | Pointer-lock WASD, touch controls, collision, drag-look fallback |
| `textures.js` | Procedural plaster/floor/glow, and canvas-rendered plaques and signage |
| `ui.js` | Loading, wayfinding, info panel, image viewer |
| `main.js` | Scene assembly, lighting, bloom, render loop |

All text in the 3D world (plaques, wing signage, journal cards) is drawn to a
2D canvas and used as a texture — no font loader, no geometry text. The code
waits on `document.fonts.ready` first so those canvases use Fraunces and Inter
rather than a fallback.

## Performance

`detectQuality()` picks a tier from CPU cores and pointer type: dust count,
pixel-ratio cap, shadow-map size and bloom are all scaled, and bloom and shadows
are switched off entirely on low-end and mobile devices.

## Robustness

- Sizing is driven by a `ResizeObserver` on the canvas, not the window `resize`
  event, so the exhibit survives being embedded or laid out late — and never
  hands the post-processing composer a zero-sized target.
- If Pointer Lock is refused (inside an iframe, or during the browser's post-Esc
  cooldown) the promise rejection is absorbed and the controls fall back to
  click-and-drag looking, so the visitor is never stranded.
- A missing texture warns and continues rather than stalling the loading screen.
- Without WebGL the page shows a message linking back to the classic site.

## Verification harnesses

Two pages that exercise the real modules. Open either directly; results print as
JSON. Safe to delete — nothing in the exhibit imports them.

- `_verify.html` — builds the scene, renders four viewpoints to a render target
  and reads the pixels back, asserting that the custom GLSL compiles, textures
  decode, beams are brighter than their surroundings and no view is black.
- `_verify-walk.html` — simulates a visitor walking the intended route, checking
  every wing is reachable, walls and benches are solid, archways are passable and
  the visitor can never leave the building.

## Credits

Three.js r180, vendored under `vendor/three/` (`three.module.js`,
`three.core.js` and the addons for pointer-lock controls and bloom).

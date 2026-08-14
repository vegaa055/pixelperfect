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

### Spacing rule

Work is hung by **equal gaps between frames**, not by equal centre spacing.
Centre spacing only looks even when every piece is the same width: the Portfolio
wing is all portrait paintings so it reads fine either way, but the Gallery mixes
wide landscapes with portraits, and even centres left the landscapes crowding
their neighbours while the portraits floated in space.

`measurePiece()` therefore computes a frame's size *before* it is built, so
`hangByGap()` can lay out a run from real widths. A wall that still cannot make
`MIN_GAP` (0.9 m) scales its run down until it can — the frame trim is a fixed
border, so the scale factor solves directly rather than by iterating:

```
span = k·Σw + n·trim + gap·(n + 1)
```

Anything measured with one set of options **must be built with the same set**,
or the layout and the geometry disagree and the gaps drift.

### Hanging rule

The window wall can only take art on the solid **piers between** openings, so
`artwork.js` snaps those pieces to computed pier centres rather than spacing them
evenly — even spacing lands frames on the glass. Pier-mounted pieces are capped
to the pier width, wear their plaque underneath instead of beside, and use a
tighter light halo so it does not spill across the window.

Each wing has three piers except the Journal, which has two. Anything that does
not fit rolls over onto the solid wall opposite rather than covering glass, so
the manifest can grow without anyone re-deriving the geometry. The Journal's
reading cards therefore hang next to their plates on the solid wall, which also
reads better — image and text side by side.

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
| `artwork.js` | Frames, plaques, picture-light glow, wall layout, texture loading |
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
  decode, beams are brighter than their surroundings and no view is black. It
  also checks geometrically that nothing solid overlaps a window. That check
  calls `scene.updateMatrixWorld(true)` first — nothing has rendered at that
  point, so without it every `Box3` is computed in local space and the check
  passes vacuously; a companion assertion on the number of meshes actually
  inspected keeps that failure mode from coming back silently. Finally it
  measures the gap between neighbouring works on each solid wall and asserts they
  are uniform. A Journal plate and its reading card are one exhibit, so anything
  closer than 0.45 m is merged into a single unit before measuring — otherwise
  the deliberately tight gap inside a pair reads as an uneven run.
- `_verify-walk.html` — simulates a visitor walking the intended route, checking
  every wing is reachable, walls and benches are solid, archways are passable and
  the visitor can never leave the building.

## Credits

Three.js r180, vendored under `vendor/three/` (`three.module.js`,
`three.core.js` and the addons for pointer-lock controls and bloom).

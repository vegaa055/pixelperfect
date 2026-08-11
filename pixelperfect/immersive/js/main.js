/* ============================================================
   Pixel Perfect — Immersive Exhibit
   Scene assembly, lighting, post-processing and the render loop
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

import { HALL, PALETTE, SUN_DIR, detectQuality } from './config.js';
import { buildHall }                    from './architecture.js';
import { hangExhibit, loadTextures }    from './artwork.js';
import { createLightShafts, createDust, createFloorPools } from './atmosphere.js';
import { Walker }                       from './controls.js';
import { UI, sectionAt }                from './ui.js';
import { fontsReady }                   from './textures.js';

const Q = detectQuality();
const ui = new UI();

/* ---------------- renderer ---------------- */
const canvas = document.getElementById('scene');
let renderer;
try {
	renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.tier !== 'low', powerPreference: 'high-performance' });
} catch (err) {
	document.getElementById('nowebgl').classList.add('show');
	document.getElementById('loader').style.display = 'none';
	throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pixelRatio));
// size is set by applySize() below, which never allows a zero-sized target
renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (Q.shadows) {
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/* ---------------- scene & camera ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b09);
scene.fog = new THREE.Fog(0x1a1611, 26, 92);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 260);

/* ---------------- lighting ---------------- */
// bounce light off the warm walls
scene.add(new THREE.HemisphereLight(0xcfe0f2, 0x3a3229, 0.55));
scene.add(new THREE.AmbientLight(0xfff0dc, 0.28));

// the sun coming through the windows
const sun = new THREE.DirectionalLight(PALETTE.sun, 2.1);
sun.position.set(-40, 34, 10);
sun.target.position.set(10, 0, -40);
scene.add(sun.target);
if (Q.shadows) {
	sun.castShadow = true;
	sun.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 160;
	const s = 60;
	sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
	sun.shadow.camera.top = s;   sun.shadow.camera.bottom = -s;
	sun.shadow.bias = -0.0008;
	sun.shadow.normalBias = 0.03;
}
scene.add(sun);

// a soft fill that follows the visitor so nearby art never goes muddy
const lantern = new THREE.PointLight(0xffe9cc, 12, 16, 2);
scene.add(lantern);

// The finale hangs past the last window, so it gets its own picture light —
// without it the closing piece reads as a dark smudge at the end of the hall.
const finaleSpot = new THREE.SpotLight(0xffe8cc, 90, 18, Math.PI / 7, 0.55, 1.6);
finaleSpot.position.set(0, 6.4, HALL.zEnd + 5.2);
finaleSpot.target.position.set(0, 3.0, HALL.zEnd);
scene.add(finaleSpot, finaleSpot.target);

/* ---------------- build ---------------- */
const { group: hall, colliders } = buildHall();
scene.add(hall);

const shafts = createLightShafts();
scene.add(shafts);
const dust = createDust(Q.dust);
scene.add(dust);
scene.add(createFloorPools());

/* ---------------- post-processing ---------------- */
let composer = null;
if (Q.bloom) {
	composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	const bloom = new UnrealBloomPass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		0.42,   // strength — restrained; this is a gallery, not a nightclub
		0.85,   // radius
		0.82    // threshold: only the windows and beams blow out
	);
	composer.addPass(bloom);
	composer.addPass(new OutputPass());
}

/* ---------------- controls ---------------- */
const walker = new Walker(camera, renderer.domElement, colliders, { reduced: Q.reduced });

/* ---------------- picking ---------------- */
const raycaster = new THREE.Raycaster();
const centre = new THREE.Vector2(0, 0);
let pickables = [];
let hovered = null;

function updateHover() {
	if (ui.panelOpen || ui.viewerOpen) { hovered = null; ui.hidePrompt(); ui.setCrosshair(false); return; }
	raycaster.setFromCamera(centre, camera);
	const hits = raycaster.intersectObjects(pickables, false);
	const hit = hits.find(h => h.distance < 9);
	if (hit) {
		hovered = hit.object.userData.art;
		ui.setCrosshair(true);
		ui.showPrompt(walker.isTouch ? 'Tap to read' : 'Press E to read');
	} else {
		hovered = null;
		ui.setCrosshair(false);
		ui.hidePrompt();
	}
}

function inspect() {
	if (!hovered) return;
	walker.unlock();
	ui.openPanel(hovered);
	ui.hidePrompt();
}

document.addEventListener('keydown', e => {
	if (e.code === 'KeyE' && walker.active) inspect();
});
renderer.domElement.addEventListener('click', () => {
	if (ui.panelOpen || ui.viewerOpen) return;
	if (walker.isTouch) { if (hovered) inspect(); return; }
	// in drag-look mode a click that ended a drag is a look, not a select
	if (walker.dragLook) { if (hovered && !walker.wasDrag()) inspect(); return; }
	if (walker.locked) inspect();
	else walker.lock();
});

// If pointer lock is refused, say so plainly and switch the hints over.
walker.onFallback = () => {
	const help = document.getElementById('help');
	if (help) help.innerHTML =
		'<div><b>W A S D</b> &nbsp;walk</div>' +
		'<div><b>Drag</b> &nbsp;hold the mouse to look</div>' +
		'<div><kbd>Shift</kbd> &nbsp;walk faster</div>' +
		'<div><kbd>E</kbd> &nbsp;read the piece ahead</div>';
	ui.showPrompt('Drag to look · WASD to walk');
	setTimeout(() => ui.hidePrompt(), 4000);
};
// tapping is also how touch users look around, so resolve hover first
if (walker.isTouch) {
	renderer.domElement.addEventListener('touchend', () => updateHover(), { passive: true });
}

ui.onEnter  = () => walker.lock();
ui.onResume = () => { if (!walker.isTouch) walker.lock(); };

/* ---------------- resize ----------------
   Driven by a ResizeObserver rather than the window `resize` event so the
   exhibit also survives being embedded, split-paned or laid out late — and
   never hands the composer a zero-sized target (which throws GL errors). */
let sizeW = 0, sizeH = 0;
function applySize() {
	const w = Math.max(1, canvas.clientWidth  || window.innerWidth  || 1);
	const h = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
	if (w === sizeW && h === sizeH) return;
	sizeW = w; sizeH = h;

	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	renderer.setSize(w, h, false);
	composer?.setSize(w, h);
	dust.userData.material.uniforms.uPixel.value = Math.min(window.devicePixelRatio, Q.pixelRatio);
}
if ('ResizeObserver' in window) new ResizeObserver(applySize).observe(canvas);
window.addEventListener('resize', applySize);
applySize();

/* ---------------- loop ---------------- */
const clock = new THREE.Clock();
let running = false;
let currentSection = undefined;

function tick() {
	requestAnimationFrame(tick);
	if (!running) return;
	applySize();
	if (sizeW <= 1 || sizeH <= 1) return;   // not laid out yet — nothing to draw into

	const dt = Math.min(clock.getDelta(), 0.1);
	const t = clock.elapsedTime;

	walker.update(dt);

	// the fill light rides just above the visitor's eyeline
	lantern.position.copy(camera.position);
	lantern.position.y += 0.4;

	shafts.userData.material.uniforms.uTime.value = t;
	dust.userData.material.uniforms.uTime.value = t;

	updateHover();

	const sec = sectionAt(camera.position.z);
	if (sec !== currentSection) { currentSection = sec; ui.setSection(sec); }

	if (composer) composer.render(dt);
	else renderer.render(scene, camera);
}

document.addEventListener('visibilitychange', () => {
	if (document.hidden) clock.stop();
	else { clock.start(); }
});

/* ---------------- boot ---------------- */
(async function boot() {
	await fontsReady();                     // so canvas plaques use Fraunces/Inter
	const textures = await loadTextures((d, n) => ui.progress(d, n));
	const { group, pickables: picks } = hangExhibit(textures);
	scene.add(group);
	pickables = picks;

	// warm up shaders so entering the hall doesn't hitch
	renderer.compile(scene, camera);

	ui.setSection(null);
	ui.ready();
	running = true;
	tick();
})().catch(err => {
	console.error('[exhibit] boot failed', err);
	ui.fail('The exhibit could not be prepared. ' + (err?.message || ''));
});

/* ============================================================
   Pixel Perfect — Immersive Exhibit
   Shared configuration: hall dimensions, light, palette, quality
   ============================================================ */
import * as THREE from 'three';

/* ---------- The hall ---------- */
export const HALL = {
	halfWidth:  9,      // inner face of side walls at x = ±9
	height:     7.6,    // ceiling
	zEntrance:  8,      // wall behind the visitor
	zEnd:      -96,     // far feature wall
	thickness:  0.5,
};

/* ---------- Windows (left wall, x = -halfWidth) ---------- */
export const WINDOWS = {
	startZ:  -6,
	spacing:  8,
	count:   11,
	width:   3.2,
	height:  4.3,
	sill:    1.9,
};

/* Direction the sunlight travels: in from the left, downward, drifting deeper.
   Kept normalised and shared by the shaft meshes AND the dust shader so the
   motes glint exactly where the beams actually fall. */
export const SUN_DIR = new THREE.Vector3(0.58, -0.66, 0.14).normalize();

/* ---------- Exhibit wings ---------- */
export const SECTIONS = [
	{ id: 'gallery',   title: 'Gallery',   subtitle: 'Photography',        zStart: -2,  zEnd: -30 },
	{ id: 'portfolio', title: 'Portfolio', subtitle: 'Illustration',       zStart: -36, zEnd: -62 },
	{ id: 'journal',   title: 'Journal',   subtitle: 'Notes on Making',    zStart: -68, zEnd: -94 },
];

/* Partition walls between wings (each has a central archway) */
export const PARTITIONS = [-32, -64];
export const ARCH = { width: 5.4, height: 4.8 };

/* ---------- Palette (matches the 2D site) ---------- */
export const PALETTE = {
	ink:        0x17130f,
	wall:       0xded5c6,
	wallDeep:   0xc9bfae,
	ceiling:    0xcfc6b6,
	floor:      0x241f19,
	trim:       0x2c2620,
	frame:      0x191410,
	accent:     0xd4441e,
	sun:        0xffe6c4,
	sky:        0xbdd4e8,
};

/* ---------- Quality tiers ---------- */
export function detectQuality() {
	const ua = navigator.userAgent;
	const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
	const cores = navigator.hardwareConcurrency || 4;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (isMobile || cores <= 2) {
		return { tier: 'low',  bloom: false, shadows: false, dust: 1400, pixelRatio: 1,   shadowMap: 1024, reduced };
	}
	if (cores <= 6) {
		return { tier: 'med',  bloom: true,  shadows: true,  dust: 3200, pixelRatio: 1.35, shadowMap: 1536, reduced };
	}
	return   { tier: 'high', bloom: true,  shadows: true,  dust: 5000, pixelRatio: 1.75, shadowMap: 2048, reduced };
}

/* Convenience: world-space z of window i */
export function windowZ(i) {
	return WINDOWS.startZ - i * WINDOWS.spacing;
}

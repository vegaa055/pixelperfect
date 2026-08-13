/* ============================================================
   Hanging the show — frames, plaques and picture-light glow.
   ============================================================ */
import * as THREE from 'three';
import { HALL, SECTIONS, PALETTE, WINDOWS, windowZ } from './config.js';
import { ARTWORKS, FINALE } from './exhibit-data.js';
import { plaqueTexture, glowTexture, journalCardTexture } from './textures.js';

const EYE = 2.45;            // centre height of a hung piece
const MAX_H = 2.3;           // tallest a normal piece gets
const MAX_W = 3.4;

const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.55, metalness: 0.15 });
const matboard = new THREE.MeshStandardMaterial({ color: 0xf2ede3, roughness: 0.95 });

/* Work out how big a piece will be *before* building it, so the wall can be
   laid out by real frame widths rather than by centre spacing. */
function measurePiece(texture, opts = {}) {
	const img = texture && texture.image;
	const aspect = (img && img.width && img.height) ? img.width / img.height : 0.75;

	let h = opts.maxH || MAX_H;
	let w = h * aspect;
	const maxW = opts.maxW || MAX_W;
	if (w > maxW) { w = maxW; h = w / aspect; }

	const border = opts.border ?? 0.13;
	const matW = opts.mat ?? 0.16;
	const trim = (border + matW) * 2;
	return { w, h, border, matW, frameW: w + trim, frameH: h + trim };
}

/* Build one framed piece. Returns a Group placed at the origin, facing +z. */
function makePiece(texture, art, opts = {}) {
	const g = new THREE.Group();
	const { w, h, border, matW } = measurePiece(texture, opts);

	// backing panel = the frame face
	const panel = new THREE.Mesh(
		new THREE.BoxGeometry(w + (border + matW) * 2, h + (border + matW) * 2, 0.09),
		frameMat
	);
	panel.castShadow = true;
	panel.receiveShadow = true;
	panel.name = 'frame';
	g.add(panel);

	// mat board just inside the frame
	const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + matW * 2, h + matW * 2), matboard);
	mat.position.z = 0.047;
	mat.name = 'mat';
	g.add(mat);

	// the artwork itself — lit but also self-lit so it always reads
	const artMat = new THREE.MeshStandardMaterial({
		map: texture,
		roughness: 0.9,
		metalness: 0,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: 0.34,
	});
	const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
	plane.position.z = 0.05;
	plane.name = 'artwork';
	plane.userData.art = art;
	g.add(plane);

	// Picture-light pool on the wall behind. Kept tight on pier-mounted pieces so
	// the halo does not spill across the window glass either side.
	const gs = opts.glowScale ?? 1;
	const glow = new THREE.Mesh(
		new THREE.PlaneGeometry(w * 2.1 * gs, h * 2.3 * gs),
		new THREE.MeshBasicMaterial({
			map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending,
			depthWrite: false, opacity: 0.5 * (gs < 1 ? 0.8 : 1), fog: true,
		})
	);
	glow.position.z = -0.055;
	glow.renderOrder = 2;
	glow.name = 'glow';
	g.add(glow);

	// Plaque. Beside the frame by default; centred underneath for pieces hung on
	// a narrow pier, where a side plaque would run onto the window glass.
	const plaque = new THREE.Mesh(
		new THREE.PlaneGeometry(0.62, 0.25),
		new THREE.MeshBasicMaterial({ map: plaqueTexture(art), transparent: true })
	);
	if (opts.plaquePos === 'below') {
		plaque.position.set(0, -(h / 2 + matW + border + 0.22), 0.05);
	} else {
		plaque.position.set(w / 2 + matW + border + 0.42, -h / 2 + 0.05, 0.05);
	}
	plaque.name = 'plaque';
	g.add(plaque);

	g.userData = { art, width: w, height: h, plane };
	return g;
}

/* Evenly space n items across a z-range by their centres. Fine when everything
   is the same size — see hangByGap() for walls with mixed formats. */
function spread(zStart, zEnd, n) {
	if (n === 1) return [(zStart + zEnd) / 2];
	const out = [];
	const span = zEnd - zStart;
	for (let i = 0; i < n; i++) out.push(zStart + (span * (i + 0.5)) / n);
	return out;
}

/* Hang a run of pieces with an equal gap between neighbours — the way work is
   actually hung. Even centre spacing bunches wide landscapes against their
   neighbours while leaving holes around narrow portraits, because the frames
   are not the same width. Takes the frame widths, returns centre positions. */
function hangByGap(zStart, zEnd, widths) {
	const n = widths.length;
	if (!n) return [];
	const span = Math.abs(zStart - zEnd);
	const total = widths.reduce((a, b) => a + b, 0);
	const gap = (span - total) / (n + 1);          // equal gaps, including the ends
	const dir = Math.sign(zEnd - zStart) || -1;    // the hall runs toward -z

	const out = [];
	let cursor = gap;                              // distance travelled from zStart
	for (const w of widths) {
		out.push(zStart + dir * (cursor + w / 2));
		cursor += w + gap;
	}
	out.gap = gap;
	return out;
}

/* The window wall can only take art on the solid piers *between* openings.
   Returns the centre of every pier falling inside a wing's z-range. */
function pierCentres(zStart, zEnd) {
	const out = [];
	for (let i = 0; i < WINDOWS.count - 1; i++) {
		const pc = windowZ(i) - WINDOWS.spacing / 2;
		if (pc <= zStart && pc >= zEnd) out.push(pc);
	}
	return out;
}

/* Widest a piece may be on a pier, leaving a margin either side of the glass */
const PIER_WIDTH = WINDOWS.spacing - WINDOWS.width;         // 4.8 m
const PIER_ART_MAX_W = PIER_WIDTH - 1.6;                    // image, before frame

/* A journal entry hangs as a unit: the plate, then its reading card.
   The gap inside a pair is kept well under the gap between pairs so the two
   read as one exhibit rather than as separate items. */
const JOURNAL_CARD_W = 1.3;
const JOURNAL_CARD_GAP = 0.28;

/* Breathing room a wall must keep between neighbouring frames. Wide landscape
   formats would otherwise fill a wing and leave the run feeling crowded, so a
   run that cannot make this gap is scaled down until it can. */
const MIN_GAP = 0.9;

/* How much to shrink a run so it hangs with at least MIN_GAP between frames.
   Frame trim is a fixed border, so the image widths solve directly:
       span = k·Σw + n·trim + gap·(n + 1)                                    */
function fitScale(textures, arts, opts, zStart, zEnd, extraPerItem = 0) {
	const n = arts.length;
	if (!n) return 1;
	const span = Math.abs(zStart - zEnd);
	const measured = arts.map(a => measurePiece(textures.get(a.src), opts));
	const trim = measured[0].frameW - measured[0].w;
	const sumW = measured.reduce((s, m) => s + m.w, 0);

	const budget = span - MIN_GAP * (n + 1) - n * (trim + extraPerItem);
	if (sumW <= budget) return 1;                    // already roomy enough
	return Math.max(0.5, budget / sumW);             // never shrink to nothing
}

/* ============================================================
   Hang everything. Returns { group, pickables }
   ============================================================ */
export function hangExhibit(textures) {
	const group = new THREE.Group();
	group.name = 'exhibit';
	const pickables = [];
	const W = HALL.halfWidth;

	function place(art, x, z, rotY, opts) {
		const tex = textures.get(art.src);
		if (!tex) return;
		const piece = makePiece(tex, art, opts);
		piece.position.set(x, EYE, z);
		piece.rotation.y = rotY;
		group.add(piece);
		pickables.push(piece.userData.plane);
		return piece;
	}

	/* ---- Side walls ---- */
	SECTIONS.forEach(sec => {
		const data = ARTWORKS[sec.id];
		if (!data) return;

		// The window wall only has room on the piers, so anything that does not
		// fit rolls over onto the solid wall opposite rather than covering glass.
		const piers    = pierCentres(sec.zStart, sec.zEnd);
		const leftArt  = (data.left || []).slice(0, piers.length);
		const overflow = (data.left || []).slice(piers.length);
		const rightArt = [...(data.right || []), ...overflow];
		if (overflow.length) {
			console.info(`[exhibit] ${sec.id}: ${overflow.length} piece(s) moved to the solid wall — only ${piers.length} piers between windows.`);
		}

		if (rightArt.length) {
			const isJournal = sec.id === 'journal';
			// Journal opts keep a plate narrow enough to sit beside its card
			const base = isJournal ? { maxH: 1.9, maxW: 2.4, plaquePos: 'below' } : {};

			// shrink the run only if it would otherwise hang tighter than MIN_GAP
			const extra = isJournal ? JOURNAL_CARD_GAP + JOURNAL_CARD_W : 0;
			const k = fitScale(textures, rightArt, base, sec.zStart, sec.zEnd, extra);
			const opts = k === 1 ? base : {
				...base,
				maxH: (base.maxH || MAX_H) * k,
				maxW: (base.maxW || MAX_W) * k,
			};

			// measure every frame first, then hang them with one consistent gap
			const widths = rightArt.map(art => {
				const m = measurePiece(textures.get(art.src), opts);
				// a journal unit is the plate plus its reading card
				return isJournal ? m.frameW + JOURNAL_CARD_GAP + JOURNAL_CARD_W : m.frameW;
			});
			const zs = hangByGap(sec.zStart, sec.zEnd, widths);

			rightArt.forEach((art, i) => {
				// right wall faces -x, so rotate to look back across the hall
				if (isJournal) {
					const unitW = widths[i];
					const plateW = unitW - JOURNAL_CARD_GAP - JOURNAL_CARD_W;
					// unit centre -> plate on the near side, card just beyond it
					const unitStart = zs[i] + unitW / 2;                 // travelling toward -z
					const plateZ = unitStart - plateW / 2;
					const cardZ = unitStart - plateW - JOURNAL_CARD_GAP - JOURNAL_CARD_W / 2;
					place(art, W - 0.28, plateZ, -Math.PI / 2, opts);
					addJournalCard(art, cardZ);
				} else {
					// must be the same opts the width was measured with
					place(art, W - 0.28, zs[i], -Math.PI / 2, opts);
				}
			});
		}

		leftArt.forEach((art, i) => {
			place(art, -W + 0.28, piers[i], Math.PI / 2,
				{ maxH: 1.75, maxW: PIER_ART_MAX_W, plaquePos: 'below', glowScale: 0.62 });
		});

		if (data.feature && data.feature.length) {
			// on the freestanding wall at z = -49, facing the visitor walking in
			data.feature.forEach(art => {
				place(art, 0, -49 + 0.27, 0, { maxH: 3.1, maxW: 5.4 });
			});
		}
	});

	/* A readable wall card, hung on the solid wall beside its plate */
	function addJournalCard(entry, z) {
		const cardTex = journalCardTexture(entry);
		const card = new THREE.Mesh(
			new THREE.PlaneGeometry(1.3, 1.73),
			new THREE.MeshStandardMaterial({
				map: cardTex, roughness: 0.95,
				emissive: 0xffffff, emissiveMap: cardTex, emissiveIntensity: 0.22,
			})
		);
		card.position.set(W - 0.28, 2.45, z);
		card.rotation.y = -Math.PI / 2;
		card.name = 'journal-card';
		card.userData.art = entry;
		group.add(card);
		pickables.push(card);
	}

	/* ---- The finale on the end wall ---- */
	const finTex = textures.get(FINALE.src);
	if (finTex) {
		const piece = makePiece(finTex, FINALE, { maxH: 4.2, maxW: 6, border: 0.2, mat: 0.28 });
		piece.position.set(0, 3.0, HALL.zEnd + 0.32);
		group.add(piece);
		pickables.push(piece.userData.plane);
	}

	return { group, pickables };
}

/* ============================================================
   Texture loading with progress
   ============================================================ */
export function loadTextures(onProgress) {
	const sources = new Set();
	Object.values(ARTWORKS).forEach(sec => {
		['left', 'right', 'feature'].forEach(k => {
			(sec[k] || []).forEach(a => sources.add(a.src));
		});
	});
	sources.add(FINALE.src);

	const list = [...sources];
	const map = new Map();
	let done = 0;

	return new Promise(resolve => {
		if (!list.length) return resolve(map);
		const loader = new THREE.TextureLoader();
		list.forEach(src => {
			loader.load(
				src,
				tex => {
					tex.colorSpace = THREE.SRGBColorSpace;
					tex.anisotropy = 8;
					tex.generateMipmaps = true;
					tex.minFilter = THREE.LinearMipmapLinearFilter;
					map.set(src, tex);
					onProgress && onProgress(++done, list.length);
					if (done === list.length) resolve(map);
				},
				undefined,
				() => {
					// a missing file must not stall the whole exhibit
					console.warn('[exhibit] failed to load', src);
					onProgress && onProgress(++done, list.length);
					if (done === list.length) resolve(map);
				}
			);
		});
	});
}

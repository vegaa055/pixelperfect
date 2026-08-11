/* ============================================================
   Hanging the show — frames, plaques, picture-light glow and
   a soft floor reflection under each piece.
   ============================================================ */
import * as THREE from 'three';
import { HALL, SECTIONS, PALETTE } from './config.js';
import { ARTWORKS, FINALE } from './exhibit-data.js';
import { plaqueTexture, glowTexture, journalCardTexture } from './textures.js';

const EYE = 2.45;            // centre height of a hung piece
const MAX_H = 2.3;           // tallest a normal piece gets
const MAX_W = 3.4;

const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.55, metalness: 0.15 });
const matboard = new THREE.MeshStandardMaterial({ color: 0xf2ede3, roughness: 0.95 });

/* Reflection shader: mirrored art, fading away from the wall */
function reflectionMaterial(map) {
	return new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms: { uMap: { value: map }, uStrength: { value: 0.16 } },
		vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
		fragmentShader: /* glsl */`
			uniform sampler2D uMap; uniform float uStrength; varying vec2 vUv;
			void main(){
				// v runs away from the wall — sample flipped, fade with distance
				vec3 c = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y)).rgb;
				float fade = pow(1.0 - vUv.y, 2.2);
				float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
				gl_FragColor = vec4(c, fade * edge * uStrength);
			}
		`,
	});
}

/* Build one framed piece. Returns a Group placed at the origin, facing +z. */
function makePiece(texture, art, opts = {}) {
	const g = new THREE.Group();
	const img = texture.image;
	const aspect = (img && img.width && img.height) ? img.width / img.height : 0.75;

	let h = opts.maxH || MAX_H;
	let w = h * aspect;
	const maxW = opts.maxW || MAX_W;
	if (w > maxW) { w = maxW; h = w / aspect; }

	const border = opts.border ?? 0.13;
	const matW = opts.mat ?? 0.16;

	// backing panel = the frame face
	const panel = new THREE.Mesh(
		new THREE.BoxGeometry(w + (border + matW) * 2, h + (border + matW) * 2, 0.09),
		frameMat
	);
	panel.castShadow = true;
	panel.receiveShadow = true;
	g.add(panel);

	// mat board just inside the frame
	const mat = new THREE.Mesh(new THREE.PlaneGeometry(w + matW * 2, h + matW * 2), matboard);
	mat.position.z = 0.047;
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

	// picture-light pool on the wall behind
	const glow = new THREE.Mesh(
		new THREE.PlaneGeometry(w * 2.1, h * 2.3),
		new THREE.MeshBasicMaterial({
			map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending,
			depthWrite: false, opacity: 0.5, fog: true,
		})
	);
	glow.position.z = -0.055;
	glow.renderOrder = 2;
	g.add(glow);

	// plaque, hung to the lower right
	const plaque = new THREE.Mesh(
		new THREE.PlaneGeometry(0.62, 0.25),
		new THREE.MeshBasicMaterial({ map: plaqueTexture(art), transparent: true })
	);
	plaque.position.set(w / 2 + matW + border + 0.42, -h / 2 + 0.05, 0.05);
	g.add(plaque);

	g.userData = { art, width: w, height: h, plane };
	return g;
}

/* Floor reflection laid in front of a wall piece */
function makeReflection(texture, w, h) {
	const geo = new THREE.PlaneGeometry(w, h * 0.85);
	const m = new THREE.Mesh(geo, reflectionMaterial(texture));
	m.rotation.x = -Math.PI / 2;
	m.renderOrder = 3;
	return m;
}

/* Evenly space n items across a z-range */
function spread(zStart, zEnd, n) {
	if (n === 1) return [(zStart + zEnd) / 2];
	const out = [];
	const span = zEnd - zStart;
	for (let i = 0; i < n; i++) out.push(zStart + (span * (i + 0.5)) / n);
	return out;
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
		addReflection(tex, piece.userData.width, piece.userData.height, x, z, rotY);
		return piece;
	}

	/* Lay the mirrored image on the floor in front of the piece.
	   The plane's local +v must point away from the wall, so it is laid
	   flat about X and then spun about world Y — hence the YXZ order. */
	function addReflection(tex, width, height, x, z, rotY) {
		const refl = makeReflection(tex, width, height);
		const nx = Math.sin(rotY), nz = Math.cos(rotY);   // outward normal
		const out = height * 0.42;
		refl.position.set(x + nx * out, 0.025, z + nz * out);
		refl.rotation.order = 'YXZ';
		refl.rotation.set(-Math.PI / 2, Math.PI + rotY, 0);
		group.add(refl);
	}

	/* ---- Wing 1 & 2: side walls ---- */
	SECTIONS.forEach(sec => {
		const data = ARTWORKS[sec.id];
		if (!data) return;

		if (data.right && data.right.length) {
			const zs = spread(sec.zStart, sec.zEnd, data.right.length);
			data.right.forEach((art, i) => {
				// right wall faces -x, so rotate to look back across the hall
				place(art, W - 0.28, zs[i], -Math.PI / 2);
			});
		}
		if (data.left && data.left.length) {
			const zs = spread(sec.zStart, sec.zEnd, data.left.length);
			data.left.forEach((art, i) => {
				place(art, -W + 0.28, zs[i], Math.PI / 2, { maxH: 1.9 });
			});
		}
		if (data.feature && data.feature.length) {
			// on the freestanding wall at z = -49, facing the visitor walking in
			data.feature.forEach(art => {
				place(art, 0, -49 + 0.27, 0, { maxH: 3.1, maxW: 5.4 });
			});
		}
	});

	/* ---- Journal reading cards, mounted opposite their plate ---- */
	const jr = ARTWORKS.journal.right;
	const jz = spread(SECTIONS[2].zStart, SECTIONS[2].zEnd, jr.length);
	jr.forEach((entry, i) => {
		const cardTex = journalCardTexture(entry);
		const card = new THREE.Mesh(
			new THREE.PlaneGeometry(1.5, 2.0),
			new THREE.MeshStandardMaterial({
				map: cardTex, roughness: 0.95,
				emissive: 0xffffff, emissiveMap: cardTex, emissiveIntensity: 0.22,
			})
		);
		card.position.set(-W + 0.3, 2.3, jz[i]);
		card.rotation.y = Math.PI / 2;
		card.userData.art = entry;
		group.add(card);
		pickables.push(card);
	});

	/* ---- The finale on the end wall ---- */
	const finTex = textures.get(FINALE.src);
	if (finTex) {
		const piece = makePiece(finTex, FINALE, { maxH: 4.2, maxW: 6, border: 0.2, mat: 0.28 });
		piece.position.set(0, 3.0, HALL.zEnd + 0.32);
		group.add(piece);
		pickables.push(piece.userData.plane);

		const refl = makeReflection(finTex, piece.userData.width, piece.userData.height);
		refl.position.set(0, 0.025, HALL.zEnd + 0.32 + piece.userData.height * 0.45);
		group.add(refl);
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

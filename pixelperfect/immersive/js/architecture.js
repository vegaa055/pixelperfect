/* ============================================================
   The building — floor, ceiling, walls pierced by windows,
   partition archways between wings, benches and signage.
   Returns { group, colliders } for the controller to walk against.
   ============================================================ */
import * as THREE from 'three';
import { HALL, WINDOWS, PARTITIONS, ARCH, SECTIONS, PALETTE, windowZ } from './config.js';
import { plasterTexture, floorTexture, signTexture } from './textures.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

export function buildHall() {
	const group = new THREE.Group();
	group.name = 'hall';
	const colliders = [];

	const zA = HALL.zEntrance, zB = HALL.zEnd;
	const depth = zA - zB;
	const midZ = (zA + zB) / 2;
	const W = HALL.halfWidth;

	/* ---------------- materials ---------------- */
	const wallMat = new THREE.MeshStandardMaterial({
		color: PALETTE.wall, roughness: 0.96, metalness: 0,
		map: plasterTexture(5),
	});
	const wallDeepMat = new THREE.MeshStandardMaterial({
		color: PALETTE.wallDeep, roughness: 0.96, metalness: 0,
		map: plasterTexture(4),
	});
	const ceilMat = new THREE.MeshStandardMaterial({
		color: PALETTE.ceiling, roughness: 1, metalness: 0,
	});
	const floorMat = new THREE.MeshStandardMaterial({
		color: PALETTE.floor, roughness: 0.34, metalness: 0.08,
		map: floorTexture(16),
	});
	const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.trim, roughness: 0.7 });
	const reveal  = new THREE.MeshStandardMaterial({ color: 0xe8e0d2, roughness: 0.9 });

	/* ---------------- floor & ceiling ---------------- */
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, depth), floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.set(0, 0, midZ);
	floor.receiveShadow = true;
	floor.name = 'floor';
	group.add(floor);

	const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, depth), ceilMat);
	ceiling.rotation.x = Math.PI / 2;
	ceiling.position.set(0, HALL.height, midZ);
	group.add(ceiling);

	// ceiling beams
	const beamGeo = box(W * 2, 0.34, 0.5);
	for (let z = zA - 4; z > zB; z -= 8) {
		const beam = new THREE.Mesh(beamGeo, trimMat);
		beam.position.set(0, HALL.height - 0.17, z);
		beam.castShadow = false;
		group.add(beam);
	}

	/* ---------------- right wall (solid hanging wall) ---------------- */
	const right = new THREE.Mesh(box(HALL.thickness, HALL.height, depth), wallMat);
	right.position.set(W + HALL.thickness / 2, HALL.height / 2, midZ);
	right.receiveShadow = true;
	group.add(right);

	/* ---------------- left wall, pierced by windows ---------------- */
	const sill = WINDOWS.sill;
	const winTop = WINDOWS.sill + WINDOWS.height;
	const halfW = WINDOWS.width / 2;

	// solid panels between / around the openings, marching along -z
	const edges = [];
	for (let i = 0; i < WINDOWS.count; i++) {
		const zc = windowZ(i);
		edges.push([zc + halfW, zc - halfW]); // [nearer, farther] in -z travel
	}

	// full-height piers between windows
	let cursor = zA;
	for (let i = 0; i < edges.length; i++) {
		const [nearZ, farZ] = edges[i];
		if (cursor > nearZ) addLeftPanel(cursor, nearZ, 0, HALL.height);
		// below and above the opening
		addLeftPanel(nearZ, farZ, 0, sill);
		addLeftPanel(nearZ, farZ, winTop, HALL.height);
		addWindowReveal(nearZ, farZ);
		cursor = farZ;
	}
	if (cursor > zB) addLeftPanel(cursor, zB, 0, HALL.height);

	function addLeftPanel(z1, z2, yBottom, yTop) {
		const d = Math.abs(z1 - z2);
		const h = yTop - yBottom;
		if (d <= 0.001 || h <= 0.001) return;
		const m = new THREE.Mesh(box(HALL.thickness, h, d), wallMat);
		m.position.set(-W - HALL.thickness / 2, yBottom + h / 2, (z1 + z2) / 2);
		m.receiveShadow = true;
		group.add(m);
	}

	// bright reveals around each opening sell the "outside is blown out" look
	function addWindowReveal(z1, z2) {
		const d = Math.abs(z1 - z2);
		const zc = (z1 + z2) / 2;
		const x = -W - HALL.thickness;
		const pane = new THREE.Mesh(
			new THREE.PlaneGeometry(d, WINDOWS.height),
			new THREE.MeshBasicMaterial({ color: 0xfff6e6, side: THREE.DoubleSide, fog: false })
		);
		pane.rotation.y = Math.PI / 2;
		pane.position.set(x - 0.02, sill + WINDOWS.height / 2, zc);
		group.add(pane);

		// mullion
		const bar = new THREE.Mesh(box(0.1, WINDOWS.height, 0.12), trimMat);
		bar.position.set(-W - 0.1, sill + WINDOWS.height / 2, zc);
		group.add(bar);
		const barH = new THREE.Mesh(box(0.1, 0.12, d), trimMat);
		barH.position.set(-W - 0.1, sill + WINDOWS.height * 0.55, zc);
		group.add(barH);

		// stone sill
		const sillMesh = new THREE.Mesh(box(0.7, 0.16, d + 0.3), reveal);
		sillMesh.position.set(-W + 0.1, sill - 0.08, zc);
		group.add(sillMesh);
	}

	/* ---------------- end caps ---------------- */
	const entranceWall = new THREE.Mesh(box(W * 2, HALL.height, HALL.thickness), wallDeepMat);
	entranceWall.position.set(0, HALL.height / 2, zA + HALL.thickness / 2);
	group.add(entranceWall);

	const endWall = new THREE.Mesh(box(W * 2, HALL.height, HALL.thickness), wallDeepMat);
	endWall.position.set(0, HALL.height / 2, zB - HALL.thickness / 2);
	endWall.receiveShadow = true;
	group.add(endWall);

	/* ---------------- baseboards ---------------- */
	const baseGeo = box(0.12, 0.34, depth);
	[-W, W].forEach(x => {
		const b = new THREE.Mesh(baseGeo, trimMat);
		b.position.set(x + (x < 0 ? 0.06 : -0.06), 0.17, midZ);
		group.add(b);
	});

	/* ---------------- partition walls with archways ---------------- */
	PARTITIONS.forEach(pz => {
		const t = 0.6;
		const sideW = (W * 2 - ARCH.width) / 2;

		// piers either side of the opening
		[-1, 1].forEach(sign => {
			const m = new THREE.Mesh(box(sideW, HALL.height, t), wallDeepMat);
			const cx = sign * (ARCH.width / 2 + sideW / 2);
			m.position.set(cx, HALL.height / 2, pz);
			m.receiveShadow = true;
			m.castShadow = true;
			group.add(m);
			colliders.push({
				minX: cx - sideW / 2, maxX: cx + sideW / 2,
				minZ: pz - t / 2,     maxZ: pz + t / 2,
			});
		});

		// lintel above the arch
		const lintelH = HALL.height - ARCH.height;
		const lintel = new THREE.Mesh(box(ARCH.width, lintelH, t), wallDeepMat);
		lintel.position.set(0, ARCH.height + lintelH / 2, pz);
		lintel.castShadow = true;
		group.add(lintel);

		// accent reveal inside the opening
		const jamb = new THREE.Mesh(box(0.1, ARCH.height, t + 0.06), trimMat);
		[-1, 1].forEach(s => {
			const j = jamb.clone();
			j.position.set(s * ARCH.width / 2, ARCH.height / 2, pz);
			group.add(j);
		});
	});

	/* ---------------- wing signage ---------------- */
	SECTIONS.forEach(sec => {
		const tex = signTexture(sec.title, sec.subtitle);
		const sign = new THREE.Mesh(
			new THREE.PlaneGeometry(5.2, 2.6),
			new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true })
		);
		// hung on the right wall at the mouth of each wing, facing into the room
		sign.position.set(W - 0.02, 5.35, sec.zStart - 1.5);
		sign.rotation.y = -Math.PI / 2;
		group.add(sign);
	});

	/* ---------------- benches ----------------
	   Set off the centre line, on the window side, so they catch the afternoon
	   light and — importantly — leave the central aisle clear to walk. */
	const BENCH_X = -3.4;
	const benchTop = new THREE.MeshStandardMaterial({ color: 0x2f2822, roughness: 0.55 });
	SECTIONS.forEach(sec => {
		const cz = (sec.zStart + sec.zEnd) / 2;
		const bench = new THREE.Group();
		const seat = new THREE.Mesh(box(1.1, 0.16, 3.2), benchTop);
		seat.position.y = 0.46; seat.castShadow = true; seat.receiveShadow = true;
		bench.add(seat);
		[-1.3, 1.3].forEach(dz => {
			const leg = new THREE.Mesh(box(0.9, 0.46, 0.14), trimMat);
			leg.position.set(0, 0.23, dz);
			bench.add(leg);
		});
		bench.position.set(BENCH_X, 0, cz);
		group.add(bench);
		colliders.push({
			minX: BENCH_X - 0.55, maxX: BENCH_X + 0.55,
			minZ: cz - 1.9,       maxZ: cz + 1.9,
		});
	});

	/* ---------------- feature wall in the illustration wing ---------------- */
	const feat = new THREE.Mesh(box(6.4, 4.6, 0.5), wallDeepMat);
	feat.position.set(0, 2.3, -49);
	feat.castShadow = true; feat.receiveShadow = true;
	group.add(feat);
	colliders.push({ minX: -3.2, maxX: 3.2, minZ: -49.4, maxZ: -48.6 });

	return { group, colliders, featureWall: { z: -49, width: 6.4, height: 4.6, depth: 0.5 } };
}

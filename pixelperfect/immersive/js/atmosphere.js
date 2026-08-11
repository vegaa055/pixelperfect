/* ============================================================
   Atmosphere — volumetric light shafts + floating dust motes.

   Both effects share one analytic "is this point lit?" function
   (shaftMask) so the motes glint exactly where the beams land.
   ============================================================ */
import * as THREE from 'three';
import { HALL, WINDOWS, SUN_DIR, windowZ } from './config.js';
import { moteTexture } from './textures.js';

/* GLSL injected into both shaders. Traces a point back along the sun
   direction to the window wall and tests whether it lands in an aperture. */
const SHAFT_GLSL = /* glsl */`
	uniform vec3  uSun;
	uniform float uWallX;
	uniform float uSill;
	uniform float uWinH;
	uniform float uWinHalfW;
	uniform float uStartZ;
	uniform float uSpacing;
	uniform float uCount;

	// 1.0 = fully inside a beam, 0.0 = shadow. Also returns travel distance.
	float shaftMask(vec3 p, out float travel) {
		// param along sun dir to reach the window plane (negative = backwards)
		float t = (uWallX - p.x) / uSun.x;
		travel = -t;
		if (travel <= 0.0) return 0.0;

		vec3 hit = p + uSun * t;

		// vertical aperture, softened at sill and head
		float vy = smoothstep(0.0, 0.30, hit.y - uSill)
		         * smoothstep(0.0, 0.30, (uSill + uWinH) - hit.y);

		// periodic horizontal aperture
		float d  = hit.z - uStartZ;
		float k  = floor(d / uSpacing + 0.5);
		float dz = d - k * uSpacing;
		float vz = smoothstep(uWinHalfW, uWinHalfW - 0.28, abs(dz));

		// only real windows count
		float inRange = step(-0.5, k) * step(k, uCount - 0.5);

		return vy * vz * inRange;
	}
`;

function shaftUniforms() {
	return {
		uSun:       { value: SUN_DIR.clone() },
		uWallX:     { value: -HALL.halfWidth },
		uSill:      { value: WINDOWS.sill },
		uWinH:      { value: WINDOWS.height },
		uWinHalfW:  { value: WINDOWS.width * 0.5 },
		uStartZ:    { value: WINDOWS.startZ },
		uSpacing:   { value: -WINDOWS.spacing }, // windows march along -z
		uCount:     { value: WINDOWS.count },
	};
}

/* ============================================================
   Light shafts — an extruded beam per window, additively blended.
   Four side faces, double-sided: front and back faces sum through
   each other, which reads as volume without any raymarching.
   ============================================================ */
export function createLightShafts(length = 26) {
	const group = new THREE.Group();
	group.name = 'light-shafts';

	const positions = [];
	const uvs = [];
	const seeds = [];

	const x0 = -HALL.halfWidth + 0.06;
	const yBot = WINDOWS.sill;
	const yTop = WINDOWS.sill + WINDOWS.height;
	const halfW = WINDOWS.width * 0.5;
	const spread = 1.35; // beam widens as it travels

	for (let i = 0; i < WINDOWS.count; i++) {
		const zc = windowZ(i);

		// aperture corners (at the window plane)
		const c = [
			new THREE.Vector3(x0, yBot, zc - halfW),
			new THREE.Vector3(x0, yBot, zc + halfW),
			new THREE.Vector3(x0, yTop, zc + halfW),
			new THREE.Vector3(x0, yTop, zc - halfW),
		];

		// far end = aperture pushed along the sun, then spread outward
		const far = c.map(v => v.clone().addScaledVector(SUN_DIR, length));
		const farCentre = far.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(0.25);
		far.forEach(v => v.sub(farCentre).multiplyScalar(spread).add(farCentre));

		// four side faces: bottom, top, and the two z-sides
		const quads = [
			[c[0], c[1], far[1], far[0]],
			[c[3], c[2], far[2], far[3]],
			[c[0], c[3], far[3], far[0]],
			[c[1], c[2], far[2], far[1]],
		];

		for (const q of quads) {
			// two triangles: (0,1,2) (0,2,3) — u across, v along the beam
			const uvQuad = [[0, 0], [1, 0], [1, 1], [0, 1]];
			const tri = [0, 1, 2, 0, 2, 3];
			for (const idx of tri) {
				positions.push(q[idx].x, q[idx].y, q[idx].z);
				uvs.push(uvQuad[idx][0], uvQuad[idx][1]);
				seeds.push(i * 0.37);
			}
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
	geo.setAttribute('aSeed',    new THREE.Float32BufferAttribute(seeds, 1));

	const mat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide,
		uniforms: {
			uTime:      { value: 0 },
			uColor:     { value: new THREE.Color(0xffdcb0) },
			uIntensity: { value: 0.30 },
		},
		vertexShader: /* glsl */`
			attribute float aSeed;
			varying vec2  vUv;
			varying float vSeed;
			varying vec3  vWorld;
			void main() {
				vUv = uv;
				vSeed = aSeed;
				vec4 wp = modelMatrix * vec4(position, 1.0);
				vWorld = wp.xyz;
				gl_Position = projectionMatrix * viewMatrix * wp;
			}
		`,
		fragmentShader: /* glsl */`
			uniform float uTime;
			uniform vec3  uColor;
			uniform float uIntensity;
			varying vec2  vUv;
			varying float vSeed;
			varying vec3  vWorld;

			// cheap value noise
			float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
			float noise(vec2 p){
				vec2 i = floor(p), f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
				           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
			}

			void main() {
				// fade along the beam
				float along = 1.0 - smoothstep(0.05, 1.0, vUv.y);
				// soften the beam edges
				float edge  = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
				// slow drifting haze so the beam is never flat
				float n = noise(vec2(vUv.y * 3.0 + uTime * 0.05 + vSeed * 7.0,
				                     vUv.x * 2.5 - uTime * 0.03));
				float haze = 0.72 + 0.42 * n;

				float a = along * edge * haze * uIntensity;
				if (a < 0.002) discard;
				gl_FragColor = vec4(uColor, a);
			}
		`,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.frustumCulled = false;
	mesh.renderOrder = 10;
	group.add(mesh);
	group.userData.material = mat;
	return group;
}

/* ============================================================
   Dust motes — GPU-animated points that brighten inside the beams
   ============================================================ */
export function createDust(count = 4000) {
	const zSpan = HALL.zEntrance - HALL.zEnd;   // total hall depth
	const positions = new Float32Array(count * 3);
	const seeds     = new Float32Array(count);
	const sizes     = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		positions[i * 3]     = THREE.MathUtils.randFloatSpread(HALL.halfWidth * 2 - 0.6);
		positions[i * 3 + 1] = Math.random() * (HALL.height - 0.4);
		positions[i * 3 + 2] = HALL.zEntrance - Math.random() * zSpan;
		seeds[i]  = Math.random();
		sizes[i]  = 0.55 + Math.random() * 1.5;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));
	geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

	const mat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms: Object.assign(shaftUniforms(), {
			uTime:    { value: 0 },
			uMap:     { value: moteTexture() },
			uHeight:  { value: HALL.height - 0.4 },
			uPixel:   { value: window.devicePixelRatio || 1 },
			uLit:     { value: new THREE.Color(0xfff0d8) },
			uAmbient: { value: new THREE.Color(0x6b6152) },
		}),
		vertexShader: SHAFT_GLSL + /* glsl */`
			attribute float aSeed;
			attribute float aSize;
			uniform float uTime;
			uniform float uHeight;
			uniform float uPixel;
			varying float vLit;
			varying float vAlpha;

			void main() {
				vec3 p = position;

				// lazy convection: slow rise, wrapped, plus a wandering drift
				float t = uTime * 0.06;
				p.y = mod(p.y + t * (0.35 + aSeed * 0.5), uHeight);
				p.x += sin(uTime * 0.16 + aSeed * 24.0) * 0.42;
				p.z += cos(uTime * 0.13 + aSeed * 18.0) * 0.42;

				float travel;
				float lit = shaftMask(p, travel);
				// motes fade out far from their window
				lit *= 1.0 - smoothstep(6.0, 30.0, travel);
				vLit = lit;

				vec4 mv = modelViewMatrix * vec4(p, 1.0);
				// lit motes read slightly larger — they catch the light
				gl_PointSize = aSize * uPixel * (1.0 + lit * 1.6) * (150.0 / max(-mv.z, 0.1));
				gl_Position = projectionMatrix * mv;

				// cull the ones behind / very far
				vAlpha = 1.0 - smoothstep(45.0, 70.0, -mv.z);
			}
		`,
		fragmentShader: /* glsl */`
			uniform sampler2D uMap;
			uniform vec3 uLit;
			uniform vec3 uAmbient;
			varying float vLit;
			varying float vAlpha;

			void main() {
				float m = texture2D(uMap, gl_PointCoord).a;
				if (m < 0.01) discard;
				vec3  col = mix(uAmbient, uLit, vLit);
				float a   = m * vAlpha * (0.10 + vLit * 0.95);
				gl_FragColor = vec4(col, a);
			}
		`,
	});

	const points = new THREE.Points(geo, mat);
	points.frustumCulled = false;
	points.renderOrder = 11;
	points.name = 'dust';
	points.userData.material = mat;
	return points;
}

/* ============================================================
   Warm pools of light on the floor where the beams land
   ============================================================ */
export function createFloorPools() {
	const group = new THREE.Group();
	const geo = new THREE.PlaneGeometry(1, 1);

	const mat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms: { uColor: { value: new THREE.Color(0xffd9a8) }, uStrength: { value: 0.34 } },
		vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
		fragmentShader: /* glsl */`
			uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
			void main(){
				vec2 d = vUv - 0.5;
				float a = smoothstep(0.5, 0.06, length(vec2(d.x, d.y * 1.5)));
				gl_FragColor = vec4(uColor, a * uStrength);
			}
		`,
	});

	// where does the beam centre hit the floor?
	const drop = (WINDOWS.sill + WINDOWS.height * 0.5) / -SUN_DIR.y;
	for (let i = 0; i < WINDOWS.count; i++) {
		const zc = windowZ(i);
		const m = new THREE.Mesh(geo, mat);
		m.rotation.x = -Math.PI / 2;
		m.position.set(
			-HALL.halfWidth + SUN_DIR.x * drop,
			0.03,
			zc + SUN_DIR.z * drop
		);
		m.scale.set(WINDOWS.width * 2.4, 7.5, 1);
		m.renderOrder = 4;
		group.add(m);
	}
	group.name = 'floor-pools';
	return group;
}

/* ============================================================
   Walking the hall — pointer-lock mouselook + WASD on desktop,
   twin-stick style touch on mobile. Includes wall collision and
   a gentle walking bob.
   ============================================================ */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { HALL } from './config.js';

const SPEED = 4.2;
const SPRINT = 7.6;
const ACCEL = 12;
const RADIUS = 0.55;     // how close the visitor can get to a wall
const EYE = 1.68;

export class Walker {
	constructor(camera, domElement, colliders, opts = {}) {
		this.camera = camera;
		this.dom = domElement;
		this.colliders = colliders || [];
		this.reduced = !!opts.reduced;

		this.controls = new PointerLockControls(camera, domElement);
		this.velocity = new THREE.Vector3();
		this.input = { f: 0, r: 0, sprint: false };
		this.bob = 0;
		this.enabled = true;
		this.touch = { active: false, moveId: null, lookId: null, mx: 0, my: 0, ox: 0, oy: 0 };

		this.isTouch = window.matchMedia('(pointer: coarse)').matches;

		/* Pointer Lock is not always available — inside an iframe without the
		   `pointer-lock` permission, or during the browser's post-Esc cooldown.
		   Rather than leaving the visitor unable to move, we fall back to
		   click-and-drag looking, which works everywhere. */
		this.dragLook = false;
		this.onFallback = null;

		camera.position.set(0, EYE, 4);
		this._bindKeys();
		this._bindDragLook();
		if (this.isTouch) this._bindTouch();

		document.addEventListener('pointerlockerror', () => this._enableDragLook());
	}

	get locked() { return this.controls.isLocked; }
	/** True when the visitor can actually move right now. */
	get active()  { return this.isTouch || this.controls.isLocked || this.dragLook; }

	lock() {
		if (this.isTouch || this.dragLook) return;
		const el = this.dom;
		if (!el.requestPointerLock) return this._enableDragLook();
		try {
			const p = el.requestPointerLock({ unadjustedMovement: false });
			// Chrome returns a promise here; an unhandled rejection would surface
			// as a console error, so absorb it and degrade instead.
			if (p && typeof p.catch === 'function') p.catch(() => this._enableDragLook());
		} catch (err) {
			try { el.requestPointerLock(); } catch (e2) { this._enableDragLook(); }
		}
	}

	unlock() {
		try { this.controls.unlock(); } catch (e) { /* nothing was locked */ }
	}

	_enableDragLook() {
		if (this.dragLook) return;
		this.dragLook = true;
		this.onFallback && this.onFallback();
	}

	/* Hold and drag to look — used when pointer lock is unavailable. */
	_bindDragLook() {
		let dragging = false, lx = 0, ly = 0, moved = 0;
		const el = this.dom;

		el.addEventListener('mousedown', e => {
			if (!this.dragLook || e.button !== 0) return;
			dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
		});
		window.addEventListener('mousemove', e => {
			if (!dragging) return;
			const dx = e.clientX - lx, dy = e.clientY - ly;
			lx = e.clientX; ly = e.clientY;
			moved += Math.abs(dx) + Math.abs(dy);
			this._lookBy(dx * 0.0035, dy * 0.0035);
		});
		window.addEventListener('mouseup', () => { dragging = false; });

		// let main.js tell a click apart from the end of a drag
		this.wasDrag = () => moved > 6;
	}

	/* ---------------- keyboard ---------------- */
	_bindKeys() {
		const down = e => {
			switch (e.code) {
				case 'KeyW': case 'ArrowUp':    this.input.f = 1; break;
				case 'KeyS': case 'ArrowDown':  this.input.f = -1; break;
				case 'KeyA': case 'ArrowLeft':  this.input.r = -1; break;
				case 'KeyD': case 'ArrowRight': this.input.r = 1; break;
				case 'ShiftLeft': case 'ShiftRight': this.input.sprint = true; break;
				default: return;
			}
			e.preventDefault();
		};
		const up = e => {
			switch (e.code) {
				case 'KeyW': case 'ArrowUp':    if (this.input.f > 0) this.input.f = 0; break;
				case 'KeyS': case 'ArrowDown':  if (this.input.f < 0) this.input.f = 0; break;
				case 'KeyA': case 'ArrowLeft':  if (this.input.r < 0) this.input.r = 0; break;
				case 'KeyD': case 'ArrowRight': if (this.input.r > 0) this.input.r = 0; break;
				case 'ShiftLeft': case 'ShiftRight': this.input.sprint = false; break;
			}
		};
		document.addEventListener('keydown', down);
		document.addEventListener('keyup', up);
		this._releaseAll = () => { this.input.f = 0; this.input.r = 0; this.input.sprint = false; };
		window.addEventListener('blur', this._releaseAll);
	}

	/* ---------------- touch: left half moves, right half looks ---------------- */
	_bindTouch() {
		const el = this.dom;
		const half = () => window.innerWidth / 2;

		el.addEventListener('touchstart', e => {
			for (const t of e.changedTouches) {
				if (t.clientX < half() && this.touch.moveId === null) {
					this.touch.moveId = t.identifier;
					this.touch.ox = t.clientX; this.touch.oy = t.clientY;
				} else if (t.clientX >= half() && this.touch.lookId === null) {
					this.touch.lookId = t.identifier;
					this.touch.mx = t.clientX; this.touch.my = t.clientY;
				}
			}
		}, { passive: true });

		el.addEventListener('touchmove', e => {
			for (const t of e.changedTouches) {
				if (t.identifier === this.touch.moveId) {
					const dx = (t.clientX - this.touch.ox) / 60;
					const dy = (t.clientY - this.touch.oy) / 60;
					this.input.r = THREE.MathUtils.clamp(dx, -1, 1);
					this.input.f = THREE.MathUtils.clamp(-dy, -1, 1);
				} else if (t.identifier === this.touch.lookId) {
					const dx = t.clientX - this.touch.mx;
					const dy = t.clientY - this.touch.my;
					this.touch.mx = t.clientX; this.touch.my = t.clientY;
					this._lookBy(dx * 0.0038, dy * 0.0038);
				}
			}
		}, { passive: true });

		const end = e => {
			for (const t of e.changedTouches) {
				if (t.identifier === this.touch.moveId) { this.touch.moveId = null; this.input.f = 0; this.input.r = 0; }
				if (t.identifier === this.touch.lookId) { this.touch.lookId = null; }
			}
		};
		el.addEventListener('touchend', end, { passive: true });
		el.addEventListener('touchcancel', end, { passive: true });
	}

	_lookBy(dYaw, dPitch) {
		const e = new THREE.Euler(0, 0, 0, 'YXZ');
		e.setFromQuaternion(this.camera.quaternion);
		e.y -= dYaw;
		e.x = THREE.MathUtils.clamp(e.x - dPitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
		this.camera.quaternion.setFromEuler(e);
	}

	/* ---------------- per-frame ---------------- */
	update(dt) {
		if (!this.enabled) return;
		const active = this.active;   // pointer-locked, touch, or drag-look fallback

		const target = new THREE.Vector3();
		if (active) {
			const speed = this.input.sprint ? SPRINT : SPEED;
			target.set(this.input.r, 0, -this.input.f);
			if (target.lengthSq() > 1) target.normalize();
			target.multiplyScalar(speed);
			// into camera space (yaw only)
			const yaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y;
			target.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
		}

		// smooth acceleration / damping
		this.velocity.lerp(target, Math.min(1, ACCEL * dt));
		if (this.velocity.lengthSq() < 1e-5) this.velocity.set(0, 0, 0);

		const pos = this.camera.position;
		const next = pos.clone().addScaledVector(this.velocity, dt);
		this._resolve(pos, next);

		// head bob, scaled by actual speed
		const moving = this.velocity.length();
		if (!this.reduced && moving > 0.2) {
			this.bob += dt * moving * 1.9;
			pos.y = EYE + Math.sin(this.bob) * 0.035;
		} else {
			pos.y += (EYE - pos.y) * Math.min(1, dt * 8);
		}
	}

	/* Axis-separated collision so sliding along a wall feels right */
	_resolve(pos, next) {
		const W = HALL.halfWidth - RADIUS;
		const zMax = HALL.zEntrance - RADIUS;
		const zMin = HALL.zEnd + RADIUS;

		let x = THREE.MathUtils.clamp(next.x, -W, W);
		let z = THREE.MathUtils.clamp(next.z, zMin, zMax);

		// try X first, then Z, against each blocker
		if (this._blocked(x, pos.z)) x = pos.x;
		if (this._blocked(x, z))     z = pos.z;

		pos.x = x;
		pos.z = z;
	}

	_blocked(x, z) {
		for (const c of this.colliders) {
			if (x > c.minX - RADIUS && x < c.maxX + RADIUS &&
			    z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
		}
		return false;
	}
}

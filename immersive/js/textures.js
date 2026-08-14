/* ============================================================
   Procedural canvas textures — plaster, floor, glow pools,
   wall plaques and section signage.
   Keeps the exhibit dependency-free (no texture downloads).
   ============================================================ */
import * as THREE from 'three';

function canvas(w, h) {
	const c = document.createElement('canvas');
	c.width = w; c.height = h;
	return c;
}

/* ---------- Fine grain, used to break up flat plaster ---------- */
export function plasterTexture(repeat = 6) {
	const size = 512;
	const c = canvas(size, size);
	const ctx = c.getContext('2d');

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);

	// soft blotches
	for (let i = 0; i < 220; i++) {
		const x = Math.random() * size, y = Math.random() * size;
		const r = 20 + Math.random() * 90;
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		const v = 226 + Math.random() * 26;
		g.addColorStop(0, `rgba(${v},${v},${v},0.5)`);
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
	}
	// tooth
	const img = ctx.getImageData(0, 0, size, size);
	for (let i = 0; i < img.data.length; i += 4) {
		const n = (Math.random() - 0.5) * 13;
		img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
	}
	ctx.putImageData(img, 0, 0);

	const tex = new THREE.CanvasTexture(c);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(repeat, repeat);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/* ---------- Polished concrete floor ---------- */
export function floorTexture(repeat = 14) {
	const size = 512;
	const c = canvas(size, size);
	const ctx = c.getContext('2d');

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);
	for (let i = 0; i < 400; i++) {
		const x = Math.random() * size, y = Math.random() * size;
		const r = 6 + Math.random() * 60;
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		const v = 200 + Math.random() * 55;
		g.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
		g.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
	}
	const img = ctx.getImageData(0, 0, size, size);
	for (let i = 0; i < img.data.length; i += 4) {
		const n = (Math.random() - 0.5) * 22;
		img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
	}
	ctx.putImageData(img, 0, 0);

	const tex = new THREE.CanvasTexture(c);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(repeat, repeat);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/* ---------- Soft radial pool: picture-light glow on the wall ---------- */
export function glowTexture() {
	const size = 256;
	const c = canvas(size, size);
	const ctx = c.getContext('2d');
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0,    'rgba(255,238,214,0.85)');
	g.addColorStop(0.45, 'rgba(255,232,200,0.30)');
	g.addColorStop(1,    'rgba(255,228,196,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/* ---------- Round soft sprite for dust motes ---------- */
export function moteTexture() {
	const size = 64;
	const c = canvas(size, size);
	const ctx = c.getContext('2d');
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0,   'rgba(255,255,255,1)');
	g.addColorStop(0.3, 'rgba(255,248,236,0.55)');
	g.addColorStop(1,   'rgba(255,245,230,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	return new THREE.CanvasTexture(c);
}

/* ---------- Wall plaque: title / medium / year ---------- */
export function plaqueTexture(art) {
	const w = 640, h = 260;
	const c = canvas(w, h);
	const ctx = c.getContext('2d');

	ctx.fillStyle = '#efeae0';
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = '#d4441e';
	ctx.fillRect(0, 0, 8, h);

	ctx.fillStyle = '#17130f';
	ctx.font = '600 44px Fraunces, Georgia, serif';
	wrapText(ctx, art.title, 40, 78, w - 80, 50, 2);

	ctx.fillStyle = '#857a6d';
	ctx.font = '500 26px Inter, system-ui, sans-serif';
	ctx.fillText(art.medium, 40, h - 74);
	ctx.fillStyle = '#a2988a';
	ctx.fillText(art.year, 40, h - 36);

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}

/* ---------- Big engraved section signage ---------- */
export function signTexture(title, subtitle) {
	const w = 1024, h = 512;
	const c = canvas(w, h);
	const ctx = c.getContext('2d');
	ctx.clearRect(0, 0, w, h);

	ctx.textAlign = 'center';
	ctx.fillStyle = '#17130f';
	ctx.font = '500 170px Fraunces, Georgia, serif';
	ctx.fillText(title, w / 2, 230);

	ctx.strokeStyle = '#d4441e';
	ctx.lineWidth = 5;
	ctx.beginPath(); ctx.moveTo(w / 2 - 90, 285); ctx.lineTo(w / 2 + 90, 285); ctx.stroke();

	ctx.fillStyle = '#6d6357';
	ctx.font = '600 52px Inter, system-ui, sans-serif';
	ctx.letterSpacing = '14px';
	ctx.fillText(subtitle.toUpperCase(), w / 2, 372);

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}

/* ---------- Journal reading card (longer body text) ---------- */
export function journalCardTexture(entry) {
	const w = 768, h = 1024;
	const c = canvas(w, h);
	const ctx = c.getContext('2d');

	ctx.fillStyle = '#f5f1ea';
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = 'rgba(23,19,15,.14)';
	ctx.lineWidth = 3;
	ctx.strokeRect(26, 26, w - 52, h - 52);

	ctx.fillStyle = '#d4441e';
	ctx.font = '600 26px Inter, system-ui, sans-serif';
	ctx.letterSpacing = '6px';
	ctx.fillText(entry.medium.toUpperCase(), 70, 120);
	ctx.letterSpacing = '0px';

	ctx.fillStyle = '#17130f';
	ctx.font = '500 66px Fraunces, Georgia, serif';
	let y = wrapText(ctx, entry.title, 70, 210, w - 140, 74, 3);

	ctx.strokeStyle = '#d4441e';
	ctx.lineWidth = 3;
	ctx.beginPath(); ctx.moveTo(70, y + 26); ctx.lineTo(150, y + 26); ctx.stroke();

	ctx.fillStyle = '#3a332b';
	ctx.font = '400 32px Inter, system-ui, sans-serif';
	y = wrapText(ctx, entry.text, 70, y + 96, w - 140, 46, 12);

	ctx.fillStyle = '#857a6d';
	ctx.font = '500 27px Inter, system-ui, sans-serif';
	ctx.fillText(entry.year, 70, h - 82);

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}

/* ---------- helper: word wrap, returns final baseline y ---------- */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
	const words = String(text).split(' ');
	let line = '', lines = 0;
	for (let n = 0; n < words.length; n++) {
		const test = line + words[n] + ' ';
		if (ctx.measureText(test).width > maxWidth && line !== '') {
			ctx.fillText(line.trim(), x, y);
			line = words[n] + ' ';
			y += lineHeight;
			if (++lines >= maxLines - 1) break;
		} else {
			line = test;
		}
	}
	ctx.fillText(line.trim(), x, y);
	return y;
}

/* Wait for webfonts so canvas text renders in Fraunces/Inter, not fallback */
export async function fontsReady() {
	if (document.fonts && document.fonts.ready) {
		try { await document.fonts.ready; } catch (e) { /* non-fatal */ }
	}
}

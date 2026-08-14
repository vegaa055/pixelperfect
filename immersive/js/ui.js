/* ============================================================
   Overlay UI — loading, wayfinding, inspect prompt, info panel
   ============================================================ */
import { SECTIONS } from './config.js';

const $ = sel => document.querySelector(sel);

export class UI {
	constructor() {
		this.loader     = $('#loader');
		this.bar        = $('#load-bar');
		this.loadPct    = $('#load-pct');
		this.enterBtn   = $('#enter-btn');
		this.hud        = $('#hud');
		this.sectionEl  = $('#hud-section');
		this.subEl      = $('#hud-sub');
		this.prompt     = $('#prompt');
		this.panel      = $('#panel');
		this.crosshair  = $('#crosshair');
		this.help       = $('#help');
		this.rail       = $('#rail');
		this.viewer     = $('#viewer');

		this.onEnter = null;
		this.onResume = null;
		this._buildRail();
		this._bind();
	}

	_buildRail() {
		if (!this.rail) return;
		this.rail.innerHTML = SECTIONS
			.map(s => `<li data-id="${s.id}"><span class="dot"></span><span class="lbl">${s.title}</span></li>`)
			.join('');
	}

	_bind() {
		this.enterBtn?.addEventListener('click', () => {
			this.loader.classList.add('gone');
			setTimeout(() => { this.loader.style.display = 'none'; }, 700);
			this.hud.classList.add('show');
			this.onEnter && this.onEnter();
		});

		$('#panel-close')?.addEventListener('click', () => this.closePanel());
		$('#viewer-close')?.addEventListener('click', () => this.closeViewer());
		this.viewer?.addEventListener('click', e => { if (e.target === this.viewer) this.closeViewer(); });

		$('#panel-full')?.addEventListener('click', () => {
			if (this._current?.src) this.openViewer(this._current.src, this._current.title);
		});

		$('#help-toggle')?.addEventListener('click', () => this.help.classList.toggle('open'));

		document.addEventListener('keydown', e => {
			if (e.key === 'Escape') {
				if (this.viewer?.classList.contains('open')) this.closeViewer();
				else if (this.panel?.classList.contains('open')) this.closePanel();
			}
		});
	}

	/* ---------------- loading ---------------- */
	progress(done, total) {
		const pct = total ? Math.round((done / total) * 100) : 100;
		if (this.bar) this.bar.style.width = pct + '%';
		if (this.loadPct) this.loadPct.textContent = pct + '%';
	}

	ready() {
		this.loader?.classList.add('ready');
		if (this.enterBtn) this.enterBtn.disabled = false;
	}

	fail(msg) {
		const sub = $('#load-sub');
		if (sub) sub.textContent = msg;
	}

	/* ---------------- wayfinding ---------------- */
	setSection(sec) {
		if (!sec) {
			this.sectionEl.textContent = 'The Hall';
			this.subEl.textContent = 'Pixel Perfect';
		} else {
			this.sectionEl.textContent = sec.title;
			this.subEl.textContent = sec.subtitle;
		}
		this.rail?.querySelectorAll('li').forEach(li => {
			li.classList.toggle('on', !!sec && li.dataset.id === sec.id);
		});
	}

	showPrompt(text) {
		if (!this.prompt) return;
		this.prompt.textContent = text;
		this.prompt.classList.add('show');
	}
	hidePrompt() { this.prompt?.classList.remove('show'); }

	setCrosshair(on) { this.crosshair?.classList.toggle('hot', !!on); }

	/* ---------------- info panel ---------------- */
	openPanel(art) {
		this._current = art;
		$('#panel-cat').textContent   = art.medium || '';
		$('#panel-title').textContent = art.title || '';
		$('#panel-year').textContent  = art.year || '';
		$('#panel-text').textContent  = art.text || '';
		const thumb = $('#panel-thumb');
		if (thumb) { thumb.src = art.src; thumb.alt = art.title || ''; }
		this.panel.classList.add('open');
	}
	closePanel() {
		this.panel?.classList.remove('open');
		this.onResume && this.onResume();
	}
	get panelOpen() { return !!this.panel?.classList.contains('open'); }

	/* ---------------- full image viewer ---------------- */
	openViewer(src, caption) {
		$('#viewer-img').src = src;
		$('#viewer-cap').textContent = caption || '';
		this.viewer.classList.add('open');
	}
	closeViewer() { this.viewer?.classList.remove('open'); }
	get viewerOpen() { return !!this.viewer?.classList.contains('open'); }
}

/* Which wing is the visitor standing in? */
export function sectionAt(z) {
	for (const s of SECTIONS) {
		if (z <= s.zStart + 2 && z >= s.zEnd - 2) return s;
	}
	return null;
}

/**
 * analog-clock-card.js
 * Custom Lovelace Card — Analog Clock
 *
 * A clean, scaleable analog clock card with:
 *   - 1–12 numerals, major + minor tick marks
 *   - Hour, minute and second (red) hands (hour/minute are spade-shaped)
 *   - 24hr digital time (HH:MM) halfway between 12 and centre
 *   - Date on two lines: weekday / day + month — halfway between centre and 6
 *   - Fully scaleable — size driven by card height or explicit config
 *   - Visual config editor (size + timezone fields)
 *   - Cross-platform safe time handling (works in HA iOS app / WKWebView)
 *
 * YAML config reference:
 *
 * type: custom:analog-clock-card
 *
 * # Clock diameter in px (optional — defaults to fill card height)
 * size: 220
 *
 * # Timezone (optional — defaults to HA timezone)
 * timezone: Australia/Adelaide
 *
 * # Locale for date display (optional — defaults to HA language)
 * locale: en-AU
 *
 * # Show minute tick markers around the face (optional — defaults to true).
 * # Set to false to show only the 12 hour markers.
 * show_minute_markers: true
 *
 * # Colours (all optional)
 * color_face:         "rgba(10, 14, 22, 0.85)"
 * color_border:       "#ffffff"
 * color_numbers:      "#ffffff"
 * color_ticks:        "rgba(255,255,255,0.5)"
 * color_hour_hand:    "#ffffff"
 * color_minute_hand:  "#ffffff"
 * color_second_hand:  "#e53935"
 * color_digital_time: "rgba(255,255,255,0.9)"
 * color_date:         "rgba(255,255,255,0.75)"
 * color_center_dot:   "#e53935"
 */

class AnalogClockCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config  = {};
    this._hass    = null;
    this._built   = false;
    this._timerId = null;
    this._alignTimer = null;
    this._tz      = null;
    this._locale  = 'en-AU';
  }

  // ── Lovelace lifecycle ──────────────────────────────────

  setConfig(config) {
    this._config = config || {};
    if (!this._built) {
      this._build();
      this._built = true;
    }
    this._applySize();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) return;
    if (!this._tz) {
      this._tz     = this._config.timezone || hass.config?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      this._locale = this._config.locale   || hass.language || 'en-AU';
    }
    if (!this._timerId && !this._alignTimer) this._startTick();
  }

  connectedCallback()    { if (this._hass && !this._timerId && !this._alignTimer) this._startTick(); }
  disconnectedCallback() { this._stopTick(); }
  getCardSize()          { return 4; }

  static getStubConfig() {
    return { size: 220 };
  }

  static getConfigElement() {
    return document.createElement('analog-clock-card-editor');
  }

  // ── DOM construction ────────────────────────────────────

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; }
        ha-card {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: transparent; box-shadow: none; padding: 0; box-sizing: border-box;
        }
        canvas { display: block; }
      </style>
      <ha-card><canvas id="clock"></canvas></ha-card>
    `;
    this._canvas = this.shadowRoot.getElementById('clock');
    this._ctx    = this._canvas.getContext('2d');
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._applySize());
      this._ro.observe(this.shadowRoot.querySelector('ha-card'));
    }
  }

  // ── Sizing ──────────────────────────────────────────────

  _applySize() {
    const card = this.shadowRoot?.querySelector('ha-card');
    if (!card) return;
    let size;
    if (this._config.size) {
      size = parseInt(this._config.size, 10);
    } else {
      const rect = card.getBoundingClientRect();
      const w = rect.width  || card.offsetWidth  || 220;
      const h = rect.height || card.offsetHeight || 220;
      size = Math.max(60, h - 8);
    }
    if (this._canvas.width !== size || this._canvas.height !== size) {
      this._canvas.width  = size;
      this._canvas.height = size;
      this._canvas.style.width  = size + 'px';
      this._canvas.style.height = size + 'px';
    }
    // let the grid column own the width; flex centres the canvas
    this.style.width  = '';
    this.style.height = '';
    this._draw();
  }

  // ── Tick ────────────────────────────────────────────────

  _startTick() {
    // Guard on BOTH handles. _alignTimer is set synchronously below, so a
    // re-entrant set hass() during the sub-second alignment window sees the
    // card as already running and won't schedule a second (orphaned) timer.
    if (this._timerId || this._alignTimer) return;
    const now  = Date.now();
    const wait = 1000 - (now % 1000);
    this._draw();
    this._alignTimer = setTimeout(() => {
      this._draw();
      this._timerId = setInterval(() => this._draw(), 1000);
      this._alignTimer = null;   // hand off cleanly from align timer to interval
    }, wait);
  }

  _stopTick() {
    clearTimeout(this._alignTimer);
    clearInterval(this._timerId);
    this._timerId = null; this._alignTimer = null;
  }

  // ── Time extraction (WKWebView-safe) ────────────────────

  _getNow() {
    const now = new Date();
    const tz  = this._tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false, year: 'numeric', month: 'numeric', day: 'numeric',
    });
    const parts = {};
    fmt.formatToParts(now).forEach(({ type, value }) => {
      if (type !== 'literal') parts[type] = parseInt(value, 10);
    });

    const h = parts.hour === 24 ? 0 : parts.hour;
    const m = parts.minute;
    const s = parts.second;

    const pad     = v => String(v).padStart(2, '0');
    const timeStr = `${pad(h)}:${pad(m)}`;  // HH:MM only — seconds shown by hand

    const weekdayFmt = new Intl.DateTimeFormat(this._locale, { timeZone: tz, weekday: 'short' });
    const dayMonthFmt = new Intl.DateTimeFormat(this._locale, { timeZone: tz, day: 'numeric', month: 'short' });

    return {
      h, m, s, timeStr,
      weekday:  weekdayFmt.format(now),
      dayMonth: dayMonthFmt.format(now),
    };
  }

  // ── Drawing ─────────────────────────────────────────────

  _draw() {
    const canvas = this._canvas;
    if (!canvas) return;
    const size = canvas.width;
    if (!size) return;

    const ctx    = this._ctx;
    const cx     = size / 2;
    const cy     = size / 2;
    const radius = size * 0.46;

    const c = {
      face:        this._config.color_face         || 'rgba(10, 14, 22, 0.85)',
      border:      this._config.color_border       || 'rgba(255,255,255,0.55)',
      numbers:     this._config.color_numbers      || '#ffffff',
      ticks:       this._config.color_ticks        || 'rgba(255,255,255,0.45)',
      hourHand:    this._config.color_hour_hand    || '#e8e8e8',
      minuteHand:  this._config.color_minute_hand  || '#ffffff',
      secondHand:  this._config.color_second_hand  || '#e53935',
      digitalTime: this._config.color_digital_time || 'rgba(255,255,255,0.88)',
      date:        this._config.color_date         || 'rgba(255,255,255,0.65)',
      centerDot:   this._config.color_center_dot   || '#e53935',
    };

    ctx.clearRect(0, 0, size, size);

    // face
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = c.face; ctx.fill();

    // border
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = c.border; ctx.lineWidth = Math.max(1, radius * 0.022); ctx.stroke();

    // ticks
    const showMinuteTicks = this._config.show_minute_markers !== false;
    for (let i = 0; i < 60; i++) {
      const isMajor = i % 5 === 0;
      if (!isMajor && !showMinuteTicks) continue;
      const angle   = (i * Math.PI * 2) / 60 - Math.PI / 2;
      const inner   = isMajor ? radius * 0.80 : radius * 0.88;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner,        cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * radius * 0.95, cy + Math.sin(angle) * radius * 0.95);
      ctx.strokeStyle = isMajor ? c.numbers.replace(')', ', 0.7)').replace('rgb(', 'rgba(') : c.ticks;
      ctx.lineWidth   = isMajor ? Math.max(1.5, radius * 0.025) : Math.max(0.8, radius * 0.012);
      ctx.stroke();
    }

    // numbers 1–12
    const numRadius = radius * 0.68;
    const fontSize  = Math.max(10, Math.round(radius * 0.18));
    ctx.font = `600 ${fontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = c.numbers; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      const a = (n * Math.PI * 2) / 12 - Math.PI / 2;
      ctx.fillText(String(n), cx + Math.cos(a) * numRadius, cy + Math.sin(a) * numRadius);
    }

    const { h, m, s, timeStr, weekday, dayMonth } = this._getNow();

    // digital time — halfway between 12 and centre
    const digitalSize = Math.max(9, Math.round(radius * 0.22));
    ctx.font = `600 ${digitalSize}px "SF Mono", "Consolas", monospace`;
    ctx.fillStyle = c.digitalTime; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, cx, cy - radius * 0.28);

    // date — two lines, halfway between centre and 6
    const dateSize = Math.max(8, Math.round(radius * 0.18));
    const lineGap  = dateSize * 1.1;
    ctx.font = `600 ${dateSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = c.date; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(weekday,  cx, cy + radius * 0.22);
    ctx.fillText(dayMonth, cx, cy + radius * 0.22 + lineGap);

    // hands
    const secAngle  = (s / 60) * Math.PI * 2 - Math.PI / 2;
    const minAngle  = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    const hourAngle = ((h % 12 + m / 60) / 12) * Math.PI * 2 - Math.PI / 2;

    this._drawHand(ctx, cx, cy, hourAngle, radius * 0.54, radius * 0.032, c.hourHand,   radius * 0.12);
    this._drawHand(ctx, cx, cy, minAngle,  radius * 0.84, radius * 0.028, c.minuteHand, radius * 0.12);
    this._drawSecondHand(ctx, cx, cy, secAngle, radius, c.secondHand);

    // center dot
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.042, 0, Math.PI * 2);
    ctx.fillStyle = c.centerDot; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.018, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  _drawHand(ctx, cx, cy, angle, length, width, color, tail) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // spade shape — bezier from wide base tapering to a point at tip
    const baseW = width * 1.9;
    const midW  = width * 1.3;

    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.bezierCurveTo(-tail * 0.3, -baseW, length * 0.5, -midW, length, 0);
    ctx.bezierCurveTo(length * 0.5,  midW, -tail * 0.3,  baseW, -tail, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  _drawSecondHand(ctx, cx, cy, angle, radius, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.lineWidth = Math.max(1, radius * 0.014);
    ctx.moveTo(-radius * 0.18, 0); ctx.lineTo(radius * 0.82, 0); ctx.stroke();
    ctx.beginPath();
    ctx.arc(-radius * 0.12, 0, radius * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }
}

customElements.define('analog-clock-card', AnalogClockCard);

// ── Visual config editor ─────────────────────────────────

class AnalogClockCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  _render() {
    const c = this._config;
    const showMinuteTicks = c.show_minute_markers !== false;
    this.shadowRoot.innerHTML = `
      <style>
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding: 8px 0; }
        label { display: flex; flex-direction: column; font-size: 13px; color: var(--primary-text-color); gap: 4px; }
        input { padding: 6px 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-size: 14px; }
        input:focus { outline: 2px solid var(--primary-color); border-color: transparent; }
        label.checkbox { flex-direction: row; align-items: center; gap: 8px; grid-column: 1 / -1; }
        label.checkbox input { width: auto; padding: 0; }
      </style>
      <div class="grid">
        <label>Size (px)
          <input id="size" type="number" min="60" max="600" value="${c.size || ''}" placeholder="auto" />
        </label>
        <label>Timezone
          <input id="timezone" type="text" value="${c.timezone || ''}" placeholder="e.g. Australia/Adelaide" />
        </label>
        <label class="checkbox">
          <input id="show_minute_markers" type="checkbox" ${showMinuteTicks ? 'checked' : ''} />
          Show minute markers
        </label>
      </div>
    `;
    this.shadowRoot.getElementById('size').addEventListener('change', e => {
      const val = parseInt(e.target.value, 10);
      this._fire({ ...this._config, size: val > 0 ? val : undefined });
    });
    this.shadowRoot.getElementById('timezone').addEventListener('change', e => {
      const val = e.target.value.trim();
      this._fire({ ...this._config, timezone: val || undefined });
    });
    this.shadowRoot.getElementById('show_minute_markers').addEventListener('change', e => {
      this._fire({ ...this._config, show_minute_markers: e.target.checked ? undefined : false });
    });
  }

  _fire(config) {
    Object.keys(config).forEach(k => config[k] === undefined && delete config[k]);
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }
}

customElements.define('analog-clock-card-editor', AnalogClockCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'analog-clock-card',
  name:        'Analog Clock Card',
  description: 'Clean analog clock with digital time and date. Cross-platform safe.',
  preview:     false,
});

console.info('%c ANALOG-CLOCK-CARD v3.2 ', 'color: white; font-weight: bold; background: #1a1a2e');

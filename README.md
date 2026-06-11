# Analog Clock Card

A clean, scaleable analog clock card for [Home Assistant](https://www.home-assistant.io/) Lovelace dashboards.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

![Analog Clock Card](https://raw.githubusercontent.com/Steve-gnome/analog-clock-card/main/preview.png)

## Features

- Smooth analog clock face with hour, minute and second hands
- Spade-shaped hour and minute hands for a polished look
- 24-hour digital time display (HH:MM) inside the clock face
- Two-line date display — weekday and day/month
- Fully scaleable — fills card height automatically, or set an explicit `size`
- Fully colour-customisable — every element has its own colour option
- Visual config editor (size + timezone fields)
- Cross-platform safe — works correctly in the HA iOS app (WKWebView)
- Timezone-aware using `Intl.DateTimeFormat.formatToParts()`

---

## Installation

### Via HACS (recommended)

1. In Home Assistant, open **HACS → Frontend**
2. Click the ⋮ menu → **Custom repositories**
3. Add `https://github.com/Steve-gnome/analog-clock-card` with category **Lovelace**
4. Find **Analog Clock Card** in the list and click **Download**
5. Reload your browser (Ctrl+Shift+R)

### Manual

1. Download `analog-clock-card.js` from the [latest release](https://github.com/Steve-gnome/analog-clock-card/releases/latest)
2. Copy it to `/config/www/analog-clock-card.js`
3. In HA go to **Settings → Dashboards → Resources** and add:
   ```
   /local/analog-clock-card.js
   ```
   (type: JavaScript module)
4. Reload your browser

---

## Usage

Add to any Lovelace dashboard:

```yaml
type: custom:analog-clock-card
```

With all options:

```yaml
type: custom:analog-clock-card

# Clock diameter in pixels (optional — defaults to fill card height)
size: 220

# Timezone (optional — defaults to HA timezone)
timezone: Australia/Adelaide

# Locale for date display (optional — defaults to HA language)
locale: en-AU

# Colours (all optional — these are the defaults)
color_face:         "rgba(10, 14, 22, 0.85)"
color_border:       "rgba(255,255,255,0.55)"
color_numbers:      "#ffffff"
color_ticks:        "rgba(255,255,255,0.45)"
color_hour_hand:    "#e8e8e8"
color_minute_hand:  "#ffffff"
color_second_hand:  "#e53935"
color_digital_time: "rgba(255,255,255,0.88)"
color_date:         "rgba(255,255,255,0.65)"
color_center_dot:   "#e53935"
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `size` | number | auto | Clock diameter in pixels. If omitted, fills card height. |
| `timezone` | string | HA timezone | IANA timezone string, e.g. `Australia/Adelaide` |
| `locale` | string | HA language | Locale for date formatting, e.g. `en-AU` |
| `color_face` | string | `rgba(10,14,22,0.85)` | Clock face background |
| `color_border` | string | `rgba(255,255,255,0.55)` | Outer border ring |
| `color_numbers` | string | `#ffffff` | Hour numerals (1–12) |
| `color_ticks` | string | `rgba(255,255,255,0.45)` | Minute tick marks |
| `color_hour_hand` | string | `#e8e8e8` | Hour hand |
| `color_minute_hand` | string | `#ffffff` | Minute hand |
| `color_second_hand` | string | `#e53935` | Second hand |
| `color_digital_time` | string | `rgba(255,255,255,0.88)` | Digital HH:MM display |
| `color_date` | string | `rgba(255,255,255,0.65)` | Weekday / date text |
| `color_center_dot` | string | `#e53935` | Centre pivot dot |

---

## Changelog

### v3.0
- Initial public release
- Cross-platform time handling (WKWebView / iOS HA app safe)
- Visual config editor
- Fully scaleable canvas rendering
- Full colour customisation

---

## Credits

Built for [Home Assistant](https://www.home-assistant.io/) Lovelace.  
Inspired by [tomasrudh/analogclock](https://github.com/tomasrudh/analogclock) — rewritten from scratch with iOS fixes and modern canvas rendering.

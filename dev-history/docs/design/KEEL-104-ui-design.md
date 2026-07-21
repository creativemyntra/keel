# KEEL-104 — UI Design: Pipeline Status Web Dashboard

**Phase:** 3 (UI Designer) | **Story:** KEEL-104  
**Input:** `.keel/state/KEEL-104/02-business-analyst.json`, `docs/plans/KEEL-104-functional-spec.md`  
**Mockup:** `docs/design/KEEL-104-dashboard-mockup.html`

---

## 1. Design Philosophy

The dashboard is a developer-facing read-only status page. It must communicate pipeline state at a glance without decorative noise. The aesthetic follows the existing CLI output style: dark table headers, muted background, high-contrast text, and status badges that map directly to the three pipeline states already used in `cmdReport`.

All styles are inline — no CDN, no external fonts, no runtime dependencies. The HTML is generated as a Node.js template string in `keel-dashboard.cjs`, so every CSS rule must be expressible as a plain string value.

---

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Table body, card backgrounds |
| `--header-bg` | `#1e293b` | Table header row background |
| `--header-text` | `#f1f5f9` | Table header cell text |
| `--text-primary` | `#0f172a` | Body text, story IDs |
| `--text-muted` | `#64748b` | Subtitle, footer, idle time |
| `--border` | `#e2e8f0` | Table borders, horizontal rules |
| `--row-hover` | `#f1f5f9` | Table row hover state |
| `--accent` | `#3b82f6` | Links, auto-refresh indicator dot |

### Status Badge Colors (matches `cmdReport` exactly)

| Status | Background | Text | Hex value |
|---|---|---|---|
| COMPLETE | `#16a34a` | `#ffffff` | Green-600 (Tailwind scale reference only) |
| IN PROGRESS | `#d97706` | `#ffffff` | Amber-600 |
| HALTED | `#dc2626` | `#ffffff` | Red-600 |

These three values are the canonical colors from `conventions.md` and `keel-state.cjs` `cmdReport`. The design does **not** introduce new color variants for these states.

---

## 3. Typography

**Font stack (system fonts only — no download):**

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

This renders as San Francisco on macOS/iOS, Segoe UI on Windows, and the system UI font elsewhere. The stack matches the browser's native monospace-adjacent developer aesthetic without any network request.

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title (`h1`) | 22px | 700 | `#0f172a` |
| Subtitle | 14px | 400 | `#64748b` |
| Table header | 12px | 600 | `#f1f5f9` (on dark bg) |
| Table body | 14px | 400 | `#0f172a` |
| Story ID | 14px | 600 | `#0f172a` |
| Badge label | 12px | 600 | `#ffffff` |
| Footer | 12px | 400 | `#64748b` |

No fluid/responsive type scaling — this is a desktop-first developer tool, not a consumer app.

---

## 4. Layout

### 4.1 Page Structure

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
│  h1: Keel Pipeline Dashboard                        │
│  p:  Read-only view · Auto-refreshes every 30s      │
│  span: ● Live  (animated pulse dot)                 │
├─────────────────────────────────────────────────────┤
│ MAIN (max-width 960px, centered, padding 24px)      │
│                                                     │
│  TABLE                                              │
│  ┌──────────┬────────────┬───────┬──────────┬──────┐│
│  │ Story ID │ Title      │ Scope │ Phase    │ ...  ││
│  ├──────────┼────────────┼───────┼──────────┼──────┤│
│  │ KEEL-101 │ ...        │ feat  │ Phase 11 │ ...  ││
│  │ KEEL-102 │ ...        │ feat  │ Phase 5  │ ...  ││
│  │ KEEL-103 │ ...        │ bug   │ Phase 3  │ ...  ││
│  └──────────┴────────────┴───────┴──────────┴──────┘│
├─────────────────────────────────────────────────────┤
│ FOOTER                                              │
│  Last updated: 2026-07-14T15:30:00Z  │  Port 7772  │
└─────────────────────────────────────────────────────┘
```

### 4.2 Header

- Left-aligned within the centered max-width container
- Title + subtitle stacked vertically
- Auto-refresh indicator ("● Live") sits to the right of the subtitle on the same line using `display: flex; justify-content: space-between; align-items: flex-end`
- Bottom border `1px solid #e2e8f0` separates header from table area
- Padding: `24px 24px 16px`

### 4.3 Table

- Full-width within the centered container
- `border-collapse: collapse`
- Header row: `background: #1e293b`, `color: #f1f5f9`, `font-size: 12px`, `text-transform: uppercase`, `letter-spacing: 0.05em`, padding `12px 16px`
- Body rows: alternating `#ffffff` / `#f8fafc` (even/odd), hover `#f1f5f9`
- Cell padding: `12px 16px`
- Bottom border on each `<tr>`: `1px solid #e2e8f0`
- **Columns (in order):**

| # | Column | Width | Notes |
|---|---|---|---|
| 1 | Story ID | 100px | Bold, `font-weight: 600` |
| 2 | Title | auto | Grows to fill space |
| 3 | Scope | 90px | Lowercase, muted |
| 4 | Current Phase | 160px | Phase name string |
| 5 | Status | 130px | Badge (see §5) |
| 6 | Idle Time | 100px | Right-aligned, monospace-ish |

### 4.4 Empty State

Displayed **instead of the table** when no stories exist. Centered within the main area:

```
┌──────────────────────────────┐
│                              │
│  (folder icon — Unicode ☐)   │
│  No stories found.           │
│  Run keel init <story-id>    │
│  to start.                   │
│                              │
└──────────────────────────────┘
```

- `<div>` with `text-align: center; padding: 64px 24px; color: #64748b`
- Icon: Unicode `📂` (U+1F4C2) at `48px`, `display: block; margin-bottom: 16px`
- Message text: `font-size: 15px; line-height: 1.6`
- Code snippet (`keel init <story-id>`) rendered in `<code>` with `background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px`

### 4.5 Error Rows

When a manifest is malformed the server emits `{ story_id: <dirname>, error: <message> }`. The table row for this entry:

- Story ID column: directory name in bold italic
- Title column: `⚠ <error message>` in `color: #dc2626` (red)
- All other columns: `—` (em dash, `&mdash;`)
- Row background: `#fef2f2` (light red tint) to flag the anomaly

### 4.6 Footer

- `border-top: 1px solid #e2e8f0`
- Two items on one line using `display: flex; justify-content: space-between`
- Left: "Last updated: \<ISO timestamp\>"
- Right: "Port \<N\>"
- `font-size: 12px; color: #64748b; padding: 12px 24px`

---

## 5. Status Badge Design

```html
<span style="
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  background: <COLOR>;
  color: #ffffff;
  white-space: nowrap;
">STATUS TEXT</span>
```

Pill shape (`border-radius: 9999px`) with `white-space: nowrap` ensures the badge never wraps on narrow columns. The three color values map directly to the BA/functional-spec constants:

- `COMPLETE` → `background: #16a34a`
- `IN PROGRESS` → `background: #d97706`
- `HALTED` → `background: #dc2626`

---

## 6. Auto-Refresh Indicator

The `<meta http-equiv="refresh" content="30">` tag in `<head>` drives the refresh. The visible indicator is a small animated green dot labeled "● Live":

```html
<span style="
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #16a34a;
  font-weight: 500;
">
  <span style="
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #16a34a;
    display: inline-block;
    animation: pulse 2s infinite;
  "></span>
  Live · refreshes every 30s
</span>
```

The `pulse` keyframe animation is defined in a `<style>` block in `<head>` (the one allowed `<style>` tag — used only for the animation keyframe, which cannot be expressed as an inline style):

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

Everything else uses `style=""` attributes directly, keeping the server-side template string simple.

---

## 7. Responsive Considerations

This is a developer tool, not a consumer product. Primary target is a desktop browser at ≥768px. Lightweight accommodations only:

- `max-width: 960px; margin: 0 auto` on the container keeps content readable on wide monitors
- `overflow-x: auto` on the table wrapper prevents horizontal clipping on narrow viewports without a media query
- No JavaScript-dependent layout changes
- The page renders usably down to ~480px (mobile) but is not optimized for it

---

## 8. Implementation Notes for the Engineer

The server generates the full HTML string on each GET `/` request. Key server-side substitutions:

| Template placeholder | Value |
|---|---|
| `{{TIMESTAMP}}` | `new Date().toISOString()` |
| `{{PORT}}` | The port the server is listening on |
| `{{ROWS}}` | HTML string built by iterating sorted story objects |
| `{{STORY_COUNT}}` | Number of stories (used in the title `<meta>` description) |

The engineer must NOT read or depend on this design doc at runtime — the HTML string is embedded directly in `keel-dashboard.cjs`. This doc serves as the reference specification for what that string must look like.

**AC coverage from this design:**

| AC | Design element |
|---|---|
| AC-1 | Header, table, footer — full page renders on `keel dashboard` |
| AC-2 | No form elements, no write endpoints designed — read-only by construction |
| AC-3 | Table columns (Story ID, Title, Scope, Phase name, Status, Idle Time); sort noted |
| AC-4 | `<meta http-equiv="refresh" content="30">` + "● Live" indicator |
| AC-5 | Port displayed in footer; `{{PORT}}` substitution |
| AC-6 | Empty state section §4.4 |
| AC-7 | Design requires only a new file; no changes to keel-state.cjs |

# MetroViz — User Documentation (English)

> Audience: any Nextcloud user working with MetroViz.

**MetroViz-NC** is the Nextcloud-integrated edition of
[MetroViz by Ralf Stockmann](https://github.com/rstockm/Metroviz).
The visualisation, the editing flow, and the `.metro` file format
are the same as the upstream's — what changes is the integration:
files live in your Nextcloud Files (not your browser's local
storage), sharing uses the standard NC share dialog, and a
double-click on a `.metro` file in NC Files opens the viewer
directly.

---

## What is MetroViz?

MetroViz visualises technology roadmaps as metro maps — like a subway diagram where each line is a theme and each station is a milestone. You build your maps in Nextcloud, save them as ordinary files (`.metro`), and share them with your team through normal Nextcloud sharing.

Compared to a spreadsheet, you see at a glance: which themes run in parallel, where they intersect, what's coming next. Maps can be exported as SVG, PNG, PDF, JSON, or Markdown.

---

## Getting started

### 1. Open MetroViz

Click **MetroViz** in the Nextcloud top bar. The first time, a demo roadmap is shown so you have something to look at immediately.

### 2. Create your own roadmap

In the left sidebar:

1. Click **+ New**.
2. Give the roadmap a name (e.g. "Platform Migration 2026").
3. The new file is created automatically at `MetroViz/<name>.metro` in your Nextcloud files.

### 3. Add content

Click **Editor** in the top-right (the pencil icon). The editor sidebar offers two modes:

- **Visual editor:** form fields for metadata, zones (e.g. "2026 Q1"), lines (themes), and events (milestones). Changes are applied immediately.
- **JSON:** raw editing for power users. Invalid JSON is highlighted with a red inline error.

### 4. Save

Saving happens **automatically** every 2 seconds after your last change. The status indicator next to the title shows:

| Indicator | Meaning |
|---|---|
| _(empty)_ | No changes since last load |
| ● Unsaved changes | You are typing — auto-save is queued |
| ⊙ Saving… | WebDAV write in progress |
| ✓ Saved | Last write succeeded |

You can also save manually from the **⋮** menu in the top-right → **Save**.

---

## The interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Nextcloud top bar (standard, MetroViz entry active)            │
├──────────────┬──────────────────────────────────┬───────────────┤
│              │ Demo-Roadmap            ✓ Saved │               │
│  + New       │ ┌────────────────────────────┐  │               │
│              │ │ Metro Map | Text view      │  │               │
│  Demo-       │ ├────────────────────────────┤  │  Editor       │
│  Roadmap     │ │                            │  │  (right,      │
│  ─────────   │ │   (Metro map)              │  │   collapsible)│
│  Migration-  │ │                            │  │               │
│  2026        │ │                            │  │               │
│  Tech-       │ │                            │  │               │
│  Strategy    │ │                            │  │               │
│              │ └────────────────────────────┘  │               │
└──────────────┴──────────────────────────────────┴───────────────┘
   File list             Main area               Editor
```

### Left sidebar — files

Lists every `.metro` file in your `MetroViz/` folder. The active file is highlighted. Click any file to open it.

**+ New** creates a new, empty roadmap.

### Main area — two views

In the header, switch between:

- **Metro Map** — the graphical map. Lines and events are clickable (tooltip with details); zones are coloured background bands.
- **Text view** — the roadmap as rendered Markdown. Useful for reading aloud, printing, or pasting into tickets / wikis.

### Right sidebar — editor

Opens via the **Editor** button in the header. Two tabs:

- **Visual editor** — structured input fields. Recommended for anyone who would rather not write JSON.
- **JSON** — direct JSON access for bulk refactor or import.

Close with the **×** button at the top-right of the sidebar.

### The ⋮ action menu

Top-right of the header, next to the editor button. Contains:

| Entry | Effect |
|---|---|
| Save | Force-save now |
| Save as… | Copy under a new name |
| Import | Upload a `.metro` or `.json` file from disk (overwrites the active roadmap) |
| Export ▸ as SVG / PNG / PDF Map | Map export |
| Export ▸ as JSON / Markdown | Data export |
| Clean up | Removes orphaned lines, events, and zones from the JSON. No visible change. |

---

## Common tasks

### Add a new line

Editor → Visual editor → "Lines" section → **+ Add line**. Enter name, colour, and ordering.

### Place an event on a line

Editor → Visual editor → "Events" section → **+ Add event**. Pick line, time, and title. The event appears on the map as a station on the chosen line.

### Create a zone for a quarter

Editor → Visual editor → "Zones" section → **+ Add zone**. Enter start, end, and colour. The zone appears as a coloured background band on the map.

### Share a roadmap with colleagues

MetroViz uses normal Nextcloud sharing. Steps:

1. Open the Nextcloud Files app.
2. Navigate to `MetroViz/`.
3. Right-click the `.metro` file → **Share** (or use the share icon).
4. Enter recipients — same as any other file.

The recipient opens the file in their own MetroViz view (they need the app enabled on their account).

### Import an existing roadmap from JSON

⋮ menu → **Import** → pick a file. The active roadmap is **overwritten** — make a copy first if you want to keep the previous state (⋮ → Save as…).

### Export

⋮ menu → **Export** ▸ format:

- **SVG Map** — vector graphic, scales to any size, ideal for slides.
- **PNG Map** — raster image, for chat messages or quick previews.
- **PDF Map** — print-ready.
- **JSON** — raw file, identical to the `.metro` format.
- **Markdown** — roadmap as text, suited for tickets, wikis, READMEs.

---

## Keyboard and accessibility

Every button is keyboard-operable. Standards:

- **Tab** / **Shift+Tab** — move focus between buttons and inputs.
- **Enter** / **Space** — activate the focused button.
- **Esc** — close an open menu or the editor sidebar.

Touch: every button is at least 44 × 44 pixels. The UI works fully from 375 px screen width (smartphone portrait).

---

## FAQ

**Q: Where are my roadmaps stored?**
A: In your own Nextcloud Files, under `MetroViz/`. You can inspect the folder outside of MetroViz at any time, or download the `.metro` files directly.

**Q: What happens if I close the tab before saving?**
A: MetroViz auto-saves every 2 seconds after your last change. Before closing, look for the **✓ Saved** indicator next to the title — once it shows, all changes are persisted.

**Q: Can I work offline?**
A: Not currently. MetroViz only saves when the browser can reach Nextcloud. On a connection drop, a standard NC error toast appears; your edits stay in browser memory until the connection returns.

**Q: What's the difference between Visual editor and JSON?**
A: Same data, different surface. The visual editor offers structured input fields; the JSON tab shows the raw text. Power users with JSON fluency are faster in the JSON tab; everyone else should stay in the visual editor.

**Q: Can I share my roadmap with someone who doesn't have Nextcloud?**
A: Yes — export it via the ⋮ menu as SVG, PNG, or PDF, or as Markdown / JSON.

**Q: A colleague shared a roadmap with me, but I don't see it in the file list.**
A: The left list shows only files in your own `MetroViz/` folder. Shared files are opened from the Nextcloud Files app (clicking the `.metro` file there opens it in MetroViz).

**Q: The map gets cropped on my phone.**
A: Switch to landscape, or use the **Text view** instead of the Map view — it's linear and reflows to any screen width.

**Q: How do I delete a roadmap?**
A: In the Nextcloud Files app: right-click the `.metro` file → **Delete**. The file goes to NC's trash bin as usual.

---

## German version

[Deutsch](../de/README.md)

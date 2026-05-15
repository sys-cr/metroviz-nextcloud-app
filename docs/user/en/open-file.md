# Open a file from Nextcloud Files

## What is this?

Starting with version 0.1.0 MetroViz is registered as the native file
viewer for `.metro` files. Double-clicking a `.metro` file in the
Nextcloud Files app opens MetroViz directly in the viewer panel — no
detour through the top menu.

## How it works

1. Open the **Files** app in Nextcloud.
2. Navigate to your folder of `.metro` files (default: `MetroViz/`, but
   any location works).
3. **Double-click** any `.metro` file.
4. MetroViz opens the roadmap in the fullscreen viewer.
5. Close with **Esc** or the **×** in the viewer header.

Editing and saving behave exactly the same as the standalone top-menu
flow — changes are written back to the same file at the same path. The
auto-save indicator shows the current state (`● dirty`, `⊙ saving`,
`✓ saved`).

## FAQ

**Q: My `.metro` file opens as raw JSON instead of in MetroViz.**
A: The Nextcloud instance's MIME database is stale. The admin needs to
run once:

```bash
sudo -u www-data php occ maintenance:mimetype:update-db
sudo -u www-data php occ files:scan --all
```

**Q: Shared `.metro` files — does double-click work there too?**
A: Yes. As long as the recipient has the app enabled on their account,
MetroViz opens for shared files as well. Nextcloud's normal permission
model applies; write access is governed by the share.

**Q: Do `.metro` files have to live in the `MetroViz/` folder?**
A: No. Any path works — the viewer resolves through the Nextcloud file
id, not the folder name. The `MetroViz/` folder is only the default
location for roadmaps created from the top-menu mode.

**Q: Does the viewer work on a tablet?**
A: Yes. The viewer panel scales to the screen width and supports
Nextcloud's standard touch gestures (swipe to close, double-tap for
fullscreen).

## Short help string (for in-app help)

> Double-clicking a `.metro` file in Nextcloud Files opens MetroViz in
> the viewer panel. Close with Escape or the × button. Saving writes
> back to the original file path automatically.

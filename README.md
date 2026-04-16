# Workspace Restore on Unlock

A GNOME Shell extension that saves and restores your active workspace and window layout when you lock and unlock your screen.

## What it does

- **Restores active workspace** — unlocking returns you to the workspace you were on before locking
- **Restores window positions and sizes** — windows go back to where they were
- **Restores tiled window layouts** — works with [tiling-assistant](https://github.com/Leleat/Tiling-Assistant) (Ubuntu's built-in tiling extension) to correctly restore split-screen arrangements, including non-equal splits
- **Restores maximized and minimized states**

## Why it exists

On GNOME/Wayland, locking the screen can shuffle your active workspace and window positions. This extension persists your layout to disk every 10 seconds and restores it 1.2 seconds after unlock (giving the compositor time to settle).

## Requirements

- GNOME Shell 46, 47, or 48
- Ubuntu 24.04+ (or any distro with a compatible GNOME version)
- Optional: [tiling-assistant@ubuntu.com](https://extensions.gnome.org/extension/3733/tiling-assistant/) for tiled layout support

## Installation

```bash
# Clone into the GNOME extensions directory
git clone https://github.com/nahuel-nicolas/genome-workspace-restore-extension \
  ~/.local/share/gnome-shell/extensions/workspace-restore@user

# Log out and log back in (required for GNOME to pick up the new extension)

# Enable the extension
gnome-extensions enable workspace-restore@user
```

## How it works

**Saving**: State is saved to `~/.workspace-restore-state` immediately on unlock and every 10 seconds while active. Saving happens in `enable()` (called on unlock) rather than `disable()` (called on lock) because GNOME modifies window geometry before `disable()` fires, which would capture incorrect positions.

**Restoring**: On unlock, the saved state is loaded before the new state is written, then applied after a 1.2-second delay. For windows managed by tiling-assistant, `TilingWindowManager.tile()` is used directly — this correctly preserves the intended tile rectangle even when terminal emulators snap to character-cell-aligned sizes.

## State file

`~/.workspace-restore-state` is a JSON file written on each save. Example:

```json
{
  "activeWs": 1,
  "windows": [
    {
      "id": 123456,
      "workspace": 1,
      "x": 0, "y": 40, "width": 960, "height": 1000,
      "maximized": 0,
      "minimized": false,
      "isTiled": true,
      "tiledRect": { "x": 0, "y": 40, "width": 960, "height": 1040 },
      "untiledRect": { "x": 100, "y": 100, "width": 800, "height": 600 }
    }
  ]
}
```

## License

MIT

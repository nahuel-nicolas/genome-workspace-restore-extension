# Workspace Restore on Unlock

A GNOME Shell extension that automatically saves your active workspace when the screen locks and restores it when you unlock.

## How it works

- **On lock:** the current workspace index is saved to disk.
- **On unlock:** the saved workspace is restored after a short delay, returning you to exactly where you left off.

No configuration needed — it works out of the box.

## Requirements

- GNOME Shell 46, 47, or 48

## Installation

### From GNOME Extensions

Install from [extensions.gnome.org](https://extensions.gnome.org/extension/gnome-workspace-restore-extension@nahuel-nicolas.github.com).

### Manual

```bash
git clone https://github.com/nahuel-nicolas/gnome-workspace-restore-extension.git \
  ~/.local/share/gnome-shell/extensions/gnome-workspace-restore-extension@nahuel-nicolas.github.com
```

Then log out and back in, and enable the extension:

```bash
gnome-extensions enable gnome-workspace-restore-extension@nahuel-nicolas.github.com
```

## License

GPL-2.0-or-later

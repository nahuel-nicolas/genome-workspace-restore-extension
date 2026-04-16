import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const STATE_FILE = GLib.get_home_dir() + '/.workspace-restore-state';

Gio._promisify(Gio.File.prototype, 'load_contents_async');

function rectToObj(r) {
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
}

function isNormalWindow(win) {
    return !win.is_skip_taskbar() && win.get_window_type() === Meta.WindowType.NORMAL;
}

function captureState() {
    const windows = [];
    for (const win of global.display.list_all_windows()) {
        if (!isNormalWindow(win)) continue;
        const rect = win.get_frame_rect();
        windows.push({
            id: win.get_id(),
            workspace: win.get_workspace()?.index() ?? -1,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            maximized: win.get_maximized(),
            minimized: win.minimized,
            isTiled: win.isTiled ?? false,
            tiledRect: rectToObj(win.tiledRect),
            untiledRect: rectToObj(win.untiledRect),
        });
    }
    return {
        activeWs: global.workspace_manager.get_active_workspace_index(),
        focusedId: global.display.focus_window?.get_id() ?? null,
        windows,
    };
}

function saveState() {
    try {
        const state = captureState();
        const file = Gio.File.new_for_path(STATE_FILE);
        file.replace_contents(JSON.stringify(state), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    } catch(e) { console.error('[workspace-restore] save failed:', e.message); }
}

async function loadState() {
    try {
        const file = Gio.File.new_for_path(STATE_FILE);
        const [, contents] = await file.load_contents_async(null);
        return JSON.parse(new TextDecoder().decode(contents));
    } catch(e) { return null; }
}

export default class WorkspaceRestoreExtension {
    #restoreTimerId = null;
    #focusTimerId = null;
    #disabled = false;

    async enable() {
        this.#disabled = false;
        const state = await loadState();

        // Bail if disable() was called while awaiting the file load
        if (this.#disabled || !state) return;

        let twm = null;
        let Rect = null;
        try {
            const taExt = Main.extensionManager._extensions?.get('tiling-assistant@ubuntu.com');
            if (taExt?.path && taExt?.stateObj?._twm) {
                twm = taExt.stateObj._twm;
                ({ Rect } = await import(`file://${taExt.path}/src/extension/utility.js`));
            }
        } catch(e) {
            console.warn('[workspace-restore] tiling-assistant unavailable, using fallback:', e.message);
        }

        // Bail if disable() was called while awaiting the import
        if (this.#disabled) return;

        this.#restoreTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => {
            const ws = global.workspace_manager.get_workspace_by_index(state.activeWs);
            if (ws) ws.activate(global.get_current_time());

            const winMap = new Map();
            for (const win of global.display.list_all_windows()) {
                if (isNormalWindow(win)) winMap.set(win.get_id(), win);
            }

            // Process focused window last so it ends up on top after all raises
            const ordered = [
                ...state.windows.filter(w => w.id !== state.focusedId),
                ...state.windows.filter(w => w.id === state.focusedId),
            ];

            for (const saved of ordered) {
                const win = winMap.get(saved.id);
                if (!win) continue;

                const isFocused = saved.id === state.focusedId;

                if (win.get_maximized()) win.unmaximize(Meta.MaximizeFlags.BOTH);

                if (saved.maximized) {
                    win.maximize(saved.maximized);
                } else if (saved.isTiled && twm && Rect && saved.tiledRect) {
                    twm.tile(win, new Rect(saved.tiledRect), { openTilingPopup: false, skipAnim: true, fakeTile: !isFocused });
                    win.untiledRect = saved.untiledRect ? new Meta.Rectangle(saved.untiledRect) : null;
                } else {
                    win.move_resize_frame(true, saved.x, saved.y, saved.width, saved.height);
                    win.isTiled = saved.isTiled;
                    win.tiledRect = saved.tiledRect ? new Meta.Rectangle(saved.tiledRect) : null;
                    win.untiledRect = saved.untiledRect ? new Meta.Rectangle(saved.untiledRect) : null;
                    if (!saved.minimized) {
                        if (win.raise_and_make_recent_on_workspace)
                            win.raise_and_make_recent_on_workspace(global.workspace_manager.get_active_workspace());
                        else
                            win.raise_and_make_recent();
                    }
                }

                if (saved.minimized && !win.minimized) win.minimize();
                else if (!saved.minimized && win.minimized) win.unminimize();
            }

            // Re-raise focused window after a short delay to win against async maximize
            const focusedWin = state.focusedId ? winMap.get(state.focusedId) : null;
            if (focusedWin && !focusedWin.minimized) {
                this.#focusTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                    if (focusedWin.raise_and_make_recent_on_workspace)
                        focusedWin.raise_and_make_recent_on_workspace(global.workspace_manager.get_active_workspace());
                    else
                        focusedWin.raise_and_make_recent();
                    this.#focusTimerId = null;
                    return GLib.SOURCE_REMOVE;
                });
            }

            this.#restoreTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        this.#disabled = true;
        saveState();

        if (this.#restoreTimerId !== null) {
            GLib.source_remove(this.#restoreTimerId);
            this.#restoreTimerId = null;
        }
        if (this.#focusTimerId !== null) {
            GLib.source_remove(this.#focusTimerId);
            this.#focusTimerId = null;
        }
    }
}

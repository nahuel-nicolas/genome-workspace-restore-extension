import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const STATE_FILE = GLib.get_home_dir() + '/.workspace-restore-state';

function saveWorkspace(index) {
    try {
        const file = Gio.File.new_for_path(STATE_FILE);
        file.replace_contents(`${index}`, null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    } catch(_e) {}
}

function loadWorkspace() {
    try {
        const file = Gio.File.new_for_path(STATE_FILE);
        const [, contents] = file.load_contents(null);
        return parseInt(new TextDecoder().decode(contents).trim(), 10) || 0;
    } catch(_e) {
        return -1;
    }
}

export default class WorkspaceRestoreExtension {
    #timerId = null;

    enable() {
        const saved = loadWorkspace();
        if (saved >= 0) {
            this.#timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                const ws = global.workspace_manager.get_workspace_by_index(saved);
                if (ws) ws.activate(global.get_current_time());
                this.#timerId = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    disable() {
        if (this.#timerId !== null) {
            GLib.source_remove(this.#timerId);
            this.#timerId = null;
        }
        saveWorkspace(global.workspace_manager.get_active_workspace_index());
    }
}

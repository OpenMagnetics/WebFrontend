import { watch } from 'vue'
import api from './accountApi'

let started = false;
let applying = false;

// Last-write-wins sync of the settings store for logged-in users: pull once
// at login/boot, then push (debounced) whenever a setting changes. Failures
// are logged loudly to the console — never swallowed, never blocking the app
// (settings keep working locally exactly as for anonymous users).
export async function startSettingsSync(settingsStore) {
    if (started) {
        return;
    }
    started = true;

    try {
        const { data } = await api.get('/me/settings');
        if (data.settings != null) {
            applying = true;
            settingsStore.$patch(data.settings);
            // Watchers flush on the microtask queue; release the guard on the
            // macrotask queue so the pull itself is not pushed straight back.
            setTimeout(() => { applying = false; }, 0);
        }
    } catch (error) {
        console.error('Could not pull account settings:', error.message);
    }

    let timer = null;
    watch(() => settingsStore.$state, () => {
        if (applying) {
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(async () => {
            try {
                await api.put('/me/settings', { settings: JSON.parse(JSON.stringify(settingsStore.$state)) });
            } catch (error) {
                console.error('Could not push account settings:', error.message);
            }
        }, 2000);
    }, { deep: true });
}

export function settingsSyncStarted() {
    return started;
}

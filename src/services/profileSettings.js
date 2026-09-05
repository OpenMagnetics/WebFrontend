import { reactive, watch } from 'vue'
import api from './accountApi'

/**
 * Profile settings — the user's tunables roam with the account.
 *
 * A SECTION is one store plus the whitelist of its keys that make sense to
 * roam (tunables, never navigation state or consent). Each section is merged
 * per section, last write wins on the section's own timestamp:
 *
 *   - every local edit stamps the section in localStorage (logged in or not),
 *   - at login the account document is pulled: a section the server has NEWER
 *     than this device's stamp is applied to the store; a section this device
 *     edited more recently (or the server lacks) is pushed — so the first
 *     login seeds the profile from the local settings, and a second device
 *     receives them,
 *   - while logged in, edits are pushed 2 s after the last change; a 409 from
 *     the server (another device was newer) applies the server's section.
 *
 * Failures are logged, never swallowed silently, and never block the app:
 * settings keep working locally exactly as for anonymous users.
 *
 * Document (server, version 2):
 *   { version: 2, sections: { <name>: { values: {…}, updatedAt: ISO } } }
 */

const LOCAL_META_KEY = 'om_profile_sections';   // { [section]: updatedAt ISO } — this device's last edit
const PUSH_DEBOUNCE_MS = 2000;

const sections = new Map();  // name → { store, keys, applying, timer }
let isLoggedIn = () => false;
let watchersInstalled = false;
let synced = false;

/** Reactive status for the Account page. */
export const profileSettingsStatus = reactive({
    lastPullAt: null,
    lastPushAt: null,
    error: null,
    sections: {},   // name → { updatedAt (this device), pushedAt }
});

function readMeta() {
    try {
        const raw = localStorage.getItem(LOCAL_META_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch (error) {
        console.error('Profile settings: local stamps unreadable, starting over:', error.message);
        return {};
    }
}

function writeMeta(meta) {
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
}

function snapshot(section) {
    const values = {};
    for (const key of section.keys) {
        values[key] = JSON.parse(JSON.stringify(section.store[key] ?? null));
    }
    return values;
}

function applyValues(section, values) {
    section.applying = true;
    for (const key of section.keys) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            section.store[key] = JSON.parse(JSON.stringify(values[key]));
        }
    }
    // Watchers flush on the microtask queue; release the guard on the
    // macrotask queue so the applied values are not pushed straight back.
    setTimeout(() => { section.applying = false; }, 0);
}

/**
 * Declare a roaming section. `keys` are the store's top-level state keys to
 * roam; anything else in the store stays local to the device.
 */
export function registerProfileSection(name, store, keys) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) {
        throw new Error(`Profile settings: invalid section name "${name}"`);
    }
    if (sections.has(name)) {
        throw new Error(`Profile settings: section "${name}" registered twice`);
    }
    for (const key of keys) {
        if (!(key in store.$state)) {
            throw new Error(`Profile settings: section "${name}" names key "${key}" which store "${store.$id}" does not have`);
        }
    }
    sections.set(name, { store, keys, applying: false, timer: null });
    profileSettingsStatus.sections[name] = { updatedAt: readMeta()[name] ?? null, pushedAt: null };
}

async function pushSection(name) {
    const section = sections.get(name);
    const meta = readMeta();
    const updatedAt = meta[name] ?? new Date().toISOString();
    try {
        const { data } = await api.patch(`/me/settings/sections/${name}`, { values: snapshot(section), updatedAt });
        profileSettingsStatus.lastPushAt = new Date().toISOString();
        profileSettingsStatus.sections[name].pushedAt = data.section.updatedAt;
        profileSettingsStatus.error = null;
    }
    catch (error) {
        const stored = error.response?.status === 409 ? error.response.data?.detail?.section : null;
        if (stored != null) {
            // Another device edited this section more recently: take theirs.
            applyValues(section, stored.values);
            meta[name] = stored.updatedAt;
            writeMeta(meta);
            profileSettingsStatus.sections[name].updatedAt = stored.updatedAt;
            profileSettingsStatus.sections[name].pushedAt = stored.updatedAt;
            return;
        }
        profileSettingsStatus.error = error.message;
        console.error(`Could not push profile settings section "${name}":`, error.message);
    }
}

function installWatchers() {
    if (watchersInstalled) return;
    watchersInstalled = true;
    for (const [name, section] of sections) {
        watch(
            () => snapshot(section),
            () => {
                if (section.applying) return;
                const meta = readMeta();
                meta[name] = new Date().toISOString();
                writeMeta(meta);
                profileSettingsStatus.sections[name].updatedAt = meta[name];
                if (!isLoggedIn()) return;
                clearTimeout(section.timer);
                section.timer = setTimeout(() => pushSection(name), PUSH_DEBOUNCE_MS);
            },
            { deep: true }
        );
    }
}

/**
 * Boot: stamp local edits from now on. `loggedIn` is consulted before every
 * push, so login/logout need no re-installation.
 */
export function installProfileSettings(loggedIn) {
    isLoggedIn = loggedIn;
    installWatchers();
}

/**
 * Login (or boot with a live session): merge the account document with the
 * local sections, once per page load.
 */
export async function syncProfileSettings() {
    if (synced) return;
    synced = true;
    let document;
    try {
        const { data } = await api.get('/me/settings');
        document = data.settings;
        profileSettingsStatus.lastPullAt = new Date().toISOString();
        profileSettingsStatus.error = null;
    }
    catch (error) {
        synced = false;
        profileSettingsStatus.error = error.message;
        console.error('Could not pull profile settings:', error.message);
        return;
    }
    const serverSections = document?.sections ?? {};
    const meta = readMeta();
    for (const [name, section] of sections) {
        const server = serverSections[name];
        const localAt = meta[name] ?? null;
        if (server != null && (localAt == null || server.updatedAt > localAt)) {
            applyValues(section, server.values);
            meta[name] = server.updatedAt;
            profileSettingsStatus.sections[name].updatedAt = server.updatedAt;
            profileSettingsStatus.sections[name].pushedAt = server.updatedAt;
        }
        else if (server == null || (localAt != null && localAt > server.updatedAt)) {
            if (localAt == null) {
                meta[name] = new Date().toISOString();
            }
            writeMeta(meta);
            await pushSection(name);
        }
        else {
            profileSettingsStatus.sections[name].pushedAt = server.updatedAt;
        }
    }
    writeMeta(meta);
}

/** Account page: push every section now (e.g. after a manual "Sync now"). */
export async function pushAllProfileSettings() {
    for (const name of sections.keys()) {
        await pushSection(name);
    }
}

export function profileSectionNames() {
    return [...sections.keys()];
}

import { defineStore } from 'pinia'
import { waitForMkf, updateEngineSettings } from 'WebSharedComponents/assets/js/mkfRuntime'
import { useSettingsStore } from '/src/stores/settings'

// Engine settings an advanced user changes in Settings, and MKF's own log for advanced users.
//
// - allowMaterialDataExtrapolation: MKF's explicit opt-in to use a core material outside its data
//   (a core-loss frequency outside the fitted Steinmetz span, a temperature at or above its Curie
//   point), extrapolating with a WARNING per use instead of throwing. Session-only on purpose: it
//   is not persisted, so a reload always starts from the engine's default (off).
// - the adviser temperature gate: the engine's value is shown; a user's choice is persisted in the
//   settings store (null = the engine's default) and pushed to the engine at start-up and on change.
// - the engine log: MKF's structured log collector, drained after engine calls while the panel is
//   enabled in Settings.

export const ENGINE_LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const MAXIMUM_RECORDS = 2000;
const DRAIN_INTERVAL_MS = 1000;

function parseEngineReply(methodName, reply) {
    if (typeof reply === 'string' && reply.startsWith('Exception')) {
        throw new Error(`MKF ${methodName}: ${reply}`);
    }
    return reply;
}

// Fails loudly when the loaded libMKF predates these settings rather than pretending they exist.
function requireEngineKeys(settings, keys) {
    const missing = keys.filter((key) => !(key in settings));
    if (missing.length > 0) {
        throw new Error(`Engine settings do not expose ${missing.join(', ')}: libMKF is older than ` +
            `the material-data-extrapolation flag and its wired temperature filter`);
    }
}

export const useEngineDiagnosticsStore = defineStore('engineDiagnostics', {
    state: () => ({
        allowMaterialDataExtrapolation: false,
        coreAdviserEnableTemperatureFilter: null,
        coreAdviserMaximumTemperature: null,
        settingsError: null,
        records: [],
        nextRecordId: 1,
        collecting: false,
        collectionError: null,
        panelOpen: false,
    }),

    getters: {
        warningCount: (state) => state.records.filter((r) => r.level === 'WARNING').reduce((n, r) => n + r.count, 0),
        errorCount: (state) => state.records.filter((r) => r.level === 'ERROR' || r.level === 'CRITICAL').reduce((n, r) => n + r.count, 0),
    },

    actions: {
        // Reads the engine's current values into the store (what the Settings dialog shows).
        async loadFromEngine(mkf = null) {
            try {
                const engine = mkf ?? await waitForMkf();
                const settings = JSON.parse(parseEngineReply('get_settings', await engine.get_settings()));
                requireEngineKeys(settings, ['allowMaterialDataExtrapolation', 'coreAdviserEnableTemperatureFilter', 'coreAdviserMaximumTemperature']);
                this.allowMaterialDataExtrapolation = settings.allowMaterialDataExtrapolation;
                this.coreAdviserEnableTemperatureFilter = settings.coreAdviserEnableTemperatureFilter;
                this.coreAdviserMaximumTemperature = settings.coreAdviserMaximumTemperature;
                this.settingsError = null;
            } catch (error) {
                this.settingsError = String(error?.message ?? error);
                throw error;
            }
        },

        // Pushes `changes` (engine setting keys) into the engine, then reads the engine back. The
        // read-modify-write runs in the shared engine-settings queue (ABT #1660), so it cannot undo
        // a concurrent writer's change (an advise setting the preferred wire standard).
        async writeEngineSettings(changes, mkf = null) {
            const engine = mkf ?? await waitForMkf();
            await updateEngineSettings(engine, (settings) => {
                requireEngineKeys(settings, Object.keys(changes));
                Object.assign(settings, changes);
            });
            await this.loadFromEngine(engine);
        },

        // Start-up (and engine restart): apply the user's persisted temperature-gate choice and the
        // session's extrapolation flag, and re-arm log collection if the panel is enabled.
        async applyUserSettings(mkf) {
            const settingsStore = useSettingsStore();
            const changes = { allowMaterialDataExtrapolation: this.allowMaterialDataExtrapolation };
            const enabled = settingsStore.adviserSettings.coreAdviserEnableTemperatureFilter;
            const maximum = settingsStore.adviserSettings.coreAdviserMaximumTemperature;
            if (enabled !== null && enabled !== undefined) changes.coreAdviserEnableTemperatureFilter = enabled;
            if (maximum !== null && maximum !== undefined) changes.coreAdviserMaximumTemperature = maximum;
            await this.writeEngineSettings(changes, mkf);
            if (settingsStore.engineLogSettings.showEngineLog) {
                await this.startCollection(settingsStore.engineLogSettings.level, mkf);
            }
        },

        async setAllowMaterialDataExtrapolation(value) {
            await this.writeEngineSettings({ allowMaterialDataExtrapolation: !!value });
        },

        async setTemperatureFilter(enabled, maximumTemperature) {
            const settingsStore = useSettingsStore();
            const changes = {};
            if (enabled !== undefined) {
                changes.coreAdviserEnableTemperatureFilter = !!enabled;
                settingsStore.adviserSettings.coreAdviserEnableTemperatureFilter = !!enabled;
            }
            if (maximumTemperature !== undefined) {
                if (!Number.isFinite(maximumTemperature)) {
                    throw new Error(`Maximum temperature must be a number, got ${maximumTemperature}`);
                }
                changes.coreAdviserMaximumTemperature = maximumTemperature;
                settingsStore.adviserSettings.coreAdviserMaximumTemperature = maximumTemperature;
            }
            await this.writeEngineSettings(changes);
        },

        async startCollection(level, mkf = null) {
            if (!ENGINE_LOG_LEVELS.includes(level)) {
                throw new Error(`Unknown engine log level '${level}'`);
            }
            // A libMKF older than the engine log rejects this ("Method not found: set_log_collection").
            const engine = mkf ?? await waitForMkf();
            try {
                parseEngineReply('set_log_collection', await engine.set_log_collection(level));
                this.collectionError = null;
            } catch (error) {
                this.collectionError = String(error?.message ?? error);
                throw error;
            }
            if (!this.collecting) {
                this.collecting = true;
                this.scheduleDrain();
            }
        },

        async stopCollection() {
            this.collecting = false;
            const engine = await waitForMkf();
            parseEngineReply('set_log_collection', await engine.set_log_collection('OFF'));
        },

        // One drain at a time: the next is scheduled only after this one settles, so a long
        // engine call never piles drains up behind it in the worker queue.
        scheduleDrain() {
            setTimeout(async () => {
                if (!this.collecting) return;
                try {
                    await this.drain();
                } catch (error) {
                    this.collectionError = String(error?.message ?? error);
                    console.error('[EngineLog] could not drain the MKF log:', error);
                }
                if (this.collecting) this.scheduleDrain();
            }, DRAIN_INTERVAL_MS);
        },

        async drain() {
            const engine = await waitForMkf();
            const reply = parseEngineReply('drain_log_collection', await engine.drain_log_collection());
            const drained = JSON.parse(reply);
            if (!Array.isArray(drained)) {
                throw new Error(`drain_log_collection returned ${typeof drained}, expected an array`);
            }
            if (drained.length === 0) return;
            const timestamp = new Date().toISOString();
            for (const record of drained) {
                this.records.push({
                    id: this.nextRecordId++,
                    timestamp,
                    level: record.level,
                    module: record.module,
                    message: record.message,
                    count: record.count,
                });
            }
            if (this.records.length > MAXIMUM_RECORDS) {
                this.records = this.records.slice(-MAXIMUM_RECORDS);
            }
        },

        clearRecords() {
            this.records = [];
        },
    },
})

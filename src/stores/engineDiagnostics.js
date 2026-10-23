import { defineStore } from 'pinia'
import { waitForMkf, updateEngineSettings } from 'WebSharedComponents/assets/js/mkfRuntime'
import { useSettingsStore } from '/src/stores/settings'
import { useMasStore } from '/src/stores/mas'

// Engine settings an advanced user changes in Settings, and MKF's own log for advanced users.
//
// - allowMaterialDataExtrapolation: MKF's explicit opt-in to use a core material outside its data
//   (a core-loss frequency outside the fitted Steinmetz span, a temperature at or above its Curie
//   point), extrapolating with a WARNING per use instead of throwing. The user's choice is persisted
//   in settingsStore.magneticBuilderSettings (default ON for manual work, decided with the
//   maintainer; MKF never extrapolates under an adviser). While it is on, the engine collects its
//   log and it is drained after every builder calculation that uses core-loss data (no polling),
//   so every extrapolation reaches the user as a warning.
// - the adviser temperature gate: the engine's value is shown; a user's choice is persisted in the
//   settings store (null = the engine's default) and pushed to the engine at start-up and on change.
// - the engine log: MKF's structured log collector, drained after engine calls while the panel is
//   enabled in Settings.

export const ENGINE_LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const MAXIMUM_RECORDS = 2000;
const DRAIN_INTERVAL_MS = 1000;
// Builder actions that evaluate core-loss data, i.e. the ones that can extrapolate it.
const CORE_LOSS_ACTIONS = new Set(['simulate', 'calculateCoreLosses', 'sweepCoreLossesOverFrequency', 'sweepVolumetricLossesOverFrequency']);

// Pinia plugin (registered in main.js): when the builder creates its task queue, hook its
// core-loss calculations so their extrapolation warnings are drained right after them. Done as a
// plugin so nothing creates the builder's store before the builder does.
export function drainEngineLogAfterCoreLossCalculations({ store }) {
    if (store.$id !== 'magneticBuilderTaskQueue') return;
    store.$onAction(({ name, after }) => {
        if (!CORE_LOSS_ACTIONS.has(name)) return;
        after(() => useEngineDiagnosticsStore().drainExtrapolationWarnings());
    }, true);
}

// The builder's findings on its last simulation (ABT #1855; the simulationFindings store) are
// warnings in this log, not a banner above the builder's cards (Alf, 2026-10-22): each simulation's
// findings replace the previous simulation's, and a failed simulation drops them.
export const SIMULATION_FINDINGS_MODULE = 'Simulation findings';
export function logSimulationFindings({ store }) {
    if (store.$id !== 'simulationFindings') return;
    store.$onAction(({ name, args, after }) => {
        // The findings of the design being built (the app's MAS store), not of a comparison copy.
        if (args[0] !== useMasStore().$id) return;
        if (name === 'set') after(() => useEngineDiagnosticsStore().replaceSimulationFindings(args[1]));
        else if (name === 'clear') after(() => useEngineDiagnosticsStore().replaceSimulationFindings([]));
    }, true);
}

// Settles once the engine boot has applied the user's engine settings (applyUserSettings), whether
// or not that succeeded; main.js reports a failure. A design loaded in the first seconds after the
// page opens used to reach the engine before the user's material-data extrapolation choice did, so
// MKF refused, at load, losses the builder computes a moment later.
let settleUserSettings;
const userSettingsSettled = new Promise((resolve) => { settleUserSettings = resolve; });
export function engineUserSettingsSettled() {
    return userSettingsSettled;
}

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

        // Start-up (and engine restart): apply the user's persisted temperature-gate and
        // extrapolation choices, and arm log collection when the panel is enabled or extrapolation
        // is allowed (its warnings are how the user learns a result was extrapolated).
        async applyUserSettings(mkf) {
            try {
                await this.applyUserSettingsToEngine(mkf);
            }
            finally {
                settleUserSettings();
            }
        },

        async applyUserSettingsToEngine(mkf) {
            const settingsStore = useSettingsStore();
            const allow = settingsStore.magneticBuilderSettings.allowMaterialDataExtrapolation;
            if (typeof allow !== 'boolean') {
                throw new Error(`settings.magneticBuilderSettings.allowMaterialDataExtrapolation must be true or false, got ${JSON.stringify(allow)}`);
            }
            const changes = { allowMaterialDataExtrapolation: allow };
            const enabled = settingsStore.adviserSettings.coreAdviserEnableTemperatureFilter;
            const maximum = settingsStore.adviserSettings.coreAdviserMaximumTemperature;
            if (enabled !== null && enabled !== undefined) changes.coreAdviserEnableTemperatureFilter = enabled;
            if (maximum !== null && maximum !== undefined) changes.coreAdviserMaximumTemperature = maximum;
            await this.writeEngineSettings(changes, mkf);
            if (settingsStore.engineLogSettings.showEngineLog) {
                await this.startCollection(settingsStore.engineLogSettings.level, mkf);
            }
            else if (allow) {
                await this.armCollector(settingsStore.engineLogSettings.level, mkf);
            }
        },

        // While extrapolation is allowed and the panel is not polling, called right after each
        // builder calculation that uses core-loss data (see drainEngineLogAfterCoreLossCalculations),
        // so its warnings show without a timer.
        drainExtrapolationWarnings() {
            if (this.collecting || !this.allowMaterialDataExtrapolation) return;
            this.drain().catch((error) => {
                this.collectionError = String(error?.message ?? error);
                console.error('[EngineLog] could not drain the MKF log:', error);
            });
        },

        async setAllowMaterialDataExtrapolation(value) {
            const settingsStore = useSettingsStore();
            settingsStore.magneticBuilderSettings.allowMaterialDataExtrapolation = !!value;
            await this.writeEngineSettings({ allowMaterialDataExtrapolation: !!value });
            if (settingsStore.engineLogSettings.showEngineLog) return;
            if (value) {
                await this.armCollector(settingsStore.engineLogSettings.level);
            }
            else {
                await this.stopCollection();
            }
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
            await this.armCollector(level, mkf);
            if (!this.collecting) {
                this.collecting = true;
                this.scheduleDrain();
            }
        },

        // Has the engine collect at `level` without draining it on a timer.
        async armCollector(level, mkf = null) {
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
        },

        // Stops the timer; the engine keeps collecting while extrapolation is allowed, because its
        // warnings are then drained after each core-loss calculation (drainEngineLogAfterCoreLossCalculations).
        async stopCollection() {
            this.collecting = false;
            if (this.allowMaterialDataExtrapolation) return;
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

        // A record that does not come from MKF's collector (the builder's calculation failures, what a
        // load corrected): the same message from the same source as the last record counts up.
        addRecord(level, module, message) {
            if (!ENGINE_LOG_LEVELS.includes(level)) {
                throw new Error(`Unknown engine log level '${level}'`);
            }
            const last = this.records[this.records.length - 1];
            if (last != null && last.level === level && last.module === module && last.message === message) {
                last.count += 1;
                last.timestamp = new Date().toISOString();
                return;
            }
            this.records.push({ id: this.nextRecordId++, timestamp: new Date().toISOString(), level, module, message, count: 1 });
            if (this.records.length > MAXIMUM_RECORDS) {
                this.records = this.records.slice(-MAXIMUM_RECORDS);
            }
        },

        // findings: [{operatingPointIndex?, operatingPointName?, code, message}] from analyze_results.
        // MKF's message opens with the point it is about; the record names it once, in front. A finding
        // about the whole design (an edgewise bend tighter than the wire's mandrel) has no point.
        replaceSimulationFindings(findings) {
            this.records = this.records.filter((record) => record.module !== SIMULATION_FINDINGS_MODULE);
            const operatingPoints = useMasStore().mas.inputs?.operatingPoints ?? [];
            for (const finding of findings) {
                const index = finding.operatingPointIndex;
                if (index == null) {
                    this.addRecord('WARNING', SIMULATION_FINDINGS_MODULE, finding.message.charAt(0).toUpperCase() + finding.message.slice(1));
                    continue;
                }
                const pointName = finding.operatingPointName ?? operatingPoints[index]?.name ?? `Operating point ${index + 1}`;
                const message = finding.message.replace(/^At operating point \d+( \('[^']*'\))?(: |, )/, '');
                this.addRecord('WARNING', SIMULATION_FINDINGS_MODULE, `${pointName}: ${message.charAt(0).toUpperCase() + message.slice(1)}`);
            }
        },

        clearRecords() {
            this.records = [];
        },
    },
})

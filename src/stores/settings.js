import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useSettingsStore = defineStore("settings", () => {
    const loadingGif = ref(`${import.meta.env.BASE_URL}images/loading.gif`);
    const processingGif = ref(`${import.meta.env.BASE_URL}images/processing.gif`);
    const waitingTimeAfterChange = 200;
    const waitingTimeForPlottingAfterChange = 500;

    const catalogAdviserSettings = ref({
        advancedMode: true,
        useAllParts: false,
    })

    const coreAdviserSettings = ref({
        weights: null,
    })

    // Validate and fix coreAdviseMode from localStorage if needed
    const validateCoreAdviseMode = (value) => {
        if (typeof value !== 'string' || value === '[object Object]') {
            console.warn('[SettingsStore] Invalid coreAdviseMode detected, resetting to default');
            return "standard cores";
        }
        return value;
    };

    const adviserSettings = ref({
        useOnlyCoresInStock: true,
        allowDistributedGaps: true,
        allowStacks: true,
        allowToroidalCores: true,
        coreAdviseMode: "standard cores",
        enableTemperatureFilter: false,
        maximumTemperature: 130,
    })

    const magneticBuilderSettings = ref({
        useOnlyCoresInStock: true,
        allowDistributedGaps: true,
        allowStacks: true,
        allowToroidalCores: true,
        advancedMode: true,
        autoRedraw: true,
        enableSimulation: true,
        enableAutoSimulation: true,
        enableDebugConsole: false,
        // Optional whitelist of core shape families (case-insensitive codes
        // like "t", "e", "etd"). When null (default) all families MKF reports
        // are shown. When set to an array, both Basic and Advanced core
        // selectors only list families whose lowercase code is in the array.
        // Used by host apps (e.g. el-choker which only supports toroidal
        // cores) to restrict the catalog without forking MagneticBuilder.
        restrictedShapeFamilies: null,
    })

    const magneticAdviserSettings = ref({
        weights: null,
        maximumNumberResults: 6,
    })

    const operatingPointSettings = ref({
        advancedMode: true,
    })

    // Watch for invalid coreAdviseMode after hydration from localStorage
    watch(adviserSettings, (newValue) => {
        if (newValue.coreAdviseMode && (typeof newValue.coreAdviseMode !== 'string' || String(newValue.coreAdviseMode) === '[object Object]')) {
            console.warn('[SettingsStore] Detected invalid coreAdviseMode after hydration, resetting to default');
            adviserSettings.value.coreAdviseMode = "standard cores";
        }
    }, { immediate: true, deep: true });

    function reset() {
        this.adviserSettings ={
            useOnlyCoresInStock: true,
            allowDistributedGaps: true,
            allowStacks: true,
            allowToroidalCores: true,
            coreAdviseMode: "standard cores",
            enableTemperatureFilter: false,
            maximumTemperature: 130,
        };
        this.magneticBuilderSettings = {
            useOnlyCoresInStock: true,
            allowDistributedGaps: true,
            allowStacks: true,
            allowToroidalCores: true,
            advancedMode: true,
            autoRedraw: true,
            enableSimulation: true,
            enableAutoSimulation: true,
            enableDebugConsole: false,
            restrictedShapeFamilies: null,
        };
        this.coreAdviserSettings ={
            weights: null,
        };
        this.magneticAdviserSettings ={
            weights: null,
            maximumNumberResults: 6,
        };
        this.operatingPointSettings ={
            advancedMode: true,
        };


        this.catalogAdviserSettings = {
            advancedMode: true,
            useAllParts: null,
        };


    }

    return {
        adviserSettings,
        magneticBuilderSettings,
        coreAdviserSettings,
        magneticAdviserSettings,
        operatingPointSettings,

        catalogAdviserSettings,

        reset,

        loadingGif,
        processingGif,
        waitingTimeAfterChange,
        waitingTimeForPlottingAfterChange,
    }
},
{
    persist: true,
})

import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useSettingsStore = defineStore("settings", () => {
    const catalogAdviserUseAllParts = ref(false);
    const loadingGif = ref("/images/loading.gif");
    const waitingTimeAfterChange = 200;
    const waitingTimeForPlottingAfterChange = 500;

    const coreAdviserSettings = ref({
        weights: null,
    })

    const adviserSettings = ref({
        spiderBarChartNotBar: false,
        useOnlyCoresInStock: true,
        allowDistributedGaps: true,
        allowStacks: true,
        allowToroidalCores: true,
    })

    const magneticBuilderSettings = ref({
        useOnlyCoresInStock: true,
        allowDistributedGaps: true,
        allowStacks: true,
        allowToroidalCores: true,
        advancedMode: false,
    })

    const magneticAdviserSettings = ref({
        weights: null,
        maximumNumberResults: 6,
    })

    const operatingPointSettings = ref({
        advancedMode: false,
    })

    const dump = computed(() => {
        return {
            "catalogAdviserUseAllParts": catalogAdviserUseAllParts.value,
        }
    })

    function reset() {
        this.adviserSettings ={
            spiderBarChartNotBar: false,
            useOnlyCoresInStock: true,
            allowDistributedGaps: true,
            allowStacks: true,
            allowToroidalCores: true,
        };
        this.magneticBuilderSettings = {
            useOnlyCoresInStock: true,
            allowDistributedGaps: true,
            allowStacks: true,
            allowToroidalCores: true,
            advancedMode: false,
        };
        this.coreAdviserSettings ={
            weights: null
        };
        this.magneticAdviserSettings ={
            weights: null,
            maximumNumberResults: 6,
        };
        this.operatingPointSettings ={
            advancedMode: false,
        };


        this.catalogAdviserUseAllParts = false;


    }

    return {
        adviserSettings,
        magneticBuilderSettings,
        coreAdviserSettings,
        magneticAdviserSettings,
        operatingPointSettings,

        catalogAdviserUseAllParts,

        dump,
        reset,

        loadingGif,
        waitingTimeAfterChange,
        waitingTimeForPlottingAfterChange,
    }
},
{
    persist: true,
})

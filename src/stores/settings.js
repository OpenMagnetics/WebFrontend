import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useSettingsStore = defineStore("settings", () => {
    const adviserSpiderBarChartNotBar = ref('0');
    const adviserUseOnlyCoresInStock = ref('1');
    const adviserAllowDistributedGaps = ref('1');
    const adviserAllowStacks = ref('1');
    const adviserToroidalCores = ref('1');
    const catalogAdviserUseAllParts = ref(false);

    const labelBgColor = ref('bg-dark');
    const valueBgColor = ref('bg-light');
    const textColor = ref('text-white');
    const loadingGif = ref("/images/loading.gif");

    const coreAdviserSettings = ref({
        weights: null,
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
            "adviserSpiderBarChartNotBar": adviserSpiderBarChartNotBar.value,
            "adviserUseOnlyCoresInStock": adviserUseOnlyCoresInStock.value,
            "adviserAllowDistributedGaps": adviserAllowDistributedGaps.value,
            "adviserAllowStacks": adviserAllowStacks.value,
            "adviserToroidalCores": adviserToroidalCores.value,
            "catalogAdviserUseAllParts": catalogAdviserUseAllParts.value,
        }
    })

    function reset() {
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


        this.adviserSpiderBarChartNotBar = false;
        this.adviserUseOnlyCoresInStock = true;
        this.adviserAllowDistributedGaps = true;
        this.adviserAllowStacks = true;
        this.adviserToroidalCores = true;
        this.catalogAdviserUseAllParts = false;


    }

    return {
        coreAdviserSettings,
        magneticAdviserSettings,
        operatingPointSettings,

        adviserSpiderBarChartNotBar,
        adviserUseOnlyCoresInStock,
        adviserAllowDistributedGaps,
        adviserAllowStacks,
        adviserToroidalCores,
        catalogAdviserUseAllParts,

        dump,
        reset,

        labelBgColor,
        valueBgColor,
        textColor,
        loadingGif,
    }
},
{
    persist: true,
})

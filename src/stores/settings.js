import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useSettingsStore = defineStore("settings", () => {
    const adviserSpiderBarChartNotBar = ref('0')
    const adviserUseOnlyCoresInStock = ref('1')
    const adviserAllowDistributedGaps = ref('1')
    const adviserAllowStacks = ref('1')
    const adviserToroidalCores = ref('1')

    const dump = computed(() => {
        return {
            "adviserSpiderBarChartNotBar": adviserSpiderBarChartNotBar.value,
            "adviserUseOnlyCoresInStock": adviserUseOnlyCoresInStock.value,
            "adviserAllowDistributedGaps": adviserAllowDistributedGaps.value,
            "adviserAllowStacks": adviserAllowStacks.value,
            "adviserToroidalCores": adviserToroidalCores.value,
        }
    })

    function reset() {
        this.adviserSpiderBarChartNotBar = false;
        this.adviserUseOnlyCoresInStock = true;
        this.adviserAllowDistributedGaps = true;
        this.adviserAllowStacks = true;
        this.adviserToroidalCores = true;
    }

    return {
        adviserSpiderBarChartNotBar,
        adviserUseOnlyCoresInStock,
        adviserAllowDistributedGaps,
        adviserAllowStacks,
        adviserToroidalCores,

        dump,
        reset,
    }
},
{
    persist: true,
})

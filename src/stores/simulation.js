import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useSimulationStore = defineStore("simulation", () => {
    const dataReadOnly = ref(false)
    const isDataReadOnly = computed(() => {
        return dataReadOnly
    })
    function setDataReadOnly(dataReadOnly) {
        this.dataReadOnly = dataReadOnly
    }
    function calculateInductance() {
    }
    function calculateCoreLosses() {
    }
    function loadCoreLossesModels() {
    }
    return {
        dataReadOnly,
        isDataReadOnly,
        setDataReadOnly,
        calculateInductance,
        calculateCoreLosses,
        loadCoreLossesModels,
    }
})

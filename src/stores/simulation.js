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
    return {
        dataReadOnly,
        isDataReadOnly,
        setDataReadOnly
    }
})

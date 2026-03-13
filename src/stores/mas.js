import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'
import { useAdviseCacheStore } from './adviseCache'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON.stringify(Defaults.powerMas)));
    
    // Get advise cache store to clear advised lists when resetting
    const getAdviseCacheStore = () => useAdviseCacheStore();


    function importedMas() {
    }
    function updatedTurnsRatios() {
    }
    function updatedInputExcitationWaveformUpdatedFromGraph(signalDescriptor) {
    }
    function updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor) {
    }
    function updatedInputExcitationProcessed(signalDescriptor) {
    }

    function setMas(masValue) {
        mas.value = null;
        mas.value = masValue;
    }

    function setInputs(inputs) {
        mas.value.inputs = inputs;
    }

    function resetMas(type) {
        // Clear advised magnetics/cores cache when starting a new design
        const adviseCacheStore = getAdviseCacheStore();
        adviseCacheStore.cleanMasAdvises();
        adviseCacheStore.cleanCoreAdvises();
        
        if (type == "power") {
            mas.value = MAS.Convert.toMas(JSON.stringify(Defaults.powerMas));
        }
        else if (type == "filter") {
            mas.value = MAS.Convert.toMas(JSON.stringify(Defaults.filterMas));
        }
    }

    function resetMagnetic(type) {
        if (type == "power") {
            mas.value.magnetic = MAS.Convert.toMas(JSON.stringify(Defaults.powerMas)).magnetic;
        }
        else if (type == "filter") {
            mas.value.magnetic = MAS.Convert.toMas(JSON.stringify(Defaults.filterMas)).magnetic;
        }
    }

    return {
        setMas,
        setInputs,
        mas,
        resetMas,
        resetMagnetic,
        importedMas,
        updatedTurnsRatios,
        updatedInputExcitationWaveformUpdatedFromGraph,
        updatedInputExcitationWaveformUpdatedFromProcessed,
        updatedInputExcitationProcessed,
    }
},
{
    persist: true,
}
)

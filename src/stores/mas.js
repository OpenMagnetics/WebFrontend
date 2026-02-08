import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON.stringify(Defaults.powerMas)));


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

    function setMas(mas) {
        this.mas = null;
        this.mas = mas;
    }

    function setInputs(inputs) {
        this.mas.inputs = inputs;
    }

    function resetMas(type) {
        if (type == "power") {
            this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.powerMas));
        }
        else if (type == "filter") {
            this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.filterMas));
        }
    }

    function resetMagnetic(type) {
        if (type == "power") {
            this.mas.magnetic = MAS.Convert.toMas(JSON.stringify(Defaults.powerMas)).magnetic;
        }
        else if (type == "filter") {
            this.mas.magnetic = MAS.Convert.toMas(JSON.stringify(Defaults.filterMas)).magnetic;
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

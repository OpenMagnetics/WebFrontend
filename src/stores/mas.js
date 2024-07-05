import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import * as Defaults from '/src/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON.stringify(Defaults.mas)));
    const coreAdviserWeights = ref(null);

    const magneticAdviserWeights = ref(null);
    const magneticAdviserMaximumNumberResults = ref(6);
    const magneticManualOperationPoints = ref([false]);
    const magneticCircuitSimulatorOperationPoints = ref([false]);

    function updatedTurnsRatios() {
    }
    function updatedInputExcitationWaveformUpdatedFromGraph(signalDescriptor) {
    }
    function updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor) {
    }
    function updatedInputExcitationProcessed(signalDescriptor) {
    }

    function setMas(mas) {
        console.log("Inside mas")
        console.log(mas)

        this.mas = mas;
        console.log("Inside this.mas")
        console.log(this.mas)
    }

    function resetMas() {
        this.coreAdviserWeights = null;
        this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.mas));
        this.magneticManualOperationPoints = [false];
        this.magneticCircuitSimulatorOperationPoints = [false];
        console.log("Resetting!!!!!!!!!!!!!")
    }


    function resetCache() {
        this.coreAdvisesCache = {};
        this.coreAdvises = null;
        this.coreAdvisesTimestamp = null;
        console.log("Resetting cache!!!!!!!!!!!!!")
    }

    return {
        setMas,
        mas,
        resetMas,
        resetCache,
        coreAdviserWeights,
        updatedTurnsRatios,
        updatedInputExcitationWaveformUpdatedFromGraph,
        updatedInputExcitationWaveformUpdatedFromProcessed,
        updatedInputExcitationProcessed,
        magneticAdviserWeights,
        magneticAdviserMaximumNumberResults,
        magneticManualOperationPoints,
        magneticCircuitSimulatorOperationPoints,
    }
},
{
    persist: true,
}
)

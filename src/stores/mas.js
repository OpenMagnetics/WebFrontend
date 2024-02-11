import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import * as Defaults from '/src/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON.stringify(Defaults.mas)));
    const coreAdviserWeights = ref(null);
    const coreAdvises = ref(null);
    const coreAdvisesCache = ref({});
    const coreAdvisesTimestamp = ref(null)
    const coreAdvisesTtlInMilliseconds = 24 * 60 * 60 * 1000 // 24 hours

    const magneticAdviserWeights = ref(null);
    const magneticAdviserMaximumNumberResults = ref(6);

    function areCoreAdvisesValid() {
        if (this.coreAdvisesTimestamp == null || (this.coreAdvisesTimestamp + this.coreAdvisesTtlInMilliseconds < Date.now())) {
            Object.keys(this.coreAdvisesCache).forEach(function(k) { delete this.coreAdvisesCache[k]})
            return false;
        }
        else {
            return true;
        }
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
        console.log("Inside mas")
        console.log(mas)

        this.mas = mas;
        console.log("Inside this.mas")
        console.log(this.mas)
    }

    function resetMas() {
        this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.mas));
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
        coreAdvises,
        coreAdvisesCache,
        coreAdvisesTimestamp,
        areCoreAdvisesValid,
        updatedTurnsRatios,
        updatedInputExcitationWaveformUpdatedFromGraph,
        updatedInputExcitationWaveformUpdatedFromProcessed,
        updatedInputExcitationProcessed,
        magneticAdviserWeights,
        magneticAdviserMaximumNumberResults,
    }
},
{
    persist: true,
}
)

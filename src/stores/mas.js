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

    function resetMas() {
        this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.mas));
    }

    return {
        mas,
        resetMas,
        coreAdviserWeights,
        coreAdvises,
        coreAdvisesCache,
        coreAdvisesTimestamp,
        areCoreAdvisesValid,
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

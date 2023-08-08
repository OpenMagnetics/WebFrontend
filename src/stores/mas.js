import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import * as Defaults from '/src/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON. stringify(Defaults.mas)));

    function updatedTurnsRatios() {
    }
    function updatedInputExcitationSwitchingFrequency(operationPoint) {
    }
    function updatedInputExcitationDutyCycle(operationPoint) {
    }
    function updatedInputExcitationPeakToPeak(operationPoint, windingIndex, signalDescriptor) {
    }
    function updatedInputExcitationOffset(operationPoint, windingIndex, signalDescriptor) {
    }
    return {
        mas,
        updatedTurnsRatios,
        updatedInputExcitationSwitchingFrequency,
        updatedInputExcitationDutyCycle,
        updatedInputExcitationPeakToPeak,
        updatedInputExcitationOffset,
    }
},
{
    persist: true,
}
)

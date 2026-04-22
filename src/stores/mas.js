import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from 'WebSharedComponents/assets/ts/MAS.ts'
import * as Defaults from 'WebSharedComponents/assets/js/defaults.js'
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

        // Null out requirements that are added by CMC / filter flows but that
        // `MAS.Convert.toMas` preserves silently. Without this, a user who
        // runs a CMC design and then switches to Buck inherits the CMC
        // impedance requirement and the Core Adviser rejects every candidate
        // because it still runs the impedance filter. See Bug E in
        // docs/mkf-bug-reports.md.
        const dr = mas.value?.inputs?.designRequirements;
        if (dr) {
            dr.minimumImpedance = null;
            dr.maximumImpedance = null;
            if (type === "power") {
                // Line-frequency + LISN are only meaningful for filter (CMC).
                dr.lineFrequency = null;
                dr.lineImpedance = null;
            }
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

    const hasMirroredWindings = computed(() =>
        mas.value?.inputs?.designRequirements?.topology === 'CommonModeChoke'
    );

    return {
        setMas,
        setInputs,
        mas,
        hasMirroredWindings,
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

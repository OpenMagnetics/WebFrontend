import { defineStore } from 'pinia'
import { ref } from 'vue'

// What the last load changed in the design (services/loadMasIntoApp.js): [{ operatingPointIndex,
// operatingPointName, windingIndex, signal, message }]. A change to a stored waveform
// (placeWaveformsOnTheirPeriod) names its operating point, and the Op. Points page shows it next
// to its signal. A change to the magnetic itself (putLoneWindingOnThePrimarySide) has
// operatingPointIndex null, and the load reports it in the Engine log.
// Not persisted: it describes one load, and a reload must not resurrect it over a design the user
// has edited since.
export const useLoadCorrectionsStore = defineStore('loadCorrections', () => {
    const corrections = ref([]);

    function set(list) {
        corrections.value = list;
    }

    function clear() {
        corrections.value = [];
    }

    function of(operatingPointIndex, windingIndex) {
        return corrections.value.filter((correction) => correction.operatingPointIndex === operatingPointIndex && correction.windingIndex === windingIndex);
    }

    return { corrections, set, clear, of };
});

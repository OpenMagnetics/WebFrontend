import { defineStore } from 'pinia'
import { ref } from 'vue'

// What the last load changed in the design's stored waveforms (services/loadMasIntoApp.js,
// placeWaveformsOnTheirPeriod): [{ operatingPointIndex, operatingPointName, windingIndex, signal,
// message }]. The Op. Points page shows each one next to its signal.
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

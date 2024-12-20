import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON.stringify(Defaults.powerMas)));
    const coreAdviserWeights = ref(null);

    const magneticAdviserWeights = ref(null);
    const magneticAdviserMaximumNumberResults = ref(6);
    const magneticManualOperatingPoints = ref([false]);
    const magneticCircuitSimulatorOperatingPoints = ref([false]);
    const magneticCircuitSimulatorColumnNames = ref([]);
    const magneticCircuitSimulatorAllLastReadColumnNames = ref([]);
    const magneticCircuitSimulatorConfirmedColumns = ref([]);

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

    function resetMas() {
        this.coreAdviserWeights = null;
        this.mas = MAS.Convert.toMas(JSON.stringify(Defaults.powerMas));
        this.magneticManualOperatingPoints = [false];
        this.magneticCircuitSimulatorOperatingPoints = [false];
        this.magneticCircuitSimulatorColumnNames = [];
        this.magneticCircuitSimulatorAllLastReadColumnNames = [];
        this.magneticCircuitSimulatorConfirmedColumns = [];
        console.log("Resetting!!!!!!!!!!!!!")
    }

    function initializeOperatingPoints() {

        if (this.mas.inputs.operatingPoints.length == 0) {
            this.mas.inputs.operatingPoints.push(
                {
                    name: "Operating Point No. 1",
                    conditions: {ambientTemperature: 42},
                    excitationsPerWinding: []
                }
            );
        }
        this.magneticCircuitSimulatorConfirmedColumns.push([]);
        this.magneticCircuitSimulatorColumnNames.push([]);

        for (var windingIndex = 0; windingIndex < this.mas.inputs.designRequirements.turnsRatios.length + 1; windingIndex++) {
            this.mas.inputs.operatingPoints[0].excitationsPerWinding.push(deepCopy(Defaults.defaultOperatingPointExcitation));
            this.magneticCircuitSimulatorConfirmedColumns[0].push(false);
        }
    }


    function addNewOperatingPoint(currentOperatingPointIndex) {
        var newOperatingPoint = deepCopy(this.mas.inputs.operatingPoints[currentOperatingPointIndex]);
        newOperatingPoint.name = 'Operating Point No. ' + (this.mas.inputs.operatingPoints.length + 1);
        newOperatingPoint.excitationsPerWinding = [newOperatingPoint.excitationsPerWinding[0]];

        this.magneticCircuitSimulatorConfirmedColumns.push([]);
        this.magneticCircuitSimulatorColumnNames.push([]);
        this.mas.inputs.operatingPoints.push(newOperatingPoint);
    }

    function removeOperatingPoint(index) {
        this.magneticCircuitSimulatorConfirmedColumns.splice(index, 1);
        this.magneticCircuitSimulatorColumnNames.splice(index, 1);
        this.mas.inputs.operatingPoints.splice(index, 1);
    }

    return {
        setMas,
        mas,
        resetMas,
        coreAdviserWeights,
        importedMas,
        updatedTurnsRatios,
        updatedInputExcitationWaveformUpdatedFromGraph,
        updatedInputExcitationWaveformUpdatedFromProcessed,
        updatedInputExcitationProcessed,
        magneticAdviserWeights,
        magneticAdviserMaximumNumberResults,
        magneticManualOperatingPoints,
        magneticCircuitSimulatorOperatingPoints,
        magneticCircuitSimulatorColumnNames,
        magneticCircuitSimulatorAllLastReadColumnNames,
        magneticCircuitSimulatorConfirmedColumns,
        initializeOperatingPoints,
        addNewOperatingPoint,
        removeOperatingPoint,
    }
},
{
    persist: true,
}
)

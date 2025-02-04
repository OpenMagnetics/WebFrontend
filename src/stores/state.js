import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import { useMasStore } from '/src/stores/mas'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'


export const useStateStore = defineStore("state", () => {
    const OperatingPointsMode = {
      Manual: 'Manual',
      CircuitSimulatorImport: 'CircuitSimulatorImport',
      AcSweep: 'AcSweep',
      HarmonicsList: 'HarmonicsList',
    };
    const currentOperatingPoint = ref(0);

    const operatingPointsCircuitSimulator = ref({
        columnNames: [],
        allLastReadColumnNames: [],
        confirmedColumns: [],
    });

    const operatingPoints = ref({
        modePerPoint: [null],
    });


    function reset() {
        this.currentOperatingPoint = 0;
        this.operatingPointsCircuitSimulator = {
            columnNames: [],
            allLastReadColumnNames: [],
            confirmedColumns: [],
        };
        this.operatingPoints = {
            modePerPoint: [null],
        };
    }

    function initializeOperatingPoints(temperature=100) {

        const masStore = useMasStore();

        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Op. Point No. 1",
                    conditions: {ambientTemperature: temperature},
                    excitationsPerWinding: []
                }
            );
        }
        this.operatingPointsCircuitSimulator.confirmedColumns.push([]);
        this.operatingPointsCircuitSimulator.columnNames.push([]);

        for (var windingIndex = 0; windingIndex < masStore.mas.inputs.designRequirements.turnsRatios.length + 1; windingIndex++) {
            masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.push(deepCopy(Defaults.defaultOperatingPointExcitation));
            this.operatingPointsCircuitSimulator.confirmedColumns[0].push(false);
        }
    }

    function addNewOperatingPoint(currentOperatingPointIndex) {
        const masStore = useMasStore();
        var newOperatingPoint = deepCopy(masStore.mas.inputs.operatingPoints[currentOperatingPointIndex]);
        newOperatingPoint.name = 'Op. Point No. ' + (masStore.mas.inputs.operatingPoints.length + 1);
        newOperatingPoint.excitationsPerWinding = [newOperatingPoint.excitationsPerWinding[0]];

        this.operatingPointsCircuitSimulator.confirmedColumns.push([]);
        this.operatingPointsCircuitSimulator.columnNames.push([]);
        masStore.mas.inputs.operatingPoints.push(newOperatingPoint);
    }

    function removeOperatingPoint(index) {
        const masStore = useMasStore();
        this.operatingPointsCircuitSimulator.confirmedColumns.splice(index, 1);
        this.operatingPointsCircuitSimulator.columnNames.splice(index, 1);
        masStore.mas.inputs.operatingPoints.splice(index, 1);
    }


    return {
        reset,
        OperatingPointsMode,
        currentOperatingPoint,
        operatingPointsCircuitSimulator,
        operatingPoints,
        initializeOperatingPoints,
        addNewOperatingPoint,
        removeOperatingPoint,
    }
},
{
    persist: true,
})

import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCrossReferencerStore = defineStore("crossReferencer", () => {

    const referenceInputs = ref({
        core: {
            functionalDescription: {
                type: "two-piece set",
                material: "3C97",
                shape:  "PQ 40/40",
                gapping: [{
                    "type": "subtractive",
                    "length": 0.001
                },{
                    "type": "residual",
                    "length": 0.00001
                },{
                    "type": "residual",
                    "length": 0.00001
                }],
                numberStacks: 1
            }
        },
        numberTurns: 10,
        temperature: 25,
        enabledCoreTypes: ["Toroidal", "Two-Piece Set", "Only Cores In Stock"],
    });

    const results = ref({
        crossReferencedCores: [],
        crossReferencedCoresValues: [],
        referenceScoredValues: [],
        xLabel: "Enveloping Volume",
        yLabel: "Core Losses",
    });

    const selectedCoreIndex = ref(-1);

    return {
        referenceInputs,
        selectedCoreIndex,
        results,
    }
},
{
    persist: true,
}
)

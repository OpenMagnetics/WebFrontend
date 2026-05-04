import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import { CoreType, GapType } from 'WebSharedComponents/assets/ts/MAS.ts'

export const useCrossReferencerStore = defineStore("crossReferencer", () => {

    const coreReferenceInputs = ref({
        core: {
            functionalDescription: {
                type: CoreType.TwoPieceSet,
                material: "3C97",
                shape:  "PQ 40/40",
                gapping: [{
                    "type": GapType.Subtractive,
                    "length": 0.001
                },{
                    "type": GapType.Residual,
                    "length": 0.00001
                },{
                    "type": GapType.Residual,
                    "length": 0.00001
                }],
                numberStacks: 1
            }
        },
        numberTurns: 10,
        temperature: 25,
        maximumDimensions: {
            height: 0.05
        },
        numberMaximumResults: 20,
        enabledCoreTypes: ["Toroidal", "Two-Piece Set", "Only Cores In Stock"],
    });

    const coreResults = ref({
        crossReferencedCores: [],
        crossReferencedCoresValues: [],
        referenceScoredValues: [],
        xLabel: "Enveloping Volume",
        yLabel: "Core Losses",
    });

    const coreMaterialReferenceInputs = ref({
        material: "3C97",
        temperature: 25,
        numberMaximumResults: 20,
        enabledCoreTypes: [],
    });

    const coreMaterialResults = ref({
        crossReferencedCoreMaterials: [],
        crossReferencedCoreMaterialsValues: [],
        referenceScoredValues: [],
        xLabel: "Initial Permeability",
        yLabel: "Volumetric Losses",
    });

    const selectedCoreIndex = ref(-1);
    const selectedCoreMaterialIndex = ref(-1);

    return {
        coreReferenceInputs,
        selectedCoreIndex,
        coreResults,
        coreMaterialReferenceInputs,
        selectedCoreMaterialIndex,
        coreMaterialResults,
    }
},
{
    persist: true,
}
)

<script setup>
import { Chart, registerables } from 'chart.js'
import { toTitleCase, removeTrailingZeroes, formatPower, formatDimension, formatInductance, formatResistance } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../../stores/taskQueue'
</script>

<script>
var options = {};
var chart = null;
export default {
    props: {
        adviseIndex: {
            type: Number,
            required: true
        },
        masData: {
            type: Object,
            required: true
        },
        scoring: {
            type: Number,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        allowView: {
            type: Boolean,
            required: true
        },
        allowOrder: {
            type: Boolean,
            required: true
        },
        allowEdit: {
            type: Boolean,
            required: true
        },
    },
    data() {
        const data = {};
        const taskQueueStore = useTaskQueueStore();
        const localTexts = {
            losses: null,
            dcResistance: null,
            magnetizingInductance: null,
            dimensions: null,
        };
        return {
            data,
            localTexts,
            masScore: null,
            taskQueueStore,
        }
    },
    computed: {
        fixedMagneticName() {
            if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ").length > 1) {
                var gapLength = null;
                var extraForStacks = '';
                if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 0) {
                    gapLength =  removeTrailingZeroes(Number(this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[0]));
                    if (this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm").length > 1) {
                        extraForStacks = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[1].split(" mm")[1];
                    }
                }
                this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.split("Gapped ")[0] + gapLength + " mm" + extraForStacks;
            }
            else {
                // this.masData.magnetic.manufacturerInfo.reference = this.masData.magnetic.manufacturerInfo.reference.replaceAll("Ungapped", "Ung.");
            }
            return this.masData.magnetic.manufacturerInfo.reference;
        },
    },
    watch: {
    },
    mounted () {

        this.processLocalTexts();
    },
    methods: {
        async processLocalTexts() {
            // {
            //     const aux = formatPower(this.masData.outputs[0].coreLosses.coreLosses + this.masData.outputs[0].windingLosses.windingLosses);
            //     this.localTexts.losses = `Losses:\n${removeTrailingZeroes(aux.label, 2)} ${aux.unit}`
            // }
            {
                // After magnetic_autocomplete, shape and material are objects with .name.
                // Guard for the un-hydrated case where they're still raw strings.
                const fd = this.masData?.magnetic?.core?.functionalDescription;
                const shapeName = (typeof fd?.shape === 'string') ? fd.shape : fd?.shape?.name;
                const materialName = (typeof fd?.material === 'string') ? fd.material : fd?.material?.name;
                this.localTexts.core = `Core: ${shapeName ?? '—'} - ${materialName ?? '—'}`;
            }
            {
                this.localTexts.turnsRatios = "Turns ratios: ";
                this.masData.magnetic.coil.functionalDescription.forEach((elem, index) => {
                    if (index > 0) {
                        this.localTexts.turnsRatios += `${removeTrailingZeroes(this.masData.magnetic.coil.functionalDescription[0].numberTurns / elem.numberTurns, 1)}:`;
                    }
                })
                if (this.localTexts.turnsRatios != "Turns ratios: ") {
                    this.localTexts.turnsRatios = this.localTexts.turnsRatios.slice(0, -1);
                }
            }
            {
                // outputs[0].inductance.magnetizingInductance.magnetizingInductance.nominal
                // is the path produced by MagneticAdviser when it runs the MagnetizingInductance
                // filter. Fall back to the design requirement if no simulated output is present.
                const indNom = this.masData?.outputs?.[0]?.inductance?.magnetizingInductance?.magnetizingInductance?.nominal
                    ?? this.masData?.inputs?.designRequirements?.magnetizingInductance?.nominal;
                if (indNom != null) {
                    const aux = formatInductance(indNom);
                    this.localTexts.magnetizingInductance = `Mag. Ind.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                }
            }
            {
                const dcRes = this.masData?.outputs?.[0]?.windingLosses?.dcResistancePerWinding?.[0];
                if (dcRes != null) {
                    const aux = formatResistance(dcRes);
                    this.localTexts.dcResistance = `DC Res.: ${removeTrailingZeroes(aux.label, 1)} ${aux.unit}`;
                }
            }
            {
                try {
                    const maximumDimensions = await this.taskQueueStore.getMaximumDimensions(this.masData.magnetic);
                    // maximumDimensions is now an array in worker mode
                    const maximumDimensions0 = formatDimension(maximumDimensions[0]);
                    const maximumDimensions1 = formatDimension(maximumDimensions[1]);
                    const maximumDimensions2 = formatDimension(maximumDimensions[2]);
                    this.localTexts.dimensions = `Dim.: ${removeTrailingZeroes(maximumDimensions0.label, 2)} ${maximumDimensions0.unit} x ${removeTrailingZeroes(maximumDimensions1.label, 2)} ${maximumDimensions1.unit} x ${removeTrailingZeroes(maximumDimensions2.label, 2)} ${maximumDimensions2.unit}`
                } catch (error) {
                    console.error('Error getting maximum dimensions:', error);
                }
            }  
        }
    }
}
</script>

<template>
    <div class="container">
        <div v-if="masData.magnetic.manufacturerInfo != null" class="advise-option" :style="$styleStore.catalogAdviser.adviserHeader">
            <div class="advise-option-header" :style="$styleStore.catalogAdviser.adviserHeader">
                <span class="advise-option-title col-9 px-1">{{fixedMagneticName}}</span>
                <span class="advise-option-score col-3">{{removeTrailingZeroes(scoring * 100, 1)}}</span>
            </div>
            <div class="advise-option-body" :style="$styleStore.catalogAdviser.adviserBody">
                <div class="row p-0 m-0 py-2 advise-option-metrics">
                    <div class="col-12 m-0 row text-center">
                        <!-- <div class="col-4 p-0 m-0" style="white-space: pre-line">{{localTexts.losses}}</div> -->
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.core}}</div>
                        <div v-if="masData.magnetic.coil.functionalDescription.length > 1" class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.turnsRatios}}</div>
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.dcResistance}}</div>
                        <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.magnetizingInductance}}</div>
                        <!-- <div class="col-12 p-0 m-0" style="white-space: pre-line">{{localTexts.dimensions}}</div> -->
                    </div>
                </div>
                <button
                    v-if="allowView"
                    :style="$styleStore.catalogAdviser.viewButton"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-view-button'"
                    class="advise-btn advise-btn-primary col-3"
                    @click="$emit('viewMagnetic')"
                >
                    {{'View'}}
                </button>
                <button
                    :style="$styleStore.catalogAdviser.editButton"
                    v-if="allowEdit || scoring < 0"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-edit-button'"
                    class="advise-btn advise-btn-outline offset-1 col-3"
                    @click="$emit('editMagnetic')"
                >
                    {{'Edit'}}
                </button>
                <button
                    v-if="allowOrder"
                    :style="$styleStore.catalogAdviser.orderButton"
                    :data-cy="dataTestLabel + '-advise-' + adviseIndex + '-order-button'"
                    class="advise-btn advise-btn-success offset-1 col-4"
                    @click="$emit('orderSample')"
                >
                    {{'Order a sample'}}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.advise-option {
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg,
        rgba(var(--bs-dark-rgb), 0.75) 0%,
        rgba(var(--bs-dark-rgb), 0.55) 100%);
    border: 1px solid rgba(var(--bs-light-rgb), 0.08);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 24px rgba(var(--bs-dark-rgb), 0.45),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.04);
    overflow: hidden;
}

.advise-option-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--bs-light-rgb), 0.04);
    border-bottom: 1px solid rgba(var(--bs-light-rgb), 0.08);
    color: var(--bs-primary);
    font-weight: 600;
}

.advise-option-title {
    color: var(--bs-white);
    font-size: 1.1rem;
    font-weight: 700;
    text-align: center;
}

.advise-option-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 700;
    background: rgba(var(--bs-primary-rgb), 0.2);
    color: var(--bs-primary);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.45);
}

.advise-option-body {
    padding: 0.6rem 0.75rem;
}

.advise-option-metrics {
    color: rgba(var(--bs-light-rgb), 0.85);
    font-size: 0.85rem;
}

.advise-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
    cursor: pointer;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: nowrap;
}

.advise-btn:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
}

.advise-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--bs-dark-rgb), 0.25);
}

.advise-btn-success {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--bs-light-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--bs-dark-rgb), 0.25);
}

.advise-btn-outline {
    background: rgba(var(--bs-light-rgb), 0.08);
    border: 1px solid rgba(var(--bs-light-rgb), 0.22);
    color: var(--bs-light);
}

.advise-btn-outline:hover:not(:disabled) {
    background: rgba(var(--bs-light-rgb), 0.14);
    border-color: rgba(var(--bs-light-rgb), 0.35);
    color: var(--bs-white);
}
</style>


<script setup>
import { deepCopy, combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter} from 'WebSharedComponents/assets/js/defaults.js'
import PairOfDimensions from 'WebSharedComponents/DataInput/PairOfDimensions.vue';
import { useMasStore } from '../../../stores/mas'

</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        showTitle:{
            type: Boolean,
            default: true
        },
        standardsToDisable: {
            type: Array,
            default: () => [],
        },
        valueFontSize: {
            type: [String, Object],
            default: ''
        },
        titleFontSize: {
            type: [String, Object],
            default: ''
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-12 md:col-7'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-8 md:col-5'
        },
        labelBgColor: {
            type: [String, Object],
            default: "bg-dark",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
        },
        unitExtraStyleClass:{
            type: [String, Object],
            default: ''
        },
        addElementButtonColor: {
            type: [String, Object],
            default: "text-secondary",
        },
        removeElementButtonColor: {
            type: [String, Object],
            default: "text-red-500",
        },
    },
    data() {
        const masStore = useMasStore();
        const localData = []

        masStore.mas.inputs.designRequirements.minimumImpedance.forEach((elem) => {
            localData.push({
                frequency: elem.frequency,
                impedance: elem.impedance.magnitude,
            });
        })
        return {
            localData,
            masStore
        }
    },
    computed: {
    },
    methods: {
        onAddPointBelow(index) {
            const newElement = deepCopy(this.masStore.mas.inputs.designRequirements.minimumImpedance[this.masStore.mas.inputs.designRequirements.minimumImpedance.length - 1])
            this.masStore.mas.inputs.designRequirements.minimumImpedance.push(newElement)
            this.localData.push({
                frequency: newElement.frequency,
                impedance: newElement.impedance.magnitude,
            })
        },
        onRemovePoint(index) {
            this.masStore.mas.inputs.designRequirements.minimumImpedance.splice(index, 1);
            this.localData.splice(index, 1);
        },
        dimensionUpdated(data, index) {
            if (data.dimension == "impedance") {
                this.masStore.mas.inputs.designRequirements.minimumImpedance[index][data.dimension].magnitude = data.value;
            }
            else {
                this.masStore.mas.inputs.designRequirements.minimumImpedance[index][data.dimension] = data.value;
            }
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">
        <div class="grid m-0">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                v-if="showTitle"
                :data-cy="dataTestLabel + '-title'"
                :class="combinedClass([titleFontSize, labelBgColor, textColor])"
                class="rounded-2 col-12"
            >
                Minimum Impedance
            </label>
        </div>
        <div class="grid ml-2" v-for="(row, index) in masStore.mas.inputs.designRequirements.minimumImpedance" :key="index">
            <PairOfDimensions
                class="py-2 col-10"
                :class="index==0? '' : 'border-bottom-1 border-solid border-300' "
                :style="$styleStore.designRequirements.inputBorderColor"
                :names="['frequency', 'impedance']"
                :units="['Hz', 'Ω']"
                :dataTestLabel="dataTestLabel + '-MinimumImpedance'"
                :mins="[minimumMaximumScalePerParameter['frequency']['min'], minimumMaximumScalePerParameter['impedance']['min']]"
                :maxs="[minimumMaximumScalePerParameter['frequency']['max'], minimumMaximumScalePerParameter['impedance']['max']]"
                v-model="localData[index]"
                :labelWidthProportionClass='labelWidthProportionClass'
                :valueWidthProportionClass='valueWidthProportionClass'
                :valueFontSize='valueFontSize'
                :labelFontSize='valueFontSize'
                :labelBgColor='labelBgColor'
                :valueBgColor='valueBgColor'
                :textColor='textColor'
                :unitExtraStyleClass='unitExtraStyleClass'
                @update="dimensionUpdated($event, index)"
            />
            <div class="col-2 grid">
                <button
                    :data-cy="dataTestLabel + '-add-point-below-button'"
                    type="button"
                    class="impedance-icon-btn col-6"
                    @click="onAddPointBelow(index)"
                    >
                    <i
                        :style="combinedStyle([addElementButtonColor])"
                        :class="combinedClass([addElementButtonColor])"
                        class="pi pi-plus-circle text-xl"
                    />
                </button>
                <button
                    :data-cy="dataTestLabel + '-remove-point-button'"
                    v-if="masStore.mas.inputs.designRequirements.minimumImpedance.length > 1"
                    type="button"
                    class="impedance-icon-btn col-6"
                    @click="onRemovePoint(index)">
                    <i
                        :style="combinedStyle([removeElementButtonColor])"
                        :class="combinedClass([removeElementButtonColor])"
                        class="pi pi-minus-circle text-xl"
                    />
                </button>
                <div v-else class="col-6"/>
            </div>
        </div>
    </div>
</template>

<style scoped>
.impedance-icon-btn {
    background: transparent;
    border: 0;
    height: 100%;
    width: 50%;
    padding: 0;
    cursor: pointer;
}
.impedance-icon-btn:hover {
    filter: brightness(1.2);
}
</style>


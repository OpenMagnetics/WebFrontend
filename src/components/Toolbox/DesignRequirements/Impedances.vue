<script setup>
import { deepCopy, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue';
import { useMasStore } from '/src/stores/mas'

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
            default: [],
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        titleFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-7'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-8 col-md-5'
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
            default: "text-danger",
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
    watch: { 
    },
    mounted () {
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
        <div class="row">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                v-if="showTitle"
                :data-cy="dataTestLabel + '-title'"
                :class="combinedClass([titleFontSize, labelBgColor, textColor])"
                class="rounded-2 col-12 ms-3"
            >
                Minimum Impedance
            </label>
        </div>
        <div class="row ms-2" v-for="row, index in masStore.mas.inputs.designRequirements.minimumImpedance">
            <PairOfDimensions class="border-bottom py-2 col-10"
                :style = "$styleStore.designRequirements.inputBorderColor"
                :names="['frequency', 'impedance']"
                :units="['H', 'Ω']"
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
            <div class="col-2 row">
                <button
                    :data-cy="dataTestLabel + '-remove-point-button'"
                    v-if="masStore.mas.inputs.designRequirements.minimumImpedance.length > 1"
                    type="button"
                    class="btn h-100 w-50 btn-circle bg-dark col-6"
                    @click="onRemovePoint(index)">
                    <i
                        :style="combinedStyle([removeElementButtonColor])"
                        :class="combinedClass([removeElementButtonColor])"
                        class="fa-solid fa-2x fa-circle-minus"
                    />
                </button>
                <div v-else class="col-6"/>
                <button
                    :data-cy="dataTestLabel + '-add-point-below-button'"
                    type="button"
                    class="btn btn-circle h-100 w-50 bg-transparent col-6"
                    @click=" onAddPointBelow(index)"
                    >
                    <i
                        :style="combinedStyle([addElementButtonColor])"
                        :class="combinedClass([addElementButtonColor])"
                        class="fa-solid fa-2x fa-circle-plus"
                    />
                </button>
            </div>
        </div>
    </div>
</template>



<script setup>
import { toTitleCase, removeTrailingZeroes, processCoreTexts} from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>

export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localTexts = {};

        return {
            localTexts,
        }
    },
    watch: {
        modelValue(newValue, oldValue) {
            this.processLocalTexts()
        },
    },
    methods: {
        processLocalTexts() {
            this.localTexts = processCoreTexts(this.modelValue);
        },
    },
    computed: {

    },
    mounted() {
        this.processLocalTexts();
    },
}

</script>

<template>
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="CoreAdviserDetailOffCanvas" aria-labelledby="CoreAdviserDetailOffCanvasLabel">
    <div class="offcanvas-header">
        <button data-cy="CoreAdviseDetail-corner-close-modal-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreAdviserDetailOffCanvasCanvasClose"></button>
    </div>
    <div class="offcanvas-body">
        <div v-if="modelValue.magnetic.manufacturerInfo != null" class="row mx-1">
            <h3 class="col-12 p-0 m-0">{{modelValue.magnetic.manufacturerInfo.reference}}</h3>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreDescription}}</div>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.coreMaterial}}</div>
            <div class="col-12 fs-5 p-0 m-0 mt-2 text-start">{{localTexts.numberTurns}}</div>
            <div class="row mt-4 mb-2" v-for="(operationPoint, operationPointIndex) in modelValue.inputs.operatingPoints" :key="operationPointIndex">
                <div class="col-12 fs-5 p-0 m-0 my-1">{{operationPoint.name}}</div>
                <div v-if="'magnetizingInductanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductanceTable[operationPointIndex].text}}</div>
                <div v-if="'magnetizingInductanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.magnetizingInductanceTable[operationPointIndex].value}}</div>
                <div v-if="'coreLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreLossesTable[operationPointIndex].text}}</div>
                <div v-if="'coreLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreLossesTable[operationPointIndex].value}}</div>
                <div v-if="'coreTemperatureTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreTemperatureTable[operationPointIndex].text}}</div>
                <div v-if="'coreTemperatureTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.coreTemperatureTable[operationPointIndex].value}}</div>
                <div v-if="'dcResistanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.dcResistanceTable[operationPointIndex].text}}</div>
                <div v-if="'dcResistanceTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.dcResistanceTable[operationPointIndex].value}}</div>
                <div v-if="'windingLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.windingLossesTable[operationPointIndex].text}}</div>
                <div v-if="'windingLossesTable' in localTexts" class="col-6 p-0 m-0 border">{{localTexts.windingLossesTable[operationPointIndex].value}}</div>
            </div>
        </div>


        <div class="row">
            <label class="fs-5 mt-3 col-12">Distributors</label>

            <a v-for="(distributor, distributorIndex) in modelValue.magnetic.core.distributorsInfo" 
                :key="distributorIndex"
                :href="distributor.link" target="_blank" rel="noopener noreferrer" :data-cy="'CoreAdviseDetail-buy-' + distributorIndex + '-link'" class="offset-1 col-10 mt-1 text-primary float-start fs-5 px-4">{{}}{{'Buy it at ' + distributor.name + ((distributor.cost != null)? ' for $' + distributor.cost : '')}}</a>
        </div>
    </div>
</div>

</template>
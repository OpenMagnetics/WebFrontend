<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import VueNumberInput from '/src/components/VueNumberInput.vue';
import GapElement from '/src/components/Core/CoreGappingArtisan/GapElement.vue';
import * as Yup from 'yup';
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'

</script>
<script>
const schema = Yup.object().shape({
    gapType: Yup.string().required('Please, choose a type of gap'),
    numberGaps: Yup.number().required().typeError("The number of gaps cannot be empty. Choose residual instead").min(2).max(9).label("Number of distributed gaps"),
});

export default {
    props: {
        title: {
            type: String,
            required: true
        },
        index: {
            type: Number,
            required: true
        },
        imageFile: {
            type: String,
            required: true
        },
        columnData: {
            type: Object,
            required: true
        },
    },
    data() {
        const coreStore = useCoreStore();
        // console.log(Utils.deepCopy(this.columnData))
        var gapTypeSelected;
        var numberGapsSelected;
        var numberGaps;
        var auxDataToDetectCollisions;
        if (this.columnData == null || this.columnData['gapType'] == null) {
            gapTypeSelected = 'Residual'
            numberGapsSelected = 0
            numberGaps = 0
            auxDataToDetectCollisions = []
        }
        else {
            gapTypeSelected = this.columnData['gapType']
            numberGapsSelected = this.columnData['gaps'].length
            numberGaps = this.columnData['gaps'].length
            auxDataToDetectCollisions = Utils.deepCopy(this.columnData['gaps'])
        }
        coreStore.setDistributedGapAlreadyInUse(this.gapTypeSelected == 'Distributed' || coreStore.distributedGapAlreadyInUse)
        const previousGapType = null
        const gapErrors = ""
        const width = window.innerWidth;
        const recentChange = false;
        const tryingToSend = false;
        const outputData = [];
        const outputDataUnits = [];
        for (let i = 0; i < numberGaps; i++) {
            outputData.push({
                "permeance": null,
                "reluctance": null,
                "maximum_storable_energy": null,
                "fringing_factor": null
            })
            outputDataUnits.push({
                "permeance": "H",
                "reluctance": "H⁻¹",
                "maximum_storable_energy": "J",
                "fringing_factor": "%"
            })
        }
        return {
            coreStore,
            numberGapsSelected,
            gapTypeSelected,
            numberGaps,
            previousGapType,
            auxDataToDetectCollisions,
            gapErrors,
            width,
            recentChange,
            tryingToSend,
            outputData,
            outputDataUnits,
        }
    },
    watch: { 
        columnData: function(newVal, oldVal) {
            this.gapTypeSelected = this.columnData['gapType']
            this.auxDataToDetectCollisions = Utils.deepCopy(this.columnData['gaps'])
            this.updateColumnData()
            this.numberGaps = this.columnData['gaps'].length
            this.numberGapsSelected = this.columnData['gaps'].length
            if (this.numberGaps != this.outputData.length) {
                this.outputData = []
                this.outputDataUnits = []
                for (let i = 0; i < this.numberGaps; i++) {
                    this.outputData.push({
                        "permeance": null,
                        "reluctance": null,
                        "maximum_storable_energy": null,
                        "fringing_factor": null
                    })
                    this.outputDataUnits.push({
                        "permeance": "H",
                        "reluctance": "H⁻¹",
                        "maximum_storable_energy": "J",
                        "fringing_factor": "%"
                    })
                }
            }
            const aux = []
            this.columnData['gaps'].forEach((item) => {
                aux.push(item['height'])
            })
            this.updateAllGapHeights(aux)
            this.gapErrors = this.checkCollisions()
            this.recentChange = true
            this.tryToSend()
        },
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            if (this.index == 0) {
                relative_placement = 'bottom'
            }
            else if (this.index == 1) {
                relative_placement = 'left'
            }
            else if (this.index == 2) {
                relative_placement = 'right'
            }
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
        backgroundImage() {
            if (this.width < 1200) {
                return {}
            }
            else {
                return {
                    "background-image": `url(${this.imageFile}`,
                }
            }
        }
    },
    created () {
        window.addEventListener('resize', this.handleResize);
        // this.gapTypeSelected = this.columnData['gapType']
    },
    mounted () {
        this.coreStore.$onAction((action) => {
            if (action.name == "gapReluctanceModelChanged") {
                this.recentChange = true
                this.tryToSend();
            }
        })
    },
    methods: {
        compute_gap_reluctances() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_gap_reluctances'
            const data = {}
            data['gapping'] = this.$userStore.globalCore['functionalDescription']['gapping'];
            data['model'] = this.$userStore.selectedModels['gapReluctance']

            this.$axios.post(url, data)
            .then(response => {
                this.outputData = []
                this.outputDataUnits = []
                this.columnData['gaps'].forEach((item) => {
                    const datum = response.data[item['globalGapIndex']]
                    var aux = Utils.formatPermeance(datum['permeance'])
                    const permeance = Utils.removeTrailingZeroes(aux['label'], 2)
                    const permeanceUnit = aux['unit']
                    aux = Utils.formatReluctance(datum['reluctance'])
                    const reluctance = Utils.removeTrailingZeroes(aux['label'], 2)
                    const reluctanceUnit = aux['unit']
                    aux = Utils.formatEnergy(datum['maximum_storable_energy'])
                    const maximum_storable_energy = Utils.removeTrailingZeroes(aux['label'], 2)
                    const maximum_storable_energyUnit = aux['unit']
                    this.outputData.push({
                        "permeance": permeance,
                        "reluctance": reluctance,
                        "maximum_storable_energy": maximum_storable_energy,
                        "fringing_factor": Utils.removeTrailingZeroes((response.data[item['globalGapIndex']]["fringing_factor"] - 1) * 100, 1)
                    })
                    this.outputDataUnits.push({
                        "permeance": permeanceUnit,
                        "reluctance": reluctanceUnit,
                        "maximum_storable_energy": maximum_storable_energyUnit,
                        "fringing_factor": "%"
                    })
                })
            })
            .catch(error => {
                console.error("error in core_compute_gap_reluctances")
                console.error(error.data)
            });
        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError()) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.tryingToSend = false
                            this.compute_gap_reluctances()
                        }
                    }
                }
                , 500);
            }
        },
        handleResize() {
            this.width = window.innerWidth;
        },
        changeGlobalGapType(type) {
            this.columnData['gaps'].forEach((item) => {
                this.$userStore.globalCore['functionalDescription']['gapping'][item.globalGapIndex]['type'] = type
            })
        },
        addGaps(gapsToAdd) {
            for (let i = 0; i < gapsToAdd; i++) {
                const localGap = Utils.deepCopy(this.columnData['gaps'].at(-1))
                const globalGap = Utils.deepCopy(this.$userStore.globalCore['functionalDescription']['gapping'][localGap.globalGapIndex])
                localGap['globalGapIndex'] = this.$userStore.globalCore['functionalDescription']['gapping'].length
                localGap['length'] = globalGap['length']
                this.$userStore.globalCore['functionalDescription']['gapping'].push(globalGap)  // TODO: change height
                this.columnData['gaps'].push(localGap)  // TODO: change height
                this.outputData.push(this.outputData.at(-1))  // TODO: change height
                this.outputDataUnits.push(this.outputDataUnits.at(-1))  // TODO: change height
                this.auxDataToDetectCollisions.push(localGap)

            }
        },
        removeGaps(gapsToRemove) {
            for (let i = 0; i < gapsToRemove; i++) {
                const globalIndexToRemove = this.columnData['gaps'].at(-1)['globalGapIndex']
                this.columnData['gaps'].pop();
                this.outputData.pop();
                this.outputDataUnits.pop();
                this.auxDataToDetectCollisions.pop();
                this.$userStore.globalCore['functionalDescription']['gapping'].splice(globalIndexToRemove, 1)
            }
        },
        updateAllGapLengths(newLength) {
            this.columnData['gaps'].forEach((item) => {
                item['length'] = newLength
                this.$userStore.globalCore['functionalDescription']['gapping'][item['globalGapIndex']]['length'] = newLength
            })
        },
        updateAllGapHeights(newHeight) {
            const gapping = Utils.deepCopy(this.$userStore.globalCore['functionalDescription']['gapping'])
            this.columnData['gaps'].forEach((item, index) => {
                if (Array.isArray(newHeight)) {
                    item['height'] = newHeight[index]
                }
                else {
                    item['height'] = newHeight
                }
                gapping[item['globalGapIndex']]['coordinates'][1] = item['height']
            })
            this.$userStore.setGlobalCoreGapping(gapping)
        },
        onNumberGapsChange(event) {
            this.numberGapsSelected = Math.max(1, this.numberGapsSelected)
            if (this.numberGapsSelected > this.columnData['gaps'].length) {
                const gapsToAdd = this.numberGapsSelected - this.columnData['gaps'].length;
                this.addGaps(gapsToAdd)
            }
            else if (this.numberGapsSelected < this.columnData['gaps'].length && this.numberGapsSelected > 1){
                const gapsToRemove = this.columnData['gaps'].length - this.numberGapsSelected;
                this.removeGaps(gapsToRemove)
            }

            if (this.numberGapsSelected > 1) {
                this.numberGaps = this.numberGapsSelected
            }
            this.gapErrors = this.checkCollisions()
            this.recentChange = true
            this.tryToSend()
        },
        autoDistributeGaps(){
            var totalAvailableHeight = this.$userStore.globalCore['processedDescription']['columns'][this.index]['height']

            this.columnData['gaps'].forEach((item) => {
                totalAvailableHeight -= item['length']
            })

            const coreChunkSize = totalAvailableHeight / (this.columnData['gaps'].length + 1)
            var initialHeightPosition = this.$userStore.globalCore['processedDescription']['columns'][this.index]['height'] / 2

            initialHeightPosition -= coreChunkSize
            const aux = []
            this.columnData['gaps'].forEach((item) => {
                initialHeightPosition -= item['length'] / 2
                aux.push(Number(Utils.removeTrailingZeroes(Utils.roundWithDecimals(initialHeightPosition, 0.00001), 5)))
                initialHeightPosition -= item['length'] / 2 + coreChunkSize
            })

            this.recentChange = true
            this.tryToSend()

            return aux

        },
        updateColumnData() {
            if (this.gapTypeSelected != "Distributed") {
                if (this.previousGapType == "Distributed") {
                    this.coreStore.setDistributedGapAlreadyInUse(false)
                }
                const gapsToRemove = this.columnData['gaps'].length - 1;
                this.removeGaps(gapsToRemove)
                if (this.gapTypeSelected == "Residual") {
                    this.changeGlobalGapType('residual')
                    if (this.previousGapType == "Distributed") {
                        this.numberGaps = 1
                        this.numberGapsSelected = 1
                    }
                    this.updateAllGapLengths(Defaults.engineConstants['residualGap'])
                    this.updateAllGapHeights(0)
                }
                else if  (this.gapTypeSelected == "Spacer") {
                    this.changeGlobalGapType('additive')
                    if (this.previousGapType != null) {
                        if (this.previousGapType == "Distributed") {
                            this.numberGaps = 1
                            this.numberGapsSelected = 1
                        }
                        else if (this.previousGapType == "Residual") {
                            this.updateAllGapLengths(Defaults.engineConstants['minimumNonResidualGap'])
                        }
                    }
                    this.updateAllGapHeights(0)
                }
                else {
                    this.changeGlobalGapType('subtractive')
                    if (this.previousGapType != null) {
                        if (this.previousGapType == "Distributed") {
                            this.numberGaps = 1
                            this.numberGapsSelected = 1
                        }
                        else if (this.previousGapType == "Residual") {
                            this.updateAllGapLengths(Defaults.engineConstants['minimumNonResidualGap'])
                        }
                    }
                }
            }
            else {
                this.coreStore.setDistributedGapAlreadyInUse(true)
                this.changeGlobalGapType('subtractive')
                if (this.previousGapType == "Residual") {
                    this.updateAllGapLengths(Defaults.engineConstants['minimumNonResidualGap'])
                }
                if (this.previousGapType != null && this.previousGapType != "Distributed") {
                    this.numberGaps = 3
                    this.numberGapsSelected = 3
                }
            }
            this.onNumberGapsChange()
            if (this.gapTypeSelected == "Distributed" && this.previousGapType != null){
                this.updateAllGapHeights(this.autoDistributeGaps())
            }
            this.previousGapType = this.columnData['gapType']
        },
        onGapTypeChange(event) {
            this.$emit("gapTypeChanged", this.gapTypeSelected, this.index)
        },
        checkCollisions() {
            const columnHeight = this.$userStore.globalCore['processedDescription']['columns'][this.index]['height']

            const gapLimits = []
            const gapErrors = []
            this.auxDataToDetectCollisions.forEach((item, index) => {
                gapLimits.push({
                    topHeight: item['height'] + item['length'] / 2,
                    bottomHeight: item['height'] - item['length'] / 2,
                })                
            })
            gapLimits.forEach((comparedItem, comparedIndex) => {
                gapErrors.push('')
                if (comparedItem['topHeight'] > (columnHeight / 2)) {
                    gapErrors[comparedIndex] = `Gap is too high, it is overlapping with top plate by ${Utils.removeTrailingZeroes(Utils.roundWithDecimals((comparedItem['topHeight'] - columnHeight / 2) * 1000, 0.01), 2)} mm`
                }
                else if (comparedItem['bottomHeight'] < -(columnHeight / 2)) {
                    gapErrors[comparedIndex] = `Gap is too low, it is overlapping with bottom plate by ${Utils.removeTrailingZeroes(Utils.roundWithDecimals((Math.abs(comparedItem['bottomHeight']) - (columnHeight / 2)) * 1000, 0.01), 2)} mm`
                }
                else {
                    gapLimits.forEach((comparingItem, comparingIndex) => {
                        if (comparedIndex != comparingIndex){
                            if ((comparedItem['topHeight'] >= comparingItem['bottomHeight']) && (comparedItem['bottomHeight'] <= comparingItem['bottomHeight'])){
                                gapErrors[comparedIndex] = `Gap is too high, it is overlapping with another gap by ${Utils.removeTrailingZeroes(Utils.roundWithDecimals((comparedItem['topHeight'] - comparingItem['bottomHeight']) * 1000, 0.01), 2)} mm`
                            }
                            else if ((comparedItem['bottomHeight'] <= comparingItem['topHeight']) && (comparedItem['topHeight'] >= comparingItem['topHeight'])){
                                gapErrors[comparedIndex] = `Gap is too low, it is overlapping with another gap by ${Utils.removeTrailingZeroes(Utils.roundWithDecimals(Math.abs(comparedItem['bottomHeight'] - comparingItem['topHeight']) * 1000, 0.01), 2)} mm`
                            }
                        }
                    })          
                }
            })
            return gapErrors
        },
        hasError() {
            var hasError = false
            for (let i = 0; i < this.gapErrors.length; i++) {
                hasError ||= this.gapErrors[i] != ''
            }
            return hasError
        },
        onGapLengthChange(newValue, gapIndex) {
            this.auxDataToDetectCollisions[gapIndex]['length'] = newValue
            this.gapErrors = this.checkCollisions()
            if (!this.hasError() && this.$userStore.globalCore['functionalDescription']['gapping'].length > 0) {
                this.recentChange = true
                this.$userStore.globalCore['functionalDescription']['gapping'][this.columnData['gaps'][gapIndex]['globalGapIndex']]['length'] = newValue
                this.tryToSend()
            }
            if  (this.gapTypeSelected == "Spacer") {
                this.coreStore.updateAllLengths(newValue)
                    this.$emit("onGapLengthChange", newValue / 1000, this.gapIndex)
            }
            this.$emit("onGappingChange")
        },
        onGapHeightChange(newValue, gapIndex) {
            this.auxDataToDetectCollisions[gapIndex]['height'] = newValue
            this.gapErrors = this.checkCollisions()
            if (!this.hasError() && this.$userStore.globalCore['functionalDescription']['gapping'].length > 0) {
                this.recentChange = true
                this.$userStore.globalCore['functionalDescription']['gapping'][this.columnData['gaps'][gapIndex]['globalGapIndex']]['coordinates'][1] = newValue
                this.$userStore.globalCore['functionalDescription']['gapping'][this.columnData['gaps'][gapIndex]['globalGapIndex']]['distanceClosestNormalSurface'] = this.$userStore.globalCore['processedDescription']['columns'][this.index]['height'] / 2 - Math.abs(newValue)
                this.tryToSend()
                    this.$emit("onGapLengthChange", newValue / 1000, this.gapIndex)
            }
            this.$emit("onGappingChange")
        },
    }
}
</script>

<template>
    <div v-tooltip="styleTooltip" class="container">
        <label class="text-white fs-4 text-center ">{{title}}</label>

        <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
            <label v-tooltip="'Type of the gaps in the column'" class="small-text mt-2 col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start">Gap type:</label>
            <Field name="gapType" as="select" :class="{ 'is-invalid': errors.gapType }" @change="onGapTypeChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-7 col-lg-7 col-xl-7" v-model="gapTypeSelected">
                <option disabled value="">Please select one</option>
                <option value="Residual">Residual</option>
                <option value="Spacer">Spacer</option>
                <option value="Grinded">Grinded</option>
                <option :disabled="coreStore.distributedGapAlreadyInUse && gapTypeSelected != 'Distributed'" value="Distributed">{{coreStore.distributedGapAlreadyInUse && gapTypeSelected != 'Distributed'? 'Distributed (only one allowed)' : 'Distributed'}}</option>
            </Field>
            <label v-if="gapTypeSelected == 'Distributed'" class="small-text col-sm-4 col-md-5 col-lg-5 col-xl-5 text-start mt-2">No. gaps:</label>
            <Field v-if="gapTypeSelected == 'Distributed'" name="numberGaps" type="number" @change="onNumberGapsChange" :class="{ 'is-invalid': errors.numberGaps }" class="rounded-2 bg-light text-white col-sm-8 col-md-4 col-lg-4 col-xl-4 float-end mt-2" value=3 v-model="numberGapsSelected"/>

            <button v-if="gapTypeSelected == 'Distributed'" v-tooltip="'Automatically distribute the gaps in this column'" :disabled="numberGaps < 2" :id="'autoPlaceGaps' + index" :ref="'autoPlaceGaps' + index" class="offset-1 col-2 py-0 mt-2 bg-primary submit-btn btn" type="button" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Auto place gaps" @click="updateAllGapHeights(autoDistributeGaps())">
                <i class="fa-solid fa-wand-sparkles"></i></button>
            <div v-else style="height: 38px;" ></div>
            <div></div>
            <div class="invalid-feedback">{{errors.numberGaps}}</div>
            <div class="invalid-feedback">{{errors.gapType}}</div>
            <div class="mt-3"></div>
            <div class="column-container p-0 m-0" :style="backgroundImage">

            <GapElement class="mt-3" @onGapLengthChange="onGapLengthChange" @onGapHeightChange="onGapHeightChange"
                v-for="gapIndex in Number(numberGaps)"
                    :key="gapIndex - 1"
                    :heightEnabled="gapTypeSelected != 'Spacer' && gapTypeSelected != 'Residual'"
                    :lengthEnabled="gapTypeSelected != 'Residual'"
                    :columnIndex="index"
                    :gapLength="columnData['gaps'][gapIndex - 1]['length']"
                    :gapHeight="columnData['gaps'][gapIndex - 1]['height']"
                    :globalGapIndex="columnData['gaps'][gapIndex - 1]['globalGapIndex']"
                    :gapIndex="Number(gapIndex - 1)">
                <template #overlappingError>
                    {{gapErrors[gapIndex - 1]}}
                </template>
                <template #reluctance>
                    {{outputData[gapIndex - 1]['reluctance'] + " " + outputDataUnits[gapIndex - 1]['reluctance']}}
                </template>
                <template #permeance>
                    {{outputData[gapIndex - 1]['permeance'] + " " + outputDataUnits[gapIndex - 1]['permeance']}}
                </template>
                <template #maximumEnergy>
                    {{outputData[gapIndex - 1]['maximum_storable_energy'] + " " + outputDataUnits[gapIndex - 1]['maximum_storable_energy']}}
                </template>
                <template #fringingFactor>
                    {{outputData[gapIndex - 1]['fringing_factor'] + " " + outputDataUnits[gapIndex - 1]['fringing_factor']}}
                </template>
            </GapElement>
            </div>

        </Form>
    </div>
</template>

<style>
@media (min-width: 1200px) {
    .column-container {
        background-size: 100%; 
        background-repeat: no-repeat;
        background-position: center top;
        height: auto;
        min-height: 52vh;
    }
}
.custom-tooltip {
    --bs-tooltip-bg: var(--bs-primary);
}
</style>
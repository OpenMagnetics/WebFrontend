<script setup>
import { computed, ref, onMounted, inject } from 'vue';
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import TextInput from '/src/components/User/TextInput.vue';
import { useCoreStore } from '/src/stores/core'
import VueNumberInput from '/src/components/VueNumberInput.vue';
import * as Utils from '/src/assets/js/utils.js'

</script>

<script>

export default {
    components: {
        VueNumberInput
    },
    data() {
        const posting = false;
        const coreStore = useCoreStore();
        const familyLabelSelected = null
        const subtypeLabelSelected = null
        const dimensionsLabel = null
        var familiesData = null
        const subtypeLabels = []
        const dimensionsValueInMm = {}
        const isDataDirty = false
        const loadingStandardCore = false
        var errors = {}
        var hasError = false
        var hasFreeCADError = false
        var tryingToSend = false;
        var recentChange = false
        var shapeName = "Custom"

        return {
            posting,
            coreStore,
            familyLabelSelected,
            subtypeLabelSelected,
            dimensionsLabel,
            familiesData,
            subtypeLabels,
            dimensionsValueInMm,
            isDataDirty,
            loadingStandardCore,
            errors,
            hasError,
            hasFreeCADError,
            recentChange,
            tryingToSend,
            shapeName,
        }
    },
    methods: {
        setCoreShapeName(name, override) {
            if (!this.loadingStandardCore || override) {
                this.shapeName = name
                this.$userStore.setGlobalCoreShapeName(name)
            }
        },
        getTechnicalDrawing(dimensionsValueInM) {
            const data = {
                'aliases': [],
                'dimensions': dimensionsValueInM,
                'family': this.familyLabelSelected,
                'familySubtype': this.subtypeLabelSelected,
                'name': this.shapeName,
                'type': this.shapeName == "Custom"? 'custom' : 'standard'
            }
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_technical_drawing'

            this.$axios.post(url, data)
            .then(response => {
                this.coreStore.setTechnicalDrawing(response.data)
            })
            .catch(error => { 
                console.error(error.data)
            });
        },
        computePiece3DModel() {
            if (!this.posting) {
                this.posting = true
                this.fix_optional_missing()
                const dimensionsValueInM = {}
                for (const [key, value] of Object.entries(this.dimensionsValueInMm)) {
                    dimensionsValueInM[key] = value / 1000
                }
                const data = {
                    'aliases': [],
                    'dimensions': dimensionsValueInM,
                    'family': this.familyLabelSelected,
                    'familySubtype': this.subtypeLabelSelected,
                    'name': this.shapeName,
                    'type': this.shapeName == "Custom"? 'custom' : 'standard'
                }
                const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_shape'

                this.hasFreeCADError = false
                this.coreStore.requestingNewShape()
                this.$axios.post(url, data)
                .then(response => {
                    const globalCore = this.$userStore.globalCore
                    globalCore['functionalDescription']['shape'] = data
                    this.$userStore.setGlobalCoreAlt(globalCore)
                    this.posting = false
                    this.isDataDirty = false
                    this.coreStore.setStreamedObj(response.data)
                    this.getTechnicalDrawing(dimensionsValueInM)
                    Utils.getCoreParameters(this.$userStore, () => {this.loadingStandardCore = false;}, () => {this.loadingStandardCore = false;})
                })
                .catch(error => {
                    this.posting = false
                    this.isDataDirty = false
                    this.hasFreeCADError = true
                });
            }
        },
        computeCore3DModel() {
            if (!this.posting) {
                this.posting = true
                this.fix_optional_missing()
                const dimensionsValueInM = {}
                for (const [key, value] of Object.entries(this.dimensionsValueInMm)) {
                    dimensionsValueInM[key] = value / 1000
                }
                const data = {
                    'aliases': [],
                    'dimensions': dimensionsValueInM,
                    'family': this.familyLabelSelected,
                    'familySubtype': this.subtypeLabelSelected,
                    'name': this.shapeName,
                    'type': this.shapeName == "Custom"? 'custom' : 'standard'
                }
                const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model'

                this.hasFreeCADError = false
                const globalCore = this.$userStore.globalCore
                globalCore['functionalDescription']['shape'] = data

                this.coreStore.requestingNewShape()
                this.$axios.post(url, globalCore)
                .then(response => {
                    const globalCore = this.$userStore.globalCore
                    globalCore['functionalDescription']['shape'] = data
                    this.$userStore.setGlobalCoreAlt(globalCore)
                    this.posting = false
                    this.isDataDirty = false
                    this.coreStore.setStreamedObj(response.data)
                    this.getTechnicalDrawing(dimensionsValueInM)
                    Utils.getCoreParameters(this.$userStore, () => {this.loadingStandardCore = false;}, () => {this.loadingStandardCore = false;})
                })
                .catch(error => {
                    this.posting = false
                    this.isDataDirty = false
                    this.hasFreeCADError = true
                });
            }
        },
        computeShape() {
            if (this.coreStore.fullCoreModel) {
                this.computeCore3DModel()
            }
            else {
                this.computePiece3DModel()
            }
        },
        onInvalidSubmit() {
        },
        onDimensionUpdate(name, newValue, oldValue) {
            this.hasFreeCADError = false
            this.recentChange = true
            this.isDataDirty = true
            this.setCoreShapeName("Custom")
            this.dimensionsValueInMm[name] = newValue
            this.tryToSend()

        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.tryingToSend = false
                            this.computeShape()
                        }
                    }
                }
                , 500);
            }
        },
        // onFamilyChange(event) {
        //     this.errors = {}
        //     this.hasFreeCADError = false
        //     this.isDataDirty = true
        //     this.setCoreShapeName("Custom")
        //     const family = event.target.value
        //     this.subtypeLabels = Object.keys(this.familiesData[family])
        //     if (this.subtypeLabels.length == 1) {
        //         this.dimensionsLabel = this.familiesData[family][this.subtypeLabels[0]]
        //     }
        //     else {
        //         this.dimensionsLabel = null
        //     }
        // },
        onSubtypeChange(event) {
            this.errors = {}
            this.hasFreeCADError = false
            this.isDataDirty = true
            this.setCoreShapeName("Custom")
            this.dimensionsLabel = this.familiesData[this.familyLabelSelected][event.target.value]
        },
        loadCommercialShape(data) {
            this.loadingStandardCore = true
            this.errors = {}
            this.familyLabelSelected = data['family'].toLowerCase()
            const name = data['name']
            
            this.subtypeLabels = Object.keys(this.familiesData[data['family'].toLowerCase()])
            if ('familySubtype' in data && data['familySubtype'] != null) {
                this.subtypeLabelSelected = data['familySubtype']
            }
            else {
                this.subtypeLabelSelected = 1
            }

            this.dimensionsLabel = Object.values(this.familiesData[this.familyLabelSelected][this.subtypeLabelSelected])

            this.dimensionsValueInMm = {}
            for (const [key, value] of Object.entries(data['dimensions'])) {
                if (this.dimensionsLabel.includes(key)) {
                    this.dimensionsValueInMm[key] = Number(Utils.removeTrailingZeroes(value * 1000, 1))
                }
            }
            setTimeout(() => this.setCoreShapeName(name, true), 100);
        },
        fix_optional_missing() {
            if (this.dimensionsValueInMm['G'] == null || isNaN(this.dimensionsValueInMm['G'])) {
                this.dimensionsValueInMm['G'] = 0
            }
            if (this.dimensionsValueInMm['H'] == null || isNaN(this.dimensionsValueInMm['H'])) {
                this.dimensionsValueInMm['H'] = 0
            }
            if (this.dimensionsValueInMm['C'] == null || isNaN(this.dimensionsValueInMm['C'])) {
                this.dimensionsValueInMm['C'] = 0
            }
        },
        onLoadCommercialShape(data) {
        }
    },
    computed: {
        styleTopLabelTooltip() {
            var relative_placement;
            relative_placement = 'bottom'
            return {
                    text: "Select a commercial shape in order to start customizing",
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
        styleRightTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
        computeColor() {
            if (this.isDataDirty) {
                return "btn-success text-light"
            }
            else if (this.hasFreeCADError){
                return "btn-danger text-light"
            } else {
                return "btn-light text-primary"
            }
        },
        errorMessages() {
            const messages = {}
            this.dimensionsLabel.forEach((name) => {
                this.errors[name] = false
                if (this.dimensionsValueInMm[name] == null) {
                    if (name == 'G' || name == 'H') {
                        this.dimensionsValueInMm[name] = 0
                    }
                    else {
                        this.errors[name] = true
                        messages[name] = name + ' cannot be empty'
                    }
                }
                else if (this.dimensionsValueInMm[name] == 0) {
                    if ((name != 'H' || this.familyLabelSelected.toLowerCase() == 'ur') &&
                        (name != 'G') &&
                        (name == 'C' && this.familyLabelSelected.toLowerCase() != 'p')) {
                        this.errors[name] = true
                        messages[name] = name + ' must be greater than 0'
                    }
                }
                else {
                    if (name == 'B'){
                        if (this.dimensionsValueInMm['D'] >= this.dimensionsValueInMm['B']){
                            this.errors[name] = true
                            messages[name] = 'B must be greater than D'
                        }
                    }
                    else if (name == 'D'){
                        if (this.dimensionsValueInMm['D'] >= this.dimensionsValueInMm['B']){
                            this.errors[name] = true
                            messages[name] = 'D must be smaller than B'
                        }
                    }

                    if (name == 'A'){
                        if (this.dimensionsValueInMm['E'] >= this.dimensionsValueInMm['A']){
                            this.errors[name] = true
                            messages[name] = 'A must be greater than E'
                        }
                    }
                    else if (name == 'E'){
                        if (this.dimensionsValueInMm['E'] >= this.dimensionsValueInMm['A']){
                            this.errors[name] = true
                            messages[name] = 'E must be smaller than A'
                        }
                    }

                    if (name == 'E'){
                        if (this.dimensionsValueInMm['F'] >= this.dimensionsValueInMm['E']){
                            this.errors[name] = true
                            messages[name] = 'E must be greater than F'
                        }
                    }
                    else if (name == 'F'){
                        if (this.dimensionsValueInMm['F'] >= this.dimensionsValueInMm['E']){
                            this.errors[name] = true
                            messages[name] = 'F must be smaller than E'
                        }
                    }

                    if (name == 'E'){
                        if (this.dimensionsValueInMm['G'] >= this.dimensionsValueInMm['E']){
                            this.errors[name] = true
                            messages[name] = 'E must be greater than G'
                        }
                    }
                    else if (name == 'G'){
                        if (this.dimensionsValueInMm['G'] >= this.dimensionsValueInMm['E']){
                            this.errors[name] = true
                            messages[name] = 'G must be smaller than E'
                        }
                    }

                    if (this.familyLabelSelected.toLowerCase() == "er") {
                        if (this.dimensionsValueInMm['G'] > 0) {
                            if (name == 'F'){
                                if (this.dimensionsValueInMm['G'] < this.dimensionsValueInMm['F']){
                                    this.errors[name] = true
                                    messages[name] = 'F must be smaller than G'
                                }
                            }
                            else if (name == 'G'){
                                if (this.dimensionsValueInMm['G'] < this.dimensionsValueInMm['F']){
                                    this.errors[name] = true
                                    messages[name] = 'G must be greater than F'
                                }
                            }
                        }
                    }

                    if (!(this.familyLabelSelected.toLowerCase() == "rm" && this.subtypeLabelSelected == 2) && !(this.familyLabelSelected.toLowerCase() == "p" && this.subtypeLabelSelected != 2) && !(this.familyLabelSelected.toLowerCase() == "efd") && !(this.familyLabelSelected.toLowerCase() == "ut") && this.dimensionsValueInMm['C'] > 0) {
                        var c_f_condition = false
                        if (this.familyLabelSelected.toLowerCase() != "er" && this.familyLabelSelected.toLowerCase() != "e" && this.familyLabelSelected.toLowerCase() != "etd" && this.familyLabelSelected.toLowerCase() != "ec") {
                            c_f_condition = this.dimensionsValueInMm['F'] >= this.dimensionsValueInMm['C']
                        }
                        else {
                            c_f_condition = this.dimensionsValueInMm['F'] > this.dimensionsValueInMm['C']
                        }
                        if (name == 'C'){
                            if (c_f_condition){
                                this.errors[name] = true
                                messages[name] = 'C must be greater than F'
                            }
                        }
                        else if (name == 'F'){
                            if (c_f_condition){
                                this.errors[name] = true
                                messages[name] = 'F must be smaller than C'
                            }
                        }
                    }

                    if (name == 'J'){
                        if (this.dimensionsValueInMm['E'] > this.dimensionsValueInMm['J']){
                            this.errors[name] = true
                            messages[name] = 'J must be greater than E'
                        }
                    }
                    else if (name == 'E'){
                        if (this.dimensionsValueInMm['E'] > this.dimensionsValueInMm['J']){
                            this.errors[name] = true
                            messages[name] = 'E must be smaller than J'
                        }
                    }
                    if (this.familyLabelSelected.toLowerCase() !== "efd" && this.familyLabelSelected.toLowerCase() !== "epx") {
                        if (name == 'K'){
                            if (this.dimensionsValueInMm['F'] / 2 > this.dimensionsValueInMm['K']){
                                this.errors[name] = true
                                messages[name] = 'K must be greater than F/2'
                            }
                            else if (this.dimensionsValueInMm['F'] / 2 + this.dimensionsValueInMm['K'] > this.dimensionsValueInMm['C'] ){
                                this.errors[name] = true
                                messages[name] = 'C must be greater than F/2 + K'
                            }
                        }
                    }
                }
            })
            this.hasError = Object.keys(messages).length > 0
            return messages
        },

    },
    mounted() {

        const url = import.meta.env.VITE_API_ENDPOINT + '/core_get_families'
        this.$axios.post(url, {})
        .then(response => {
            this.familiesData = response.data["families"]

            this.familyLabelSelected = this.$userStore.globalCore['functionalDescription']['shape']['family']
            this.subtypeLabels = Object.keys(this.familiesData[this.familyLabelSelected.toLowerCase()])
            if ('familySubtype' in this.$userStore.globalCore['functionalDescription']['shape'] && this.$userStore.globalCore['functionalDescription']['shape']['familySubtype'] != null) {
                this.subtypeLabelSelected = this.$userStore.globalCore['functionalDescription']['shape']['familySubtype']
            }
            else {
                this.subtypeLabelSelected = 1
            }
            this.dimensionsLabel = Object.values(this.familiesData[this.familyLabelSelected][this.subtypeLabelSelected])

            this.dimensionsValueInMm = {}
            for (const [key, value] of Object.entries(this.$userStore.globalCore['functionalDescription']['shape']['dimensions'])) {
                if (this.dimensionsLabel.includes(key)) {
                    this.dimensionsValueInMm[key] = Number(Utils.removeTrailingZeroes(Utils.resolveDimensionalValues(value) * 1000, 1))
                }
            }

        })
        .catch(error => {
            console.error("error families")
        });

        this.coreStore.$onAction((action) => {
            this.recentChange = true
            if (action.name == "setFullCoreModel") {
                 setTimeout(() => this.tryToSend(), 10);
            }
            if (action.name == "quickGappingChanged") {
                 setTimeout(() => this.tryToSend(), 10);
            }
        })

        this.$userStore.$onAction((action) => {
            this.recentChange = true
            if (action.name == "setGlobalCoreShape") {
                 this.loadCommercialShape(action.args[0])
            }
        })
        this.loadingStandardCore = true

        const name = this.$userStore.globalCore['functionalDescription']['shape']['name']
        setTimeout(() => this.setCoreShapeName(name, true), 100);
    },
}

</script>

<template>
    <div class="bg-light rounded-3 px-1 border border-primary">
        <Form v-tooltip="styleRightTooltip" ref=formRef @submit="computeShape" @invalid-submit="onInvalidSubmit" class="pb-1">
            <!--         <Field name="familiesSelect" ref="familiesRef" as="select" style="width: 100%" @change="onFamilyChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="familyLabelSelected">
                <option disabled value="">Please select one family</option>
                <option v-for="item, index in familiesLabels"
                        :value="item"
                >{{item.toUpperCase()}}</option>
            </Field> -->
            <label v-tooltip="styleTopLabelTooltip" class="fs-5 mb-1 text-white text-center col-12">Customize shape</label> 

            <label v-tooltip="'A subtype represents the different variations inside a family'" class="fs-6 mb-2 ps-2 text-white text-start col-8">Subtype </label>
            <Field v-if="subtypeLabels.length > 1" name="subtypeSelect" ref="subtypeRef" as="select" style="width: 30%" @change="onSubtypeChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="subtypeLabelSelected">>
                <option disabled value="">Please select one sub type</option>
                <option v-for="item, index in subtypeLabels"
                        :value="item"
                >{{item.toUpperCase()}}</option>
            </Field>
            <div v-for="value, key in dimensionsLabel" class="form-inline container">
                <div class="row my-1">
                    <label class="text-white col-2 pt-1">{{value}}</label>
                    <vue-number-input inline controls class="offset-1 col-9 bg-dark text-primary"
                        :modelValue="dimensionsValueInMm[value]"
                        @update:model-value="onDimensionUpdate"
                        :size="'small'"
                        :name="value"
                        :center="true"
                        :min="value != 'K'? 0: -1000"
                        :step="0.1"
                        :max="1000">
                        </vue-number-input>
                    <label class="text-danger col-12 pt-1" style="font-size: 0.7em">{{errorMessages[value]}}</label>
                </div>
            </div>

            <button v-tooltip="hasError || hasFreeCADError? 'There is an error in your dimensions and the shape cannot be computed. Please, fix it or reload a commercial shape to continue.' : 'Computes your dimensions'" v-if="!posting" :disabled="hasError" :class="computeColor" class="submit-btn btn mt-2 fs-6" type="submit">Compute shape</button>
            <button v-tooltip="'Opens the commercial shape menu and allows you to choose a different family to modify.'" v-if="!posting" class="submit-btn btn btn-primary mt-2 fs-6" data-bs-toggle="modal" data-bs-target="#loadCommercialShapeModal">Load commercial shape</button>
            <img v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">
        </Form>
    </div>
  <div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
}


form {
  width: 100%;
  margin: 0px auto;
  padding-bottom: 60px;
}

.submit-btn {
  outline: none;
  border: none;
  font-size: 18px;
  padding: 10px 15px;
  display: block;
  width: 100%;
  border-radius: 7px;
  margin-top: 40px;
  transition: transform 0.3s ease-in-out;
  cursor: pointer;
}

.submit-btn.invalid {
  animation: shake 0.5s;
  /* When the animation is finished, start again */
  animation-iteration-count: infinite;
}

@keyframes shake {
  0% {
    transform: translate(1px, 1px);
  }
  10% {
    transform: translate(-1px, -2px);
  }
  20% {
    transform: translate(-3px, 0px);
  }
  30% {
    transform: translate(3px, 2px);
  }
  40% {
    transform: translate(1px, -1px);
  }
  50% {
    transform: translate(-1px, 2px);
  }
  60% {
    transform: translate(-3px, 1px);
  }
  70% {
    transform: translate(3px, 1px);
  }
  80% {
    transform: translate(-1px, -1px);
  }
  90% {
    transform: translate(1px, 2px);
  }
  100% {
    transform: translate(1px, -2px);
  }
}

.submit-btn:hover {
  transform: scale(1.1);
}
</style>

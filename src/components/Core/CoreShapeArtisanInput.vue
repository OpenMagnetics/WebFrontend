<script setup>
import { defineProps, computed, ref, onMounted, inject } from 'vue';
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import TextInput from '/src/components/User/TextInput.vue';
import axios from "axios";
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'
import VueNumberInput from '/src/components/VueNumberInput.vue';
import CoreLoadCommercialShape from '/src/components/Core/CoreLoadCommercialShape.vue';
import * as Utils from '/src/assets/js/utils.js'

</script>

<script>

export default {
    components: {
        VueNumberInput
    },
    data() {
        const posting = false;
        const userStore = useUserStore();
        const coreStore = useCoreStore();
        const familyLabelSelected = null
        const subtypeLabelSelected = null
        const dimensionsLabel = null
        var familiesData = null
        const familiesLabels = []
        const subtypeLabels = []
        const dimensionsValueInMm = {}
        const isDataDirty = false
        var hasError = {}

        return {
            posting,
            userStore,
            coreStore,
            familyLabelSelected,
            subtypeLabelSelected,
            dimensionsLabel,
            familiesData,
            familiesLabels,
            subtypeLabels,
            dimensionsValueInMm,
            isDataDirty,
            hasError,
        }
    },
    methods: {
        onSubmit() {
            var hasError = false
            for (const [key, value] of Object.entries(this.hasError)) {
                hasError |= value
            }
            const dimensionsValueInM = {}
            for (const [key, value] of Object.entries(this.dimensionsValueInMm)) {
                dimensionsValueInM[key] = value / 1000
            }
            const data = {
                'aliases': [],
                'dimensions': dimensionsValueInM,
                'family': this.familyLabelSelected,
                'familySubtype': this.subtypeLabelSelected,
                'name': 'Custom',
                'type': 'custom'
            }
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_shape'

            const globalCore = this.userStore.globalCore
            globalCore['functionalDescription']['shape'] = data
            this.userStore.setGlobalCore(globalCore)
            console.log(this.userStore.globalCore)

            axios.post(url, data)
            .then(response => {
                this.coreStore.setStreamedObj(response.data)
            })
            .catch(error => {
                console.log(error.data)
            });

        },
        onInvalidSubmit() {
        },
        onDimensionUpdate(name, newValue, oldValue) {
            this.isDataDirty = true
            this.dimensionsValueInMm[name] = newValue
        },
        onFamilyChange(event) {
            this.hasError = {}
            this.isDataDirty = true
            const family = event.target.value
            this.subtypeLabels = Object.keys(this.familiesData[family])
            if (this.subtypeLabels.length == 1) {
                this.dimensionsLabel = this.familiesData[family][this.subtypeLabels[0]]
            }
            else {
                this.dimensionsLabel = null
            }
        },
        onsubtypeChange(event) {
            this.hasError = {}
            this.isDataDirty = true
            this.dimensionsLabel = this.familiesData[this.familyLabelSelected][event.target.value]
        },
        onLoadCommercialShape(data) {
            this.hasError = {}
            this.familyLabelSelected = data['family'].toLowerCase()
            this.subtypeLabels = Object.keys(this.familiesData[data['family'].toLowerCase()])
            if ('familySubtype' in data) {
                this.subtypeLabelSelected = data['familySubtype']
            }
            this.dimensionsLabel = []
            this.dimensionsValueInMm = {}
            for (const [key, value] of Object.entries(data['dimensions'])) {
                this.dimensionsLabel.push(key)
                this.dimensionsValueInMm[key] = Number(Utils.removeTrailingZeroes(value * 1000, 1))
            }
        },
        messageDimension(name) {
            this.hasError[name] = false
            if (this.dimensionsValueInMm[name] == null) {
                this.hasError[name] = true
                return name + ' cannot be empty'
            }
            else if (this.dimensionsValueInMm[name] == 0 && name != 'H'){
                this.hasError[name] = true
                return name + ' must greater than 0'
            }
            else {
                if (name == 'B'){
                    if (this.dimensionsValueInMm['D'] >= this.dimensionsValueInMm['B']){
                        this.hasError[name] = true
                        return 'B must greater than D'
                    }
                }
                else if (name == 'D'){
                    if (this.dimensionsValueInMm['D'] >= this.dimensionsValueInMm['B']){
                        this.hasError[name] = true
                        return 'D must smaller than B'
                    }
                }

                if (name == 'A'){
                    if (this.dimensionsValueInMm['E'] >= this.dimensionsValueInMm['A']){
                        this.hasError[name] = true
                        return 'A must greater than E'
                    }
                }
                else if (name == 'E'){
                    if (this.dimensionsValueInMm['E'] >= this.dimensionsValueInMm['A']){
                        this.hasError[name] = true
                        return 'E must smaller than A'
                    }
                }

                if (name == 'E'){
                    if (this.dimensionsValueInMm['F'] >= this.dimensionsValueInMm['E']){
                        this.hasError[name] = true
                        return 'E must greater than F'
                    }
                }
                else if (name == 'F'){
                    if (this.dimensionsValueInMm['F'] >= this.dimensionsValueInMm['E']){
                        this.hasError[name] = true
                        return 'F must smaller than E'
                    }
                }

                if (name == 'E'){
                    if (this.dimensionsValueInMm['G'] >= this.dimensionsValueInMm['E']){
                        this.hasError[name] = true
                        return 'E must greater than G'
                    }
                }
                else if (name == 'G'){
                    if (this.dimensionsValueInMm['G'] >= this.dimensionsValueInMm['E']){
                        this.hasError[name] = true
                        return 'G must smaller than E'
                    }
                }

                if (name == 'C'){
                    if (this.dimensionsValueInMm['F'] > this.dimensionsValueInMm['C']){
                        this.hasError[name] = true
                        return 'C must Freater than F'
                    }
                }
                else if (name == 'F'){
                    if (this.dimensionsValueInMm['F'] > this.dimensionsValueInMm['C']){
                        this.hasError[name] = true
                        return 'F must smaller than C'
                    }
                }
            }
        },

    },
    computed: {
        computeColor() {
            if (this.isDataDirty) {
                return "btn-success text-light"
            }
            else {
                return "btn-light text-primary"
            }
        }
    },
    mounted() {
        const url = import.meta.env.VITE_API_ENDPOINT + '/core_get_families'
        axios.post(url, {})
        .then(response => {
            this.familiesData = response.data["families"]
            this.familiesLabels = Object.keys(this.familiesData)

            this.familyLabelSelected = this.userStore.globalCore['functionalDescription']['shape']['family']
            console.log(this.userStore.globalCore)
            this.subtypeLabels = Object.keys(this.familiesData[this.familyLabelSelected.toLowerCase()])
            console.log(this.subtypeLabels)
            if ('familySubtype' in this.userStore.globalCore['functionalDescription']['shape']) {
                this.subtypeLabelSelected = this.userStore.globalCore['functionalDescription']['shape']['familySubtype']
            }

            this.dimensionsValueInMm = {}
            for (const [key, value] of Object.entries(this.userStore.globalCore['functionalDescription']['shape']['dimensions'])) {
                this.dimensionsValueInMm[key] = value * 1000
            }

            this.dimensionsLabel = []
            for (const [key, value] of Object.entries(this.userStore.globalCore['functionalDescription']['shape']['dimensions'])) {
                this.dimensionsLabel.push(key)
            }
        })
        .catch(error => {
        });

    },
}

</script>

<template>
    <CoreLoadCommercialShape @onLoadCommercialShape="onLoadCommercialShape"/>
    <Form ref=formRef @submit="onSubmit" @invalid-submit="onInvalidSubmit" class="pb-1">
        <Field name="familiesSelect" ref="familiesRef" as="select" style="width: 100%" @change="onFamilyChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="familyLabelSelected">
            <option disabled value="">Please select one family</option>
            <option v-for="item, index in familiesLabels"
                    :value="item"
            >{{item.toUpperCase()}}</option>
        </Field>
        <Field v-if="subtypeLabels.length > 1" name="subtypeSelect" ref="subtypeRef" as="select" style="width: 100%" @change="onsubtypeChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="subtypeLabelSelected">>
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
                    :min="0"
                    :step="0.1"
                    :max="1000">
                    </vue-number-input>
                <label class="text-danger col-12 pt-1" style="font-size: 0.7em">{{messageDimension(value)}}</label>
            </div>
        </div>

        <button v-if="!posting" :class="computeColor" class="submit-btn btn mt-2 fs-6" type="submit">Compute shape</button>
        <button v-if="!posting" class="btn btn-primary mt-2 fs-6" data-bs-toggle="modal" data-bs-target="#loadCommercialShapeModal">Load commercial shape</button>
        <img v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">
    </Form>
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

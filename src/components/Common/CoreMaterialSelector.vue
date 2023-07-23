<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        initialMaterialSelected: {
            type: String,
            default: '',
        },
    },
    data() {
        const commercialMaterialNames = [];
        const materialManufacturers = []
        const materialSelected = null;

        return {
            materialSelected,
            commercialMaterialNames,
            materialManufacturers,
        }
    },
    mounted() {
        this.materialSelected = this.initialMaterialSelected
        this.loadMaterialNames()
    },
    created() {
        this.$dataCacheStore.$onAction((action) => {
            if (action.name == "commercialMaterialsLoaded") {
                this.loadMaterialNames()
            }
        })
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'bottom'
            return {
                theme: {
                    placement: relative_placement,
                    width: '400px',
                    "text-align": "center",
                },
            }
        },
    },
    methods: {
        loadMaterialNames() {
            const materialData = this.$dataCacheStore.commercialMaterials
            this.commercialMaterialNames = []
            this.materialManufacturers = ["Magnetics"]
            materialData.forEach((item) => {
                if (!this.materialManufacturers.includes(item['manufacturerInfo']['name'])) {
                    this.materialManufacturers.push(item['manufacturerInfo']['name'])
                }
            })
            console.log(this.materialManufacturers)
            this.materialManufacturers.forEach((itemManufacturer) => {
                this.commercialMaterialNames.push(itemManufacturer)
                materialData.forEach((item) => {
                    if (item['manufacturerInfo']['name'] == itemManufacturer) {
                        this.commercialMaterialNames.push(item['name'])
                    }
                })
            })
        },
        handleSubmit(params) {
        },
    },
}
</script>

<template>
    <div v-tooltip="styleTooltip" class="container-flex text-primary p-0 m-0">
        <div class="row">
            <label v-tooltip="'Material of the core, it can only be commercial for now'" class="rounded-2 fs-5 col-4 p-0 m-0 text-sm-center">Material</label>
            <div class="col-8">
                <div class="container-flex p-0 m-0">
                    <div class="row">
                        <select :data-test-id="dataTestLabel + '-material-select-input'" name="quickMaterialField" ref="quickMaterialFieldRef" @change="$emit('onMaterialChange', $event.target.value)" class= "fs-6 bg-light text-white rounded-2 col-8 m-0 p-0" v-model="materialSelected">
                            <option :data-test-id="dataTestLabel + '-material-NA-option-input'" disabled value="">Please select one</option>
                            <option :data-test-id="dataTestLabel + '-material-custom-option-input'" disabled value="Custom">Custom</option>
                            <option v-for="model, index in commercialMaterialNames"
                                :data-test-id="dataTestLabel + '-material-' + model + '-option-input'"
                                :disabled="materialManufacturers.includes(model)"
                                :key="index"
                                :value="model">{{model}}
                            </option>
                        </select>
                        <button :data-test-id="dataTestLabel + '-material-table-modal-button'" v-tooltip="'Open information table for materials'" class="btn btn-primary text-dark py-1 p-0 px-0 mx-1 offset-1 col-2" data-bs-toggle="modal" data-bs-target="#loadCommercialMaterialModal" >
                            <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


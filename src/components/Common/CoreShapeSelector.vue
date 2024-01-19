<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import * as Yup from 'yup';
import { useSimulationStore } from '/src/stores/simulation'
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
        initialShapeSelected: {
            type: String,
            default: '',
        },
    },
    data() {
        var shapeSelected = null;
        const commercialShapesNames = [];

        return {
            shapeSelected,
            commercialShapesNames,
        }
    },
    mounted() {
        this.shapeSelected = this.initialShapeSelected
        this.loadShapesNames()
    },
    created() {
        this.$dataCacheStore.$onAction((action) => {
            if (action.name == "dataLoaded") {
                this.loadShapesNames()
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
        loadShapesNames() {
            const shapeData = this.$dataCacheStore.masData['coreShapes']
            this.commercialShapesNames = []
            shapeData.forEach((item) => {
                this.commercialShapesNames.push(item['name'])
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
            <label v-tooltip="'Shape of the core, to be selected among all available commercial ones. Go to shape artisan for advanced customization.'" class="rounded-2 fs-5 col-4 m-xl-0 p-0 m-0 text-sm-center">Shape</label>
            <div class="col-8">
                <div class="container-flex p-0 m-0">
                    <div class="row">
                        <select :data-cy="dataTestLabel + '-shape-select-input'" name="quickShapeselect" ref="quickShapeFieldRef" @change="$emit('onShapeChange', $event.target.value)" class= "fs-6 bg-light text-white rounded-2 col-8 m-0 p-0" v-model="shapeSelected">
                            <option :data-cy="dataTestLabel + '-shape-NA-option-input'" disabled value="">Please select one</option>
                            <option :data-cy="dataTestLabel + '-shape-custom-option-input'" disabled value="Custom">Custom</option>
                            <option v-for="model, index in commercialShapesNames"
                                :data-cy="dataTestLabel + '-shape-' + model + '-option-input'"
                                :key="index"
                                :value="model">{{model}}
                            </option>
                        </select>
                        <button :data-cy="dataTestLabel + '-shape-table-modal-button'" v-tooltip="'Open information table for shapes'" class="btn btn-primary text-dark py-1 p-0 px-0 mx-1 offset-1 col-2" data-bs-toggle="modal" data-bs-target="#loadCommercialShapeModal" >
                            <i class="fa-solid fs-6 fa-table-list m-0 p-0"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>


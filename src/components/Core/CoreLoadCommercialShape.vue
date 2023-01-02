<script setup >
import '/src/assets/css/vue-good-table-next.css'
import { VueGoodTable } from 'vue-good-table-next';
const emit = defineEmits(['onLoadCommercialShape'])
import axios from "axios";
import * as Utils from '/src/assets/js/utils.js'
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'

</script>

<script>
export default {
    components: {
    },
    data() {
        const columns = [
            {
                label: 'Name',
                field: 'name',
                tdClass: 'text-center',
                tooltip: 'Name of the shape',
            },
            {
                label: 'Family',
                field: 'family',
                tdClass: 'text-center',
                tooltip: 'Family of the shape',
            },
            {
                label: 'Dim. (W x H x D)',
                field: 'dimensions',
                tdClass: 'text-center',
                tooltip: 'Dimension of the enveloping cube',
            },
            {
                label: 'Eff. Length (mm)',
                field: 'effectiveLength',
                type: 'decimal',
                tdClass: 'text-center',
                tooltip: 'Effective Length of the shape',
            },
            {
                label: 'Eff. Area (mm²)',
                field: 'effectiveArea',
                type: 'decimal',
                tdClass: 'text-center',
                tooltip: 'Effective Area of the shape',
            },
            {
                label: 'Eff. Volume (mm³)',
                field: 'effectiveVolume',
                type: 'decimal',
                tdClass: 'text-center',
                tooltip: 'Effective Volume of the shape',
            },
            {
                label: 'Load',
                field: 'load',
                tdClass: 'text-center',
            },
        ]
        const userStore = useUserStore();
        const coreStore = useCoreStore();
        const commercialData = []
        const scaledColumns = []
        return {
            userStore,
            coreStore,
            columns,
            commercialData,
            scaledColumns,
        }
    },
    methods: {
        onLoad(name) {
            var dataToLoad = null

            for (let i = 0; i < this.coreStore.commercialShapes.length; i++) {
                if (this.coreStore.commercialShapes[i]["name"] == name){
                    dataToLoad = this.coreStore.commercialShapes[i]
                    break
                } 
            }
            const globalCore = this.userStore.globalCore
            globalCore['functionalDescription']['shape'] = dataToLoad
            this.userStore.setGlobalCore(globalCore)

            this.$emit("onLoadCommercialShape", dataToLoad)
        },
        scaleColumns() {
            this.scaledColumns = []

            this.columns.forEach((item, index) => {
                const newItem = Utils.deepCopy(item)
                if (window.innerWidth < 700) {
                    var slice = 4
                    if (window.innerWidth < 400)
                        slice = 0
                    else if (window.innerWidth < 500)
                        slice = 1
                    else if (window.innerWidth < 600)
                        slice = 2
                    newItem.label = newItem.label.slice(0, slice) + '.'
                }
                this.scaledColumns.push(newItem)
            })
        },
    },
    mounted() {
        const url = import.meta.env.VITE_API_ENDPOINT + '/core_get_commercial_data'
        const core = this.userStore.getGlobalCore
        axios.post(url, {})
        .then(response => {
            response.data["commercial_cores"].forEach((item) => {
                this.coreStore.commercialShapes.push(item['functionalDescription']['shape'])
            })
            this.coreStore.commercialShapesLoaded()
            response.data["commercial_cores"].forEach((item) => {
                const datum = {
                    name: item['functionalDescription']['shape']['name'],
                    family: item['functionalDescription']['shape']['family'].toUpperCase(),
                    dimensions: Utils.removeTrailingZeroes(item['processedDescription']['width'], 4) + " x " + Utils.removeTrailingZeroes(item['processedDescription']['height'], 4) + " x " + Utils.removeTrailingZeroes(item['processedDescription']['depth'], 4) + " m",
                    effectiveLength: item['processedDescription']['effectiveParameters']['effectiveLength'] * 1000,
                    effectiveArea: item['processedDescription']['effectiveParameters']['effectiveArea'] * 1000000,
                    effectiveVolume: item['processedDescription']['effectiveParameters']['effectiveVolume'] * 1000000000,
                }
                this.commercialData.push(datum)
            })
            this.scaleColumns()  // To avoid bug in vue-good-table-next
        })
        .catch(error => {
            console.error(error.data)
        });
        window.addEventListener('resize', () => {
            this.scaleColumns()
        })

    },
}


</script>

<template>
    <div class="modal fade" id="loadCommercialShapeModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="modalLabel">Load a commercial shape</h1>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <vue-good-table
                    :columns="scaledColumns"
                    :rows="commercialData"
                    theme="open-magnetics"
                    max-height="58vh"
                    :fixed-header="true"
                    :search-options="{
                        enabled: true
                    }"
                    >
                    <template #table-row="props">
                        <span v-if="props.column.field == 'load'">
                            <button type="button" class="btn btn-primary"  data-bs-dismiss="modal" @click="onLoad(props.row.name)"><i class="fa-solid fa-upload"></i></button>
                        </span>
                    </template>
                </vue-good-table>
            </div>
        </div>
    </div>
</template>

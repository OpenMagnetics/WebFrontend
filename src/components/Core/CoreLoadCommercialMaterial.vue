<script setup >
import '/src/assets/css/vue-good-table-next.css'
import { VueGoodTable } from 'vue-good-table-next';
const emit = defineEmits(['onLoadCommercialMaterial'])
import * as Utils from '/src/assets/js/utils.js'

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
                tooltip: 'Name of the material',
            },
            {
                label: 'Manufacturer',
                field: 'manufacturerName',
                tdClass: 'text-center',
                tooltip: 'Manufacturer of the material',
            },
            {
                label: 'Family',
                field: 'family',
                tdClass: 'text-center',
                tooltip: 'Family of the material',
            },
            {
                label: 'Composition',
                field: 'composition',
                tdClass: 'text-center',
                tooltip: 'Composition of the material',
            },
            {
                label: 'Initial μ',
                field: 'initialPermeability',
                type: 'number',
                tdClass: 'text-center',
                tooltip: 'Initial permeability according to the datasheet of the material',
            },
            {
                label: 'Satuation @100°C',
                field: 'saturation100C',
                type: 'decimal',
                tdClass: 'text-center',
                tooltip: 'The saturation of the material al 100ºC, according to the manufacturer',
            },
            {
                label: 'Load',
                field: 'load',
                tdClass: 'text-center',
            },
        ]
        const commercialData = []
        const scaledColumns = []
        return {
            columns,
            commercialData,
            scaledColumns,
        }
    },
    methods: {
        onLoad(name) {
            var dataToLoad = null

            for (let i = 0; i < this.$dataCacheStore.commercialMaterials.length; i++) {
                if (this.$dataCacheStore.commercialMaterials[i]["name"] == name){
                    dataToLoad = this.$dataCacheStore.commercialMaterials[i]
                    break
                } 
            }
            const globalCore = this.$userStore.globalCore
            globalCore['functionalDescription']['material'] = dataToLoad
            this.$userStore.setGlobalCoreAlt(globalCore)

            this.$emit("onLoadCommercialMaterial", dataToLoad)
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
        loadTableData() {
            this.$userStore.armDeadManSwitch()
            const materialData = this.$dataCacheStore.commercialMaterials
            this.commercialMaterialNames = []
            materialData.forEach((item) => {
                var initialPermeability;
                var saturation100C;
                if (typeof(item['permeability']['initial']['value']) == 'number') {
                    initialPermeability = item['permeability']['initial']['value']
                }
                else {
                    // TODO take into account array permeability
                    // initialPermeability = item['permeability']['initial'][0]['value']
                }
                item['saturation'].forEach((item) => {
                    if (item['temperature'] == 100) {
                        saturation100C = item['magneticFluxDensity']
                    }
                })

                const datum = {
                    name: item['name'],
                    manufacturerName: item['manufacturerInfo']['name'],
                    family: item['family'],
                    composition: item['materialComposition'],
                    initialPermeability: initialPermeability,
                    saturation100C: saturation100C,
                }
                this.commercialData.push(datum)
            })
            this.scaleColumns()  // To avoid bug in vue-good-table-next
            this.$userStore.disarmDeadManSwitch()
        },
    },
    mounted() {
        this.$dataCacheStore.$onAction((action) => {
            if (action.name == "commercialMaterialsLoaded") {
                this.loadTableData()
            }
        })
        this.loadTableData()

        window.addEventListener('resize', () => {
            this.scaleColumns()
        })

    },
}


</script>

<template>
    <div class="modal fade" id="loadCommercialMaterialModal" tabindex="-1" aria-labelledby="loadCommercialMaterialModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p class="modal-title fs-5" id="loadCommercialMaterialModalLabel">Load a commercial material</p>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="loadCommercialMaterialModalClose"></button>
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

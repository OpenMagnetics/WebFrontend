<script setup>
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net';
import { useMasStore } from '../../stores/mas'
import { defaultOperatingConditions } from '/WebSharedComponents/assets/js/defaults.js'
import { formatInductance, formatResistance, formatDimension, removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    props: {
        name: {
            type: String,
            required: true,
        },
        catalogInput: {
            type: [String, Object],
            required: true,
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        DataTable.use(DataTablesCore);
        const catalogColumns = [
          { data: 'reference' },
          { data: 'dcResistance' },
          { data: 'magnetizingInductance' },
          { data: 'dimensions' },
          { data: 'view' },
        ];

        const catalogData = []

        const loadingCatalog = false
        return {
            masStore,
            catalogColumns,
            catalogData,
            loadingCatalog,
        }
    },
    computed: {
        tableHeight() {
            return screen.height / 2;
        }
    },
    watch: { 
    },
    mounted () {

        if (this.catalogInput != null) {
            fetch(this.catalogInput)
            .then((data) => data.text())
            .then((data) => {

                this.$mkf.ready.then(_ => {
                    data.split("\n").forEach((magneticString) => {
                        const magnetic = JSON.parse(magneticString)

                        const magnetizingInductance = this.$mkf.calculate_inductance_from_number_turns_and_gapping(JSON.stringify(magnetic.core), JSON.stringify(magnetic.coil), "", "{}");
                        const dcResistancePerWinding = this.$mkf.calculate_dc_resistance_per_winding(JSON.stringify(magnetic.coil), defaultOperatingConditions.ambientTemperature);
                        const auxDcResistance = formatResistance(dcResistancePerWinding.get(0));
                        const auxMagnetizingInductance = formatInductance(magnetizingInductance);
                        const maximumDimensions = this.$mkf.get_maximum_dimensions(JSON.stringify(magnetic));
                        const maximumDimensions0 = formatDimension(maximumDimensions.get(0));
                        const maximumDimensions1 = formatDimension(maximumDimensions.get(1));
                        const maximumDimensions2 = formatDimension(maximumDimensions.get(2));
                        this.catalogData.push({
                            reference: magnetic.manufacturerInfo.reference,
                            dcResistance: `${removeTrailingZeroes(auxDcResistance.label, 2)} ${auxDcResistance.unit}`,
                            magnetizingInductance: `${removeTrailingZeroes(auxMagnetizingInductance.label, 2)} ${auxMagnetizingInductance.unit}`,
                            dimensions: `${removeTrailingZeroes(maximumDimensions0.label, 2)} ${maximumDimensions0.unit} x ${removeTrailingZeroes(maximumDimensions1.label, 2)} ${maximumDimensions1.unit} x ${removeTrailingZeroes(maximumDimensions2.label, 2)} ${maximumDimensions2.unit}`,
                            view: null,
                            magnetic: magnetic,
                        })
                    })
                })
            })
        }
    },
    methods: {
        viewMagnetic(row) {
            this.masStore.mas.magnetic = row.magnetic;
            this.$stateStore.selectWorkflow("magneticViewer");
            this.$stateStore.selectTool("magneticViewer");
            this.$stateStore.setCurrentToolSubsection("magneticViewer");
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);

            setTimeout(() => {this.$router.push('/we_magnetic_viewer');}, 50);
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row pb-5 my-5 text-start align-items-start" :style="$styleStore.catalog.main">
            <div class="offset-1 col-10 rowy">
                <h3>Catalog</h3>
                <DataTable
                    :style="$styleStore.catalog.tableHeader"
                    v-if="!loadingCatalog"
                    class="table"
                    :columns="catalogColumns"
                    :data="catalogData"
                    :options="{ select: true, filter: true, lengthChange: true, info: false, paginate: false}"
                    width="100%"
                    ref="table"
                >
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>DC Resistance</th>
                            <th>Mag. Inductance</th>
                            <th>Dimensions</th>
                        </tr>
                    </thead>
                    <template #column-0="props">
                        <label :style="$styleStore.catalog.tableBodyReference"> {{props.rowData.reference}} </label>
                    </template>
                    <template #column-4="props">
                        <button
                            :style="$styleStore.catalog.viewButton"
                            class="btn"
                            @click="viewMagnetic(props.rowData)"
                        >View</button>
                    </template>
                </DataTable>
            </div>
        </div>
    </div>
</template>
<style type="text/css">


.dt-input {
   background-color: v-bind($styleStore.catalog.search.background) !important;
   color: v-bind($styleStore.catalog.search.color) !important;
   border-color: v-bind($styleStore.catalog.search.border-color) !important;
   padding: 5px;
   margin: 10px;
}   

td  {
   background-color: v-bind($styleStore.catalog.tableBody.background) !important;
   color: v-bind($styleStore.catalog.tableBody.color) !important;
   padding: 5px;
   margin: 10px;
}


.dt-orderable-asc  {
   background-color: v-bind($styleStore.catalog.tableHeader.background) !important;
   color: v-bind($styleStore.catalog.tableHeader.color) !important;
   padding: 5px;
   margin: 10px;
}
</style>
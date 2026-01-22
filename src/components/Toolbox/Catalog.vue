<script setup>
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net';
import { useMasStore } from '../../stores/mas'

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
          { data: 'core' },
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
                data.split("\n").forEach((magneticString) => {
                    const magnetic = JSON.parse(magneticString)
                    this.catalogData.push({
                        reference: magnetic.manufacturerInfo.reference,
                        core: magnetic.core.name,
                        magnetic: magnetic,
                    })
                })
            })
            .catch((error) => {
                console.error('Failed to fetch catalog input:', error);
            })
        }
    },
    methods: {
        viewMagnetic(row) {
            this.masStore.mas.magnetic = row.magnetic;
            this.$stateStore.selectWorkflow("magneticViewer");
            this.$stateStore.selectTool("magneticViewer");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);

            setTimeout(() => {this.$router.push('/magnetic_viewer');}, 50);
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row pb-5 my-5 text-start align-items-start text-white">
            <div class="offset-1 col-10 row">
                <h3>Catalog</h3>
                <DataTable
                    v-if="!loadingCatalog"
                    class="table text-white bg-light"
                    :columns="catalogColumns"
                    :data="catalogData"
                    :options="{ select: true, filter: true, lengthChange: true, info: false, paginate: false}"
                    width="100%"
                    ref="table"
                >
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Core</th>
                        </tr>
                    </thead>
                    <template #column-2="props">
                        <button
                            class="btn btn-primary"
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
   background-color: var(--bs-light);
   color: var(--bs-white);
   padding: 5px;
   margin: 10px;
}
</style>
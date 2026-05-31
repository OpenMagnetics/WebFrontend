<script setup>
import { formatPower, formatPermeance, formatArea, formatVolume, formatPercentage, removeTrailingZeroes } from 'WebSharedComponents/assets/js/utils.js'
import DataTable from 'datatables.net-vue3'
import DataTablesCore from 'datatables.net'
</script>

<script>
const fmt = (formatter) => (data) => {
    if (data == null || isNaN(data)) return ''
    const { label, unit } = formatter(data)
    return `${removeTrailingZeroes(label, 2)} ${unit}`
}

export default {
    emits: ['click'],
    components: {
        DataTable,
    },
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        data: {
            type: Array,
        },
        reference: {
            type: Object,
        },
        onlyCoresInStock: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        DataTable.use(DataTablesCore)
        const columns = [
            { data: 'label', className: 'text-left' },
            { data: 'coreLosses', className: 'text-center', render: fmt(formatPower) },
            { data: 'envelopingVolume', className: 'text-center', render: fmt(formatVolume) },
            { data: 'permeance', className: 'text-center', render: fmt(formatPermeance) },
            { data: 'saturation', className: 'text-center', render: fmt(formatPercentage) },
            { data: 'effectiveArea', className: 'text-center', render: fmt(formatArea) },
            { data: 'windingWindowArea', className: 'text-center', render: fmt(formatArea) },
        ]
        return {
            columns,
        }
    },
    methods: {
        click(originalIndex) {
            this.$emit('click', originalIndex)
        },
    },
    computed: {
        getWarningMessage() {
            if (this.data.length == 0 && this.onlyCoresInStock) {
                return 'No result found with stock. Try disabling option "Only Cores In Stock"'
            }
            return ''
        },
        tableData() {
            return (this.data || []).map((row, i) => ({ ...row, originalIndex: i }))
        },
    },
}
</script>

<template>
    <div class="lg:col-12 container">
        <div class="row">
            <DataTable
                ref="CoreCrossReferencerTable"
                class="display"
                :columns="columns"
                :data="tableData"
                :options="{ select: false, searching: false, lengthChange: false, info: false, paginate: true, pageLength: 10, scrollY: '35vh', scrollCollapse: true }"
                width="100%"
            >
                <thead>
                    <tr>
                        <th title="Reference name given to Core">Name</th>
                        <th title="Core loss of the core">Core Loss</th>
                        <th title="Volume of the core">Enveloping Volume</th>
                        <th title="AL value of the core">Permeance</th>
                        <th title="How close the core would be to saturation">Saturation</th>
                        <th title="Effective Area of the core">Eff. Area</th>
                        <th title="Area of the winding window of the core">WW Area</th>
                    </tr>
                </thead>
                <template #column-0="props">
                    <button
                        type="button"
                        class="p-button p-button-outlined p-button-primary border-0"
                        @click="click(props.rowData.originalIndex)"
                    >{{ props.cellData }}</button>
                </template>
            </DataTable>
        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em">{{ getWarningMessage }}</label>
        </div>
    </div>
</template>

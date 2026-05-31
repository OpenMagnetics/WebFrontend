<script setup>
import { formatPowerDensity, formatMagneticFluxDensity, formatMagneticFieldStrength, formatResistivity, formatTemperature, removeTrailingZeroes } from 'WebSharedComponents/assets/js/utils.js'
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
            { data: 'label', className: 'text-start' },
            { data: 'initialPermeability', className: 'text-center', render: (d) => d == null || isNaN(d) ? '' : removeTrailingZeroes(d, 0) },
            { data: 'remanence', className: 'text-center', render: fmt(formatMagneticFluxDensity) },
            { data: 'coerciveForce', className: 'text-center', render: fmt(formatMagneticFieldStrength) },
            { data: 'saturation', className: 'text-center', render: fmt(formatMagneticFluxDensity) },
            { data: 'curieTemperature', className: 'text-center', render: fmt(formatTemperature) },
            { data: 'volumetricLosses', className: 'text-center', render: fmt(formatPowerDensity) },
            { data: 'resistivity', className: 'text-center', render: fmt(formatResistivity) },
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
                ref="CoreMaterialCrossReferencerTable"
                class="display"
                :columns="columns"
                :data="tableData"
                :options="{ select: false, searching: false, lengthChange: false, info: false, paginate: true, pageLength: 10, scrollY: '35vh', scrollCollapse: true }"
                width="100%"
            >
                <thead>
                    <tr>
                        <th title="Reference name given to Core">Name</th>
                        <th title="Initial Permeability of the core material">Initial Permeability</th>
                        <th title="Remanence of the core material">Remanence</th>
                        <th title="Coercive Force of the core material">Coercive Force</th>
                        <th title="Saturation of the core material">Saturation</th>
                        <th title="Curie Temperature of the core material">Curie Temperature</th>
                        <th title="Average Volumetric Losses of the core material">Volumetric Losses</th>
                        <th title="Resistivity of the core material">Resistivity</th>
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
            <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"></label>
        </div>
    </div>
</template>

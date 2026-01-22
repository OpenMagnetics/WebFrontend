<script setup >
import { toTitleCase, formatUnit, formatPowerDensity, formatAdimensional, formatMagneticFluxDensity, formatMagneticFieldStrength, formatResistivity, formatTemperature, removeTrailingZeroes, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import '../../../assets/css/vue-good-table-next.css'

</script>

<script>

export default {
    emits: [
        'click',
    ],
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
            defalut: "false"
        },
    },
    data() {
        const columns = [
            {
                label: 'Name',
                field: 'label',
                tdClass: 'text-start',
                tooltip: 'Reference name give to Core',
            },
            {
                label: 'Initial Permeability',
                field: 'initialPermeability',
                tdClass: 'text-center',
                tooltip: 'Initial Permeability of the core material',
            },
            {
                label: 'Remanence',
                field: 'remanence',
                tdClass: 'text-center',
                tooltip: 'Remanence of the core material',
            },
            {
                label: 'Coercive Force',
                field: 'coerciveForce',
                tdClass: 'text-center',
                tooltip: 'Coercive Force of the core material',
            },
            {
                label: 'Saturation',
                field: 'saturation',
                tdClass: 'text-center',
                tooltip: 'Saturation of the core material',
            },
            {
                label: 'Curie Temperature',
                field: 'curieTemperature',
                tdClass: 'text-center',
                tooltip: 'Curie Temperature of the core material',
            },
            {
                label: 'Volumetric Losses',
                field: 'volumetricLosses',
                tdClass: 'text-center',
                tooltip: 'Average Volumetric Losses of the core material',
            },
            {
                label: 'Resistivity',
                field: 'resistivity',
                tdClass: 'text-center',
                tooltip: 'Resistivity of the core material',
            },
        ]
        var currentTableWidth = window.innerWidth;
        return {
            columns,
            currentTableWidth,
        }
    },
    methods: {
        scaleColumns() {
            this.scaledColumns = []
            var selectedColumns = this.columns 

            selectedColumns.forEach((item, index) => {
                const newItem =deepCopy(item)
                if (this.currentTableWidth < 1200) {
                    var slice = 8
                    if (this.currentTableWidth < 1100)
                        slice = 7
                    if (this.currentTableWidth < 1000)
                        slice = 6
                    if (this.currentTableWidth < 900)
                        slice = 4
                    if (this.currentTableWidth < 700)
                        slice = 3
                    if (this.currentTableWidth < 600)
                        slice = 2
                    if (this.currentTableWidth < 500)
                        slice = 1
                    newItem.label = newItem.label.split(' ')
                        .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                        .join('');
                }
                this.scaledColumns.push(newItem)
            })
        },
        click(dataIndex) {
            this.$emit('click', dataIndex);
        }
    },
    computed: {
        getTableGridSize() {
            return "col-lg-12"
        },
        getWarningMessage() {
            var warningMessage = "";
            return warningMessage;
        }
    },
    created() {
        this.scaleColumns()
        this.resizeHandler = () => {
            if (this.$refs.CoreMaterialCrossReferencerTable.$el != null){
                this.currentTableWidth = this.$refs.CoreMaterialCrossReferencerTable.$el.clientWidth;
            }
            this.scaleColumns();
        };
    },
    mounted() {
        if (this.$refs.CoreMaterialCrossReferencerTable.$el != null){
            this.currentTableWidth = this.$refs.CoreMaterialCrossReferencerTable.$el.clientWidth;
        }
        this.scaleColumns();
        window.addEventListener('resize', this.resizeHandler);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.resizeHandler);
    }
}
</script>

<template>
    <div :class="getTableGridSize" class="container">
        <div row>
            <vue-good-table
                 ref="CoreMaterialCrossReferencerTable"
                :columns="scaledColumns"
                :rows="data"
                theme="open-magnetics"
                max-height="35vh"
                :search-options="{
                    enabled: false
                }"
                >
                <template #table-row="props">
                    <span v-if="props.column.field == 'label'">
                        <button type="button" class="btn btn-outline-primary border-0" @click="click(props.row.originalIndex)" >{{props.formattedRow[props.column.field]}}</button>
                    </span>
                    <span v-if="props.column.field == 'initialPermeability'">
                        {{removeTrailingZeroes(props.formattedRow[props.column.field], 0)}}
                    </span>
                    <span v-if="props.column.field == 'volumetricLosses'">
                        {{`${removeTrailingZeroes(formatPowerDensity(props.formattedRow[props.column.field]).label, 2)} ${formatPowerDensity(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'saturation'">
                        {{`${removeTrailingZeroes(formatMagneticFluxDensity(props.formattedRow[props.column.field]).label, 2)} ${formatMagneticFluxDensity(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'curieTemperature'">
                        {{`${removeTrailingZeroes(formatTemperature(props.formattedRow[props.column.field]).label, 2)} ${formatTemperature(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'remanence'">
                        {{`${removeTrailingZeroes(formatMagneticFluxDensity(props.formattedRow[props.column.field]).label, 2)} ${formatMagneticFluxDensity(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'coerciveForce'">
                        {{`${removeTrailingZeroes(formatMagneticFieldStrength(props.formattedRow[props.column.field]).label, 2)} ${formatMagneticFieldStrength(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'resistivity'">
                        {{`${removeTrailingZeroes(formatResistivity(props.formattedRow[props.column.field]).label, 2)} ${formatResistivity(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                </template>
            </vue-good-table>
        </div>
        <div row>
            <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{getWarningMessage}}</label>
        </div>
    </div>
</template>

<script setup >
import { toTitleCase, formatUnit, formatPower, formatPermeance, formatArea, formatVolume, formatPercentage, removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import '../../../assets/css/vue-good-table-next.css'
import { VueGoodTable } from 'vue-good-table-next';
import { deepCopy} from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>

export default {
    emits: [
        'click',
    ],
    components: {
        VueGoodTable,
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
                label: 'Core Loss',
                field: 'coreLosses',
                tdClass: 'text-center',
                tooltip: 'Core loss of the core',
            },
            {
                label: 'Enveloping Volume',
                field: 'envelopingVolume',
                tdClass: 'text-center',
                tooltip: 'Volume of the core',
            },
            {
                label: 'Permeance',
                field: 'permeance',
                tdClass: 'text-center',
                tooltip: 'AL value of the core',
            },
            {
                label: 'Saturation',
                field: 'saturation',
                tdClass: 'text-center',
                tooltip: 'How close the core would be to saturation',
            },
            {
                label: 'Eff. Area',
                field: 'effectiveArea',
                tdClass: 'text-center',
                tooltip: 'Effective Area of the core',
            },
            {
                label: 'WW Area',
                field: 'windingWindowArea',
                tdClass: 'text-center',
                tooltip: 'Area of the winding window of the core',
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
            if (this.data.length == 0 && this.onlyCoresInStock) {
                warningMessage = "No result found with stock. Try disabling option \"Only Cores In Stock\"";
            }
            return warningMessage;
        }
    },
    created() {
        this.scaleColumns()
        this.resizeHandler = () => {
            if (this.$refs.CoreCrossReferencerTable.$el != null){
                this.currentTableWidth = this.$refs.CoreCrossReferencerTable.$el.clientWidth;
            }
            this.scaleColumns();
        };
    },
    mounted() {
        if (this.$refs.CoreCrossReferencerTable.$el != null){
            this.currentTableWidth = this.$refs.CoreCrossReferencerTable.$el.clientWidth;
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
                 ref="CoreCrossReferencerTable"
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
                    <span v-if="props.column.field == 'coreLosses'">
                        {{`${removeTrailingZeroes(formatPower(props.formattedRow[props.column.field]).label, 2)} ${formatPower(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'envelopingVolume'">
                        {{`${removeTrailingZeroes(formatVolume(props.formattedRow[props.column.field]).label, 2)} ${formatVolume(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'permeance'">
                        {{`${removeTrailingZeroes(formatPermeance(props.formattedRow[props.column.field]).label, 2)} ${formatPermeance(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'saturation'">
                        {{`${removeTrailingZeroes(formatPercentage(props.formattedRow[props.column.field]).label, 2)} ${formatPercentage(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'windingWindowArea'">
                        {{`${removeTrailingZeroes(formatArea(props.formattedRow[props.column.field]).label, 2)} ${formatArea(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                    <span v-if="props.column.field == 'effectiveArea'">
                        {{`${removeTrailingZeroes(formatArea(props.formattedRow[props.column.field]).label, 2)} ${formatArea(props.formattedRow[props.column.field]).unit}`}}
                    </span>
                </template>
            </vue-good-table>
        </div>
        <div row>
            <label :data-cy="dataTestLabel + '-ErrorMessage'" class="text-danger m-0" style="font-size: 0.9em"> {{getWarningMessage}}</label>
        </div>
    </div>
</template>

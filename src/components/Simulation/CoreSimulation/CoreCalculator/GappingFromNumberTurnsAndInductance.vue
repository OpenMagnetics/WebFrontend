<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { useDataCacheStore } from '/src/stores/dataCache'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'
import VueNumberInput from '/src/components/VueNumberInput.vue';
import { useSimulationStore } from '/src/stores/simulation'

</script>

<script>
const schema = Yup.object().shape({
    quickGapTypeField: Yup.string().required('Please, introduce a gap type'),
    numberGapsField: Yup.number().required('Please, introduce a number of gaps').min(1).label("Number of gaps"),
    magnetizingInductanceField: Yup.number().required('Please, introduce a number of turns').min(1).label("Number of turns"),
});

export default {
    data() {
        const aux = Utils.guessBasicGappingParameters(this.$userStore.globalSimulation['magnetic']['core'])
        var gapTypeSelected = aux['gapType']
        var gapLength = aux['gapLength']
        var numberGaps = aux['numberGaps']
        const magnetizingInductanceSelected = this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] * 1000000;
        const numberTurnsSelected = this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns']
        const dataCacheStore = useDataCacheStore()
        const simulationStore = useSimulationStore();
        return {
            simulationStore,
            magnetizingInductanceSelected,
            numberGaps,
            gapLength,
            gapTypeSelected,
            dataCacheStore,
            numberTurnsSelected,
            tryingToSend: false,
            recentChange: false,
            hasError: false,
            computing: false,
        }
    },
    created() {
        this.simulationStore.$onAction((action) => {
            if (action.name == "calculateInductance" && this.$userStore.simulationCoreCalculatorSubsection == 'gappingCalculator') {
                 setTimeout(() => this.tryToSend(), 10);
            }
        })
        this.$userStore.$onAction((action) => {
            if (action.name == "setSimulationCoreCalculatorSubsection") {
                var simulationCoreCalculatorSubsection = action.args[0]
                if (simulationCoreCalculatorSubsection == 'gappingCalculator') {
                    const aux = Utils.guessBasicGappingParameters(this.$userStore.globalSimulation['magnetic']['core'])
                    this.gapTypeSelected = aux['gapType']
                    this.gapLength = aux['gapLength']
                    this.numberGaps = aux['numberGaps']
                    this.magnetizingInductanceSelected = this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] * 1000000;
                    this.magnetizingInductanceSelected = Number(Utils.removeTrailingZeroes(this.magnetizingInductanceSelected, 2))
                    this.numberTurnsSelected = this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns']
                    this.recentChange = true
                    this.tryToSend()
                }
            }
        })
    },
    methods: {
        formatGapping(value) {
            console.log("value")
            console.log(value)
            const aux = Utils.guessBasicGappingParameters(value)
            console.log(aux)
            this.gapTypeSelected = aux['gapType']
            this.gapLength = aux['gapLength']
            this.numberGaps = aux['numberGaps']
        },
        computeGapping() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/get_gapping_from_number_turns_and_inductance'

            var globalSimulation = Utils.deepCopy(this.$userStore.globalSimulation)
            globalSimulation = Utils.cleanSimulation(globalSimulation, true)
            const data = {}
            data['simulation'] = globalSimulation
            data['gappingType'] = this.gapTypeSelected.toUpperCase()
            data['models'] = {gapReluctance: this.$userStore.selectedModels['gapReluctance'].toUpperCase()}
            this.$axios.post(url, data)
            .then(response => {
                console.warn(response.data)
                this.computing = false
                this.formatGapping(response.data)
                this.$userStore.setGlobalSimulationCoreGapping(response.data['functionalDescription']['gapping'])
                console.log(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'])

            })
            .catch(error => {
                this.computing = false
                console.error("Error getting inductance")
                console.error(error.data)
            });
        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.tryingToSend = false
                            this.computing = true
                            this.computeGapping()
                        }
                    }
                }
                , 500);
            }
        },
        onInductanceUpdate(name, newValue, oldValue) {
            if (newValue != oldValue && newValue) {
                this.magnetizingInductanceSelected = newValue
                this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] = newValue / 1000000
                this.recentChange = true
                this.tryToSend()
            }
        },
        onGapTypeChange() {
            this.recentChange = true
            this.tryToSend()
        },
        onNumberTurnsUpdate(name, newValue, oldValue) {
            if (newValue != oldValue && newValue) {
                this.numberTurnsSelected = newValue
                this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns'] = newValue
                this.recentChange = true
                this.tryToSend()
            }
        },

    },
    computed: {
    },
}
</script>


<template>
    <div class="container-flex text-primary mt-2">
        <Form ref="formRef" :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline row" @submit="handleSubmit($event, onSubmit)">

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5 pt-2">Mag. Ind.</label>

            <vue-number-input controls class="col-5 mt-2"  :class="{ 'is-invalid': errors.magnetizingInductanceField }" 
                :modelValue="magnetizingInductanceSelected"
                @update:model-value="onInductanceUpdate"
                :size="'small'"
                :name="'magnetizingInductanceField'"
                :center="true"
                :readonly="false"
                :min="1"
                :step="1"
                :max="10000">
            </vue-number-input>
            <label class="small-text col-1 text-start mt-3 fs-6">μH</label>

            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-5 pt-2">No. turns</label>

            <vue-number-input controls class="col-5 mt-2"  :class="{ 'is-invalid': errors.numberTurnsField }" 
                :modelValue="numberTurnsSelected"
                @update:model-value="onNumberTurnsUpdate"
                :size="'small'"
                :name="'numberTurnsField'"
                :center="true"
                :readonly="false"
                :min="1"
                :step="1"
                :max="10000">
            </vue-number-input>

            <label v-tooltip="'Type of gap. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-5 text-primary col-5 mt-1">Gap type:</label>
            <Field name="quickGapTypeField" ref="quickGapTypeFieldRef" as="select" :class="{'is-invalid': errors.quickGapTypeField }" @change="onGapTypeChange" class= "rounded-2 bg-light text-white col-5 mt-2" v-model="gapTypeSelected" >
                <option disabled value="">Please select one</option>
                <option value="Ungapped">Ungapped</option>
                <option value="Grinded">Grinded</option>
                <option value="Spacer">Spacer</option>
                <option value="Distributed">Distributed</option>
                <option disabled value="Custom">Custom</option>
            </Field>
            <div class="invalid-feedback">{{errors.quickGapTypeField}}</div>
            <div class="border-top my-3"></div>

            <img id="svg" v-if="computing" class="mx-auto d-block col-12" alt="loading" style="width: 25%; height: auto;" src="/images/loading.gif">

            <div class="mt-1"></div>
            <label v-if="!computing" class="rounded-2 fs-5 col-12 text-info">Gap info</label>

            <label v-if="!computing" v-tooltip="gapTypeSelected!='Residual'? 'Length of the gap, in mm' : 'Residual length cannot be changed'" class="rounded-2 fs-6 text-info offset-1 col-4 pt-1">Length:</label>

            <label v-if="!computing" class="fs-5 bg-light text-white col-5 text-end">{{gapLength}}</label>
            <label v-if="!computing" class="small-text col-2 text-start pt-1 fs-6">mm</label>

            <label v-if="!computing"  v-tooltip="gapTypeSelected!='Residual'? 'Length of the gap, in mm' : 'Residual length cannot be changed'" class="rounded-2 fs-6 text-info offset-1 col-4 pt-1">No. gaps:</label>
            <label v-if="!computing" class="fs-5 bg-light text-white col-5 text-end">{{numberGaps}}</label>

        </Form>
    </div>
</template>


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
    numberTurnsField: Yup.number().required('Please, introduce a number of turns').min(1).label("Number of turns"),
    gapLengthField: Yup.number().required('Please, introduce a gap').min(0.01).label("Gap"),
});

export default {
    data() {
        const aux = Utils.guessBasicGappingParameters(this.$userStore.globalSimulation['magnetic']['core'])
        var gapTypeSelected = aux['gapType']
        var gapLengthSelected = aux['gapLength']
        var numberGapsSelected = aux['numberGaps']
        console.warn(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'])
        console.warn(aux)
        const numberTurnsSelected = this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns']
        const magnetizingInductance = this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] * 1000000;

        const dataCacheStore = useDataCacheStore()
        const magnetizingInductanceUnit = "H"
        const simulationStore = useSimulationStore();
        return {
            simulationStore,
            numberTurnsSelected,
            numberGapsSelected,
            gapLengthSelected,
            dataCacheStore,
            gapTypeSelected,
            magnetizingInductance,
            magnetizingInductanceUnit,
            tryingToSend: false,
            recentChange: false,
            hasError: false,
            computing: true,
        }
    },
    created() {
        this.simulationStore.$onAction((action) => {
            if (action.name == "calculateInductance" && this.$userStore.simulationCoreCalculatorSubsection == 'inductanceCalculator') {
                 setTimeout(() => this.tryToSend(), 10);
            }
        })
        this.$userStore.$onAction((action) => {
            if (action.name == "setSimulationCoreCalculatorSubsection") {
                var simulationCoreCalculatorSubsection = action.args[0]
                if (simulationCoreCalculatorSubsection == 'inductanceCalculator') {
                    const aux = Utils.guessBasicGappingParameters(this.$userStore.globalSimulation['magnetic']['core'])
                    this.gapTypeSelected = aux['gapType']
                    this.gapLengthSelected = aux['gapLength']
                    this.numberGapsSelected = aux['numberGaps']
                    this.numberTurnsSelected = this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns']
                    this.magnetizingInductance = this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] * 1000000;
                    this.magnetizingInductance =  Utils.removeTrailingZeroes(this.magnetizingInductance, 2)
                    this.magnetizingInductanceUnit = aux['unit']
                    this.recentChange = true
                    this.tryToSend()
                }
            }
        })

    },
    methods: {
        formatInductance(value) {
            const aux = Utils.formatInductance(value)
            this.magnetizingInductance =  Utils.removeTrailingZeroes(aux['label'], 2)
            this.magnetizingInductanceUnit = aux['unit']

        },
        computeInductance() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/get_inductance_from_number_turns_and_gapping'

            const globalSimulation = Utils.deepCopy(this.$userStore.globalSimulation)

            if (typeof(globalSimulation['magnetic']['core']['functionalDescription']['material']) != 'string') {
                globalSimulation['magnetic']['core']['functionalDescription']['material'] = globalSimulation['magnetic']['core']['functionalDescription']['material']['name']
            }
            const data = {}
            data['simulation'] = globalSimulation
            data['models'] = {gapReluctance: this.$userStore.selectedModels['gapReluctance'].toUpperCase()}
            this.$axios.post(url, data)
            .then(response => {
                console.log(response.data)
                this.computing = false
                this.formatInductance(response.data)
                this.$userStore.globalSimulation['inputs']['designRequirements']['magnetizingInductance']['nominal'] = response.data
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
                            this.computeInductance()
                        }
                    }
                }
                , 500);
            }
        },
        loadGapParameters() {
            const aux = Utils.guessBasicGappingParameters(this.$userStore.globalSimulation['magnetic']['core'])
            this.gapTypeSelected = aux['gapType']
            this.gapLengthSelected = aux['gapLength']
            this.numberGapsSelected = aux['numberGaps']
            this.recentChange = true
            this.tryToSend()
        },
        onLengthUpdate(name, newValue, oldValue) {
            if (newValue != oldValue && newValue) {
                this.gapLengthSelected = newValue
                const gapping = Utils.deepCopy(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'])
                for (let i = 0; i < gapping.length; i++) {
                    if (gapping[i]['type'] != 'residual') {
                        gapping[i]['length'] = Number(Utils.removeTrailingZeroes(Utils.roundWithDecimals(this.gapLengthSelected / 1000, 0.00001), 5))
                    }
                }
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = gapping
                this.recentChange = true
                this.tryToSend()
            }
        },
        onGapTypeChange() {
            if (this.gapTypeSelected == "Ungapped") {
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = Defaults.defaultUngappedGapping
            }
            else if (this.gapTypeSelected == "Grinded") {
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = Defaults.defaultGrindedGapping
            }
            else if (this.gapTypeSelected == "Spacer") {
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = Defaults.defaultSpacerGapping
            }
            else if (this.gapTypeSelected == "Distributed") {
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = Defaults.defaultDistributedGapping
            }

            if (this.$userStore.globalSimulation['magnetic']['core']['processedDescription'] == null) {
                Utils.getSimulationParameters(this.$userStore, () => {this.loadGapParameters();}, () => {})
            }
            else {
                const previousGapLength = this.gapLengthSelected
                this.loadGapParameters();
                this.onLengthUpdate(null, previousGapLength, null)
            }
        },
        onNumberTurnsUpdate(name, newValue, oldValue) {
            if (newValue != oldValue && newValue) {
                this.numberTurnsSelected = newValue
                this.$userStore.globalSimulation['magnetic']['winding']['functionalDescription'][0]['numberTurns'] = newValue
                this.recentChange = true
                this.tryToSend()
            }
        },
        onNumberGapsUpdate(name, newValue, oldValue) {
            if (newValue != oldValue && newValue) {
                const gapping = Utils.deepCopy(this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'])
                const newGapping = []
                for (let i = 0; i < newValue; i++) {
                    const length = Number(Utils.removeTrailingZeroes(Utils.roundWithDecimals(this.gapLengthSelected / 1000, 0.00001), 5))
                    newGapping.push({type: 'subtractive', length: length})
                }
                for (let i = 0; i < gapping.length; i++) {
                    if (gapping[i]['type'] == 'residual') {
                        newGapping.push(gapping[i])
                    }
                }
                this.$userStore.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = newGapping
                this.numberGapsSelected = newValue
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


            <div class="mt-1"></div>
            <label class="rounded-2 fs-5 col-12">Gap info</label>

            <label v-tooltip="'Type of gap. Go to Gaping Artisan for advanced customization.'" class="rounded-2 fs-6 text-white offset-1 col-4">Type:</label>
            <Field name="quickGapTypeField" ref="quickGapTypeFieldRef" as="select" :class="{'is-invalid': errors.quickGapTypeField }" @change="onGapTypeChange" class= "rounded-2 bg-light text-white  col-6" v-model="gapTypeSelected" >
                <option disabled value="">Please select one</option>
                <option value="Ungapped">Ungapped</option>
                <option value="Grinded">Grinded</option>
                <option value="Spacer">Spacer</option>
                <option value="Distributed">Distributed</option>
                <option disabled value="Custom">Custom</option>
            </Field>
            <div class="invalid-feedback">{{errors.quickGapTypeField}}</div>


            <label v-tooltip="gapTypeSelected!='Residual'? 'Length of the gap, in mm' : 'Residual length cannot be changed'" class="rounded-2 fs-6 text-white offset-1 col-4 mt-3">Length:</label>
            <vue-number-input :disabled="gapTypeSelected == 'Ungapped'" controls class="col-5 mt-2"  :class="{ 'is-invalid': errors.gapLengthField }" 
                :modelValue="gapLengthSelected"
                @update:model-value="onLengthUpdate"
                :size="'small'"
                :name="'gapLengthField'"
                :center="true"
                :readonly="gapTypeSelected=='Residual'"
                :min="0.001"
                :step="0.1"
                :max="1000">
                </vue-number-input>
            <label class="small-text col-1 text-start mt-3 fs-6">mm</label>


            <label v-tooltip="gapTypeSelected!='Residual'? 'Length of the gap, in mm' : 'Residual length cannot be changed'" class="rounded-2 fs-6 text-white offset-1 col-4 mt-3">No. gaps:</label>
            <vue-number-input  :disabled="gapTypeSelected != 'Distributed'" controls class="col-5 mt-2"  :class="{ 'is-invalid': errors.numberGapsField }" 
                :modelValue="numberGapsSelected"
                @update:model-value="onNumberGapsUpdate"
                :size="'small'"
                :name="'numberGapsField'"
                :center="true"
                :readonly="gapTypeSelected=='Residual'"
                :min="1"
                :step="1"
                :max="100">
            </vue-number-input>

            <div class="mt-4"></div>
            <div class="border-top mb-3"></div>

            <img id="svg" v-if="computing" class="mx-auto d-block col-12" alt="loading" style="width: 25%; height: auto;" src="/images/loading.gif">
            <label v-if="!computing" class="fs-5 col-6 text-start text-info">Inductance:</label>
            <label v-if="!computing" class="fs-5 bg-light text-white col-3 text-end">{{magnetizingInductance}}</label>
            <label v-if="!computing" class="fs-5 col-3 text-end" >{{magnetizingInductanceUnit}}</label>


        </Form>
    </div>
</template>


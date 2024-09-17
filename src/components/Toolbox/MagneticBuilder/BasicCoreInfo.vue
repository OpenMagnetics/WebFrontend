<script setup>
import { useMasStore } from '/src/stores/mas'
import { removeTrailingZeroes, deepCopy } from '/src/assets/js/utils.js'
import DimensionReadOnly from '/src/components/DataInput/DimensionReadOnly.vue'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
        core: {
            type: Object,
            required: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const coreTemperatureDependantParametersData = {};
        const coreLossesData = {};
        const magnetizingInductance = 0;
        const magnetizingInductanceCheck = false;

        return {
            masStore,
            coreTemperatureDependantParametersData,
            coreLossesData,
            magnetizingInductance,
            magnetizingInductanceCheck,
        }
    },
    computed: {
        inputStyleClassMagneticFluxDensity() {
            if (this.coreLossesData.magneticFluxDensityPeak < this.coreTemperatureDependantParametersData.magneticFluxDensitySaturation * 0.85) {
                return 'col-6 text-white';
            }
            else {
                return 'col-6 text-danger';
            }
        },
        inputStyleClassMagnetizingInductance() {
            if (this.magnetizingInductanceCheck) {
                return 'col-6 text-white';
            }
            else {
                return 'col-6 text-danger';
            }
        },
    },
    watch: {
        'core': {
            handler(newValue, oldValue) {
                this.calculateCoreEffectiveParameters();
                this.calculateCoreLosses();
            },
          deep: true
        },
        'masStore.mas.magnetic.coil.functionalDescription': {
            handler(newValue, oldValue) {
                this.calculateCoreEffectiveParameters();
                this.calculateCoreLosses();
            },
          deep: true
        },
    },
    mounted () {
        this.calculateCoreEffectiveParameters();
        this.calculateCoreLosses();
    },
    methods: {
        calculateCoreEffectiveParameters() {
            if (this.core['functionalDescription']['shape'] != "") {
                if (this.core['processedDescription'] == null) {
                    this.$mkf.ready.then(_ => {

                        const aux = deepCopy(this.core);
                        aux['geometricalDescription'] = null;
                        aux['processedDescription'] = null;
                        if (typeof(aux['functionalDescription']['shape']) == "string") {
                            const result = this.$mkf.get_shape_data(aux['functionalDescription']['shape']);

                            if (result.startsWith("Exception")) {
                                console.error(result);
                                return;
                            }
                            else {
                                aux['functionalDescription']['shape'] = JSON.parse(result);
                            }

                        }
                        if (aux['functionalDescription']['shape']['family'] == "t") {
                            aux['functionalDescription']['type'] = "toroidal";
                            aux['functionalDescription']['gapping'] = [];
                        }
                        else {
                            aux['functionalDescription']['type'] = "two-piece set";
                        }

                        if (aux['functionalDescription']['shape']['familySubtype'] != "null" && aux['functionalDescription']['shape']['familySubtype'] != null) {
                            aux['functionalDescription']['shape']['familySubtype'] = String(aux['functionalDescription']['shape']['familySubtype']);
                        }
                        const coreJson = this.$mkf.calculate_core_data(JSON.stringify(aux), false);
                        if (coreJson.startsWith("Exception")) {
                            console.error(coreJson);
                            return;
                        }
                        else {
                            this.masStore.mas.magnetic.core = JSON.parse(coreJson);
                        }

                    }).catch(error => {
                        console.error(error);
                    });
                }
            }
        },
        calculateCoreLosses() {
            if (this.core['functionalDescription']['shape'] != "" && this.core['functionalDescription']['material'] != "") {
                this.$mkf.ready.then(_ => {
                    if (!('gapReluctance' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['gapReluctance'] = Defaults.reluctanceModelDefault
                    }
                    if (!('coreLosses' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['coreLosses'] = Defaults.coreLossesModelDefault
                    }
                    if (!('coreTemperature' in this.$userStore.selectedModels)) {
                        this.$userStore.selectedModels['coreTemperature'] = Defaults.coreTemperatureModelDefault
                    }
                    const modelsData = {coreLosses: this.$userStore.selectedModels['coreLosses'].toUpperCase(),
                                  coreTemperature: this.$userStore.selectedModels['coreTemperature'].toUpperCase(),
                                  gapReluctance: this.$userStore.selectedModels['gapReluctance'].toUpperCase().replace(" ", "_")};
                    this.coreLossesData = JSON.parse(this.$mkf.calculate_core_losses(JSON.stringify(this.masStore.mas.magnetic.core),
                                                                                JSON.stringify(this.masStore.mas.magnetic.coil),
                                                                                JSON.stringify(this.masStore.mas.inputs),
                                                                                JSON.stringify(modelsData)));
                    this.coreTemperatureDependantParametersData = JSON.parse(this.$mkf.get_core_temperature_dependant_parameters(JSON.stringify(this.masStore.mas.magnetic.core), this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature));

                    this.magnetizingInductance = JSON.parse(this.$mkf.calculate_inductance_from_number_turns_and_gapping(JSON.stringify(this.masStore.mas.magnetic.core),
                                                                                                             JSON.stringify(this.masStore.mas.magnetic.coil),
                                                                                                             JSON.stringify(this.masStore.mas.inputs.operatingPoints[0]),
                                                                                                             JSON.stringify(modelsData)));

                    this.magnetizingInductanceCheck = this.$mkf.check_requirement(JSON.stringify(this.masStore.mas.inputs.designRequirements.magnetizingInductance), this.magnetizingInductance);
                })
            }
        },
    }
}
</script>

<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom border-top pt-2">
        <div v-if="core.processedDescription != null" class="row">
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start"
                :name="'L'"
                :subscriptName="'eff'"
                :unit="'m'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-EffectiveLength'"
                :numberDecimals="2"
                :value="core.processedDescription.effectiveParameters.effectiveLength"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'A'"
                :subscriptName="'eff'"
                :unit="'m²'"
                :power="2"
                :dataTestLabel="dataTestLabel + '-EffectiveArea'"
                :numberDecimals="1"
                :value="core.processedDescription.effectiveParameters.effectiveArea"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start"
                :name="'V'"
                :subscriptName="'eff'"
                :unit="'m³'"
                :power="3"
                :dataTestLabel="dataTestLabel + '-EffectiveVolume'"
                :numberDecimals="1"
                :value="core.processedDescription.effectiveParameters.effectiveVolume"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'A'"
                :subscriptName="'min'"
                :unit="'m²'"
                :power="2"
                :dataTestLabel="dataTestLabel + '-MinimumArea'"
                :numberDecimals="1"
                :value="core.processedDescription.effectiveParameters.minimumArea"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start"
                :name="'μ'"
                :subscriptName="'ini'"
                :unit="null"
                :power="1"
                :dataTestLabel="dataTestLabel + '-InitialPermeability'"
                :numberDecimals="0"
                :value="coreTemperatureDependantParametersData.initialPermeability"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'μ'"
                :subscriptName="'eff'"
                :unit="null"
                :power="1"
                :dataTestLabel="dataTestLabel + '-EffectivePermeability'"
                :numberDecimals="0"
                :value="coreTemperatureDependantParametersData.effectivePermeability"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start"
                :name="'A'"
                :subscriptName="'L'"
                :unit="'H/tu²'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-Permeance'"
                :numberDecimals="0"
                :value="coreTemperatureDependantParametersData.permeance"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'B'"
                :subscriptName="'sat'"
                :unit="'T'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-MagneticFluxDensitySaturation'"
                :numberDecimals="3"
                :value="coreTemperatureDependantParametersData.magneticFluxDensitySaturation"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start text-white"
                :name="'B'"
                :subscriptName="'peak'"
                :unit="'T'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-MagneticFluxDensityPeak'"
                :numberDecimals="3"
                :value="coreLossesData.magneticFluxDensityPeak"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassMagneticFluxDensity"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'B'"
                :subscriptName="'ACpeak'"
                :unit="'T'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-MagneticFluxDensityAcPeak'"
                :numberDecimals="3"
                :value="coreLossesData.magneticFluxDensityAcPeak"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassMagneticFluxDensity"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start"
                :name="'L'"
                :unit="'H'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-MagnetizingInductance'"
                :numberDecimals="2"
                :value="magnetizingInductance"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassMagnetizingInductance"
            />
            <DimensionReadOnly 
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'P'"
                :subscriptName="'core'"
                :unit="'W'"
                :power="1"
                :dataTestLabel="dataTestLabel + '-CoreLosses'"
                :numberDecimals="2"
                :value="coreLossesData.coreLosses"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

        </div>
    </div>
</template>
<script setup>
import { useMasStore } from '/src/stores/mas'
import { removeTrailingZeroes, deepCopy, checkAndFixMas } from '/src/assets/js/utils.js'
import DimensionReadOnly from '/src/components/DataInput/DimensionReadOnly.vue'
import { wireMaterialDefault } from '/src/assets/js/defaults.js'
import { tooltipsMagneticBuilder } from '/src/assets/js/texts.js'
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
        wire: {
            type: Object,
            required: true,
        },
        windingIndex: {
            type: Number,
            default: 0,
        },
    },
    data() {
        const masStore = useMasStore();
        const dcResistancePerMeter = 0;
        const skinAcResistancePerMeter = 0;
        const skinAcFactor = 0;
        const dcLossesPerMeter = 0;
        const skinAcLossesPerMeter = 0;
        const outerDimensions = 0;
        const effectiveCurrentDensity = 0;
        const effectiveSkinDepth = 0;
        const turnsRatio = 1;

        return {
            masStore,
            dcResistancePerMeter,
            skinAcResistancePerMeter,
            skinAcFactor,
            dcLossesPerMeter,
            skinAcLossesPerMeter,
            outerDimensions,
            effectiveCurrentDensity,
            effectiveSkinDepth,
            turnsRatio,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    width: '200px',
                    "text-align": "start",
                },
            }
        },
        inputStyleClassCurrentDensity() {
            if (this.effectiveCurrentDensity < 12) {
                return 'col-6 text-white';
            }
            else {
                return 'col-6 text-danger';
            }
        },
        inputStyleClassSkinAcFactor() {
            if (this.skinAcFactor < 2) {
                return 'col-6 text-white';
            }
            else {
                return 'col-6 text-danger';
            }
        },
        inputStyleClassouterDimensionsWidth() {
            if (this.masStore.mas.magnetic.coil.bobbin != "Dummy") {
                if (this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].width != null) {
                    if (this.outerDimensions[0] < this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].width) {
                        return 'col-6 text-white';
                    }
                    else {
                        return 'col-6 text-danger';
                    }
                }
            }
        },
        inputStyleClassouterDimensionsHeight() {
            if (this.masStore.mas.magnetic.coil.bobbin != "Dummy") {
                if (this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].height != null) {
                    if (this.outerDimensions[1] < this.masStore.mas.magnetic.coil.bobbin.processedDescription.windingWindows[0].height) {
                        return 'col-6 text-white';
                    }
                    else {
                        return 'col-6 text-danger';
                    }
                }
            }
        },
        inputStyleClassTurnsRatio() {
            this.$mkf.ready.then(_ => {
                if (this.windingIndex > 0) {
                    this.turnsRatioCheck = this.$mkf.check_requirement(JSON.stringify(this.masStore.mas.inputs.designRequirements.turnsRatios[this.windingIndex - 1]), this.turnsRatio);
                }
                if (this.turnsRatioCheck) {
                    return 'col-6 text-white';
                }
                else {
                    return 'col-6 text-danger';
                }
            })
        },
    },
    watch: {
        'masStore.mas.magnetic.coil.functionalDescription': {
            handler(newValue, oldValue) {
                this.calculateWireData();
            },
          deep: true
        },
    },
    mounted () {
        this.calculateWireData();
        checkAndFixMas(this.masStore.mas, this.$mkf).then(response => {
            this.masStore.mas = response;
        })
        .catch(error => {
            console.error(error.data)
        });
    },
    methods: {
        calculateWireData() {
            if (this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != "" &&
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != "Dummy" &&
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire != null) {
                this.$mkf.ready.then(_ => {
                    const wireString = JSON.stringify(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire);
                    const currentString = JSON.stringify(this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[this.windingIndex].current);
                    var wireMaterial = wireMaterialDefault;
                    if (this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.material != null) {
                        wireMaterial = this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].wire.material;
                    }

                    this.turnsRatio = this.masStore.mas.magnetic.coil.functionalDescription[0].numberTurns / this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberTurns;

                    this.dcResistancePerMeter = this.$mkf.calculate_dc_resistance_per_meter(wireString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                    this.skinAcResistancePerMeter = this.$mkf.calculate_skin_ac_resistance_per_meter(wireString, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                    this.skinAcFactor = this.$mkf.calculate_skin_ac_factor(wireString, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                    this.dcLossesPerMeter = this.$mkf.calculate_dc_losses_per_meter(wireString, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                    this.skinAcLossesPerMeter = this.$mkf.calculate_skin_ac_losses_per_meter(wireString, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                    const outerDimensionsHandle = this.$mkf.get_outer_dimensions(wireString);
                    this.outerDimensions = [outerDimensionsHandle.get(0), outerDimensionsHandle.get(1)];

                    this.effectiveCurrentDensity = this.$mkf.calculate_effective_current_density(wireString, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature) / 1000000 / this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberParallels;

                    this.effectiveSkinDepth = this.$mkf.calculate_effective_skin_depth(wireMaterial, currentString, this.masStore.mas.inputs.operatingPoints[0].conditions.ambientTemperature);

                }).catch(error => {
                    console.error(error);
                });
            }
        },
    }
}
</script>

<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom border-top pt-2">
        <div class="row" v-tooltip="styleTooltip">
            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.dcResistancePerMeter"
                class="col-xl-6 col-lg-12 text-start"
                :name="'R'"
                :subscriptName="'DC'"
                :unit="'Ω/m'"
                :dataTestLabel="dataTestLabel + '-Rdc'"
                :numberDecimals="2"
                :value="dcResistancePerMeter"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.skinResistancePerMeter"
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'R'"
                :subscriptName="'sk.AC'"
                :unit="'Ω/m'"
                :dataTestLabel="dataTestLabel + '-Rac'"
                :numberDecimals="2"
                :value="skinAcResistancePerMeter"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.ohmicLossesPerMeter"
                class="col-xl-6 col-lg-12 text-start"
                :name="'P'"
                :subscriptName="'DC'"
                :unit="'W/m'"
                :dataTestLabel="dataTestLabel + '-Pdc'"
                :numberDecimals="2"
                :value="dcLossesPerMeter"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.skinLossesPermeter"
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'P'"
                :subscriptName="'sk.AC'"
                :unit="'W/m'"
                :dataTestLabel="dataTestLabel + '-Pac'"
                :numberDecimals="2"
                :value="skinAcLossesPerMeter"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.effectiveCurrentDensity"
                class="col-xl-6 col-lg-12 text-start"
                :name="'J'"
                :subscriptName="'eff'"
                :unit="'A/mm²'"
                :dataTestLabel="dataTestLabel + '-Jeff'"
                :numberDecimals="2"
                :value="effectiveCurrentDensity"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassCurrentDensity"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.effectiveSkinDepth"
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'δ'"
                :subscriptName="'eff'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-EffectiveSkinDepth'"
                :numberDecimals="2"
                :value="effectiveSkinDepth"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="'col-6 text-white'"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.wireWidth"
                class="col-xl-6 col-lg-12 text-start"
                :name="'Width'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-OuterWidth'"
                :numberDecimals="2"
                :value="outerDimensions[0]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassouterDimensionsWidth"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.skinFactor"
                class="col-xl-6 col-lg-12 text-start border-start"
                :name="'F'"
                :subscriptName="'skin'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-EffectiveSkinAcFactor'"
                :numberDecimals="2"
                :value="skinAcFactor"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassSkinAcFactor"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.wireHeight"
                class="col-xl-6 col-lg-12 text-start"
                :name="'Height'"
                :unit="'m'"
                :dataTestLabel="dataTestLabel + '-OuterHeight'"
                :numberDecimals="2"
                :value="outerDimensions[1]"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassouterDimensionsHeight"
            />

            <DimensionReadOnly 
                v-tooltip="tooltipsMagneticBuilder.turnsRatio"
                class="col-xl-6 col-lg-12 text-start border-start"
                v-if="windingIndex > 0"
                :name="'T'"
                :subscriptName="'ratio'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-TurnsRatio'"
                :numberDecimals="2"
                :value="turnsRatio"
                :useTitleCase="false"
                :disableShortenLabels="true"
                :labelStyleClass="'col-4'"
                :dimensionStyleClass="'col-8'"
                :inputStyleClass="inputStyleClassTurnsRatio"
            />


        </div>
    </div>
</template>
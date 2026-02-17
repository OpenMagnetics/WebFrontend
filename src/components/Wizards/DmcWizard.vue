<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import { defaultDmcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
</script>

<script>
// NOTE: This wizard does not yet use ConverterWizardBase layout.
// TODO: Migrate to ConverterWizardBase for layout consistency.
// Navigation methods (processAndReview/processAndAdvise) follow the standard pattern
// and could use ConverterWizardBase.navigateToReview/navigateToAdvise once migrated.

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'DmcWizard',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-8'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-4'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const configurationOptions = ['Single phase', 'Three phases', 'Three phases with neutral'];
        const errorMessage = "";
        const localData = deepCopy(defaultDmcWizardInputs);
        return {
            masStore,
            taskQueueStore,
            configurationOptions,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            simulationError: "",
            verificationResults: null,
            designProposal: null,
        }
    },
    computed: {
    },
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.lineFrequency <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Line frequency must be positive";
            }
            if (this.localData.operatingCurrent <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Operating current must be positive";
            }
            if (this.localData.minimumInductance <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Minimum inductance must be positive";
            }
            if (this.localData.filterCapacitance <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Filter capacitance must be positive";
            }

            this.localData.attenuationPoints.forEach((elem, index) => {
                if (elem.frequency <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Attenuation frequency cannot be zero";
                }
                if (elem.attenuation <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Attenuation cannot be zero";
                }
            })
        },
        configurationSelected(config) {
            this.localData.configuration = config;
            this.updateErrorMessage();
        },
        updateAttenuationPoints(newNumber) {
            if (newNumber > this.localData.attenuationPoints.length) {
                const diff = newNumber - this.localData.attenuationPoints.length;
                for (let i = 0; i < diff; i++) {
                    var newPoint;
                    if (this.localData.attenuationPoints.length == 0) {
                        newPoint = {
                            frequency: defaultDmcWizardInputs.attenuationPoints[0].frequency,
                            attenuation: defaultDmcWizardInputs.attenuationPoints[0].attenuation,
                        }
                    }
                    else {
                        newPoint = {
                            frequency: this.localData.attenuationPoints[this.localData.attenuationPoints.length - 1].frequency * 2,
                            attenuation: this.localData.attenuationPoints[this.localData.attenuationPoints.length - 1].attenuation,
                        }
                    }
                    this.localData.attenuationPoints.push(newPoint);
                }
            }
            else if (newNumber < this.localData.attenuationPoints.length) {
                const diff = this.localData.attenuationPoints.length - newNumber;
                this.localData.attenuationPoints.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },
        getConfigurationEnum() {
            switch (this.localData.configuration) {
                case 'Single phase': return 'SINGLE_PHASE';
                case 'Three phases': return 'THREE_PHASE';
                case 'Three phases with neutral': return 'THREE_PHASE_WITH_NEUTRAL';
                default: return 'SINGLE_PHASE';
            }
        },
        async process() {
            this.masStore.resetMas("filter")
            
            try {
                // Build DMC parameters for backend
                const dmcParams = {
                    configuration: this.getConfigurationEnum(),
                    inputVoltage: { nominal: 230 },
                    operatingCurrent: this.localData.operatingCurrent,
                    lineFrequency: this.localData.lineFrequency,
                    minimumInductance: this.localData.minimumInductance,
                    filterCapacitance: this.localData.filterCapacitance,
                    minimumImpedance: this.localData.attenuationPoints.map(p => ({
                        frequency: p.frequency,
                        impedance: { magnitude: 2 * Math.PI * p.frequency * this.localData.minimumInductance }
                    })),
                    ambientTemperature: this.localData.ambientTemperature
                };

                // Use backend to calculate inputs
                const inputs = await this.taskQueueStore.calculateDmcInputs(dmcParams);
                this.masStore.mas.inputs = inputs;

                // Set up functional description based on configuration
                const numWindings = this.getConfigurationEnum() === 'SINGLE_PHASE' ? 1 :
                                    this.getConfigurationEnum() === 'THREE_PHASE' ? 3 : 4;
                
                this.masStore.mas.magnetic.coil.functionalDescription = [];
                const windingNames = ['Primary', 'Secondary', 'Tertiary', 'Quaternary'];
                for (let i = 0; i < numWindings; i++) {
                    this.masStore.mas.magnetic.coil.functionalDescription.push({
                        "name": windingNames[i] || `Winding ${i + 1}`,
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    });
                }

                this.$stateStore.operatingPoints.modePerPoint[0] = this.$stateStore.OperatingPointsMode.HarmonicsList;
                this.errorMessage = "";
            } catch (error) {
                console.error(error);
                this.errorMessage = error.message || "Error processing DMC specification";
            }
        },
        async processAndReview() {
            await this.process();
            if (this.errorMessage != "") return;

            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Filter);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage != "") return;

            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Filter);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async proposeDesign() {
            this.simulatingWaveforms = true;
            this.simulationError = "";
            this.designProposal = null;

            try {
                const dmcParams = {
                    configuration: this.getConfigurationEnum(),
                    inputVoltage: { nominal: 230 },
                    operatingCurrent: this.localData.operatingCurrent,
                    lineFrequency: this.localData.lineFrequency,
                    filterCapacitance: this.localData.filterCapacitance,
                    minimumImpedance: this.localData.attenuationPoints.map(p => ({
                        frequency: p.frequency,
                        impedance: { magnitude: 2 * Math.PI * p.frequency * this.localData.minimumInductance }
                    })),
                    ambientTemperature: this.localData.ambientTemperature
                };

                this.designProposal = await this.taskQueueStore.proposeDmcDesign(dmcParams);

                // Update the local inductance if a better one was proposed
                if (this.designProposal.minimumInductance) {
                    this.localData.minimumInductance = this.designProposal.minimumInductance;
                }
            } catch (error) {
                console.error("DMC design proposal error:", error);
                this.simulationError = error.message || "Design proposal failed";
            } finally {
                this.simulatingWaveforms = false;
            }
        },
        async verifyAttenuation() {
            this.simulatingWaveforms = true;
            this.simulationError = "";
            this.verificationResults = null;

            try {
                const dmcParams = {
                    configuration: this.getConfigurationEnum(),
                    inputVoltage: { nominal: 230 },
                    operatingCurrent: this.localData.operatingCurrent,
                    lineFrequency: this.localData.lineFrequency,
                    filterCapacitance: this.localData.filterCapacitance,
                    minimumImpedance: this.localData.attenuationPoints.map(p => ({
                        frequency: p.frequency,
                        impedance: { magnitude: 2 * Math.PI * p.frequency * this.localData.minimumInductance }
                    })),
                    ambientTemperature: this.localData.ambientTemperature
                };

                const results = await this.taskQueueStore.verifyDmcAttenuation(
                    dmcParams,
                    this.localData.minimumInductance,
                    this.localData.filterCapacitance
                );

                this.verificationResults = results;
            } catch (error) {
                console.error("DMC verification error:", error);
                this.simulationError = error.message || "Attenuation verification failed";
            } finally {
                this.simulatingWaveforms = false;
            }
        },
        formatFrequency(freq) {
            if (freq >= 1e9) return (freq / 1e9).toFixed(1) + ' GHz';
            if (freq >= 1e6) return (freq / 1e6).toFixed(1) + ' MHz';
            if (freq >= 1e3) return (freq / 1e3).toFixed(1) + ' kHz';
            return freq.toFixed(0) + ' Hz';
        },
        formatInductance(ind) {
            if (ind >= 1) return ind.toFixed(2) + ' H';
            if (ind >= 1e-3) return (ind * 1e3).toFixed(2) + ' mH';
            if (ind >= 1e-6) return (ind * 1e6).toFixed(2) + ' µH';
            return (ind * 1e9).toFixed(2) + ' nH';
        },
        formatCapacitance(cap) {
            if (cap >= 1e-3) return (cap * 1e3).toFixed(2) + ' mF';
            if (cap >= 1e-6) return (cap * 1e6).toFixed(2) + ' µF';
            if (cap >= 1e-9) return (cap * 1e9).toFixed(2) + ' nF';
            return (cap * 1e12).toFixed(2) + ' pF';
        },
    }
}
</script>

<template>
    <div class="container ps-5">
        <div class="row my-3 ps-2">
            <label
                :style="combinedStyle([$styleStore.wizard.inputTitleFontSize, $styleStore.wizard.inputLabelBgColor, $styleStore.wizard.inputTextColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 col-12 p-0 text-center"
                :class="combinedClass([$styleStore.wizard.inputTitleFontSize, $styleStore.wizard.inputLabelBgColor, $styleStore.wizard.inputTextColor])"
            >
                {{'DMC Wizard'}}
            </label>
        </div>

        <!-- Configuration Selection -->
        <div class="row mt-2 ps-2">
            <ElementFromListRadio class="ps-3"
                :name="'configuration'"
                :dataTestLabel="dataTestLabel + '-Configuration'"
                :replaceTitle="'What configuration do you need?'"
                :options="configurationOptions"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-4'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputLabelBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <!-- Line Frequency -->
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'lineFrequency'"
                :replaceTitle="'What is your mains/line frequency?'"
                unit="Hz"
                :dataTestLabel="dataTestLabel + '-LineFrequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                v-model="localData"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <!-- Operating Current -->
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'operatingCurrent'"
                :replaceTitle="'What is your operating current?'"
                unit="A"
                :dataTestLabel="dataTestLabel + '-OperatingCurrent'"
                :min="minimumMaximumScalePerParameter['current']['min']"
                :max="minimumMaximumScalePerParameter['current']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <!-- Minimum Inductance -->
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'minimumInductance'"
                :replaceTitle="'What is your minimum inductance?'"
                unit="H"
                :dataTestLabel="dataTestLabel + '-MinimumInductance'"
                :min="minimumMaximumScalePerParameter['inductance']['min']"
                :max="minimumMaximumScalePerParameter['inductance']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <!-- Filter Capacitance -->
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'filterCapacitance'"
                :replaceTitle="'What is your filter capacitance (for LC filter)?'"
                unit="F"
                :dataTestLabel="dataTestLabel + '-FilterCapacitance'"
                :min="minimumMaximumScalePerParameter['capacitance']['min']"
                :max="minimumMaximumScalePerParameter['capacitance']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <!-- Attenuation Points -->
        <div class="row mt-2 ps-2">
            <ElementFromList class="ps-3"
                :name="'numberAttenuationPoints'"
                :replaceTitle="'How many attenuation requirements do you have?'"
                :dataTestLabel="dataTestLabel + '-NumberAttenuationPoints'"
                :options="Array.from({length: 10}, (_, i) => i)"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="valueWidthProportionClass"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateAttenuationPoints"
            />
        </div>
        <div class="row mt-2 ps-2">
            <div class="offset-2 col-9" v-for="(datum, index) in localData.attenuationPoints" :key="'attenuation-' + index">
                <PairOfDimensions
                    class="ps-3 border-top border-bottom pt-2"
                    :names="['frequency', 'attenuation']"
                    :units="['Hz', 'dB']"
                    :dataTestLabel="dataTestLabel + '-AttenuationPoints'"
                    :mins="[minimumMaximumScalePerParameter['frequency']['min'], 0]"
                    :maxs="[minimumMaximumScalePerParameter['frequency']['max'], 120]"
                    v-model="localData.attenuationPoints[index]"
                    :labelWidthProportionClass="labelWidthProportionClass"
                    :valueWidthProportionClass="valueWidthProportionClass"
                    :valueFontSize="$styleStore.wizard.inputFontSize"
                    :labelFontSize="$styleStore.wizard.inputFontSize"
                    :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                    :valueBgColor="$styleStore.wizard.inputValueBgColor"
                    :textColor="localData.attenuationPoints[index].frequency <= 0 || localData.attenuationPoints[index].attenuation <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                    @update="updateErrorMessage"
                />
            </div>
        </div>

        <!-- Ambient Temperature -->
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'ambientTemperature'"
                :replaceTitle="'What is the ambient temperature?'"
                unit="°C"
                :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
                :min="minimumMaximumScalePerParameter['temperature']['min']"
                :max="minimumMaximumScalePerParameter['temperature']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>

        <label
            class="text-danger col-12 pt-1"
            :style="$styleStore.wizard.inputFontSize">
        {{errorMessage}}</label>

        <!-- Attenuation Verification Section -->
        <div class="row mt-4 ps-2">
            <div class="col-12">
                <div class="card border-secondary">
                    <div class="card-header d-flex justify-content-between align-items-center" :style="$styleStore.wizard.inputLabelBgColor">
                        <span :style="$styleStore.wizard.inputTextColor"><i class="fa-solid fa-chart-line me-2"></i>LC Filter Analysis</span>
                        <div class="d-flex gap-2">
                            <button
                                :disabled="errorMessage != '' || simulatingWaveforms"
                                class="btn btn-sm"
                                :style="$styleStore.wizard.reviewButton"
                                @click="proposeDesign"
                            >
                                <span v-if="simulatingWaveforms"><i class="fa-solid fa-spinner fa-spin me-1"></i></span>
                                <span v-else><i class="fa-solid fa-lightbulb me-1"></i>Propose Design</span>
                            </button>
                            <button
                                :disabled="errorMessage != '' || simulatingWaveforms || localData.attenuationPoints.length === 0"
                                class="btn btn-sm"
                                :style="$styleStore.wizard.acceptButton"
                                @click="verifyAttenuation"
                            >
                                <span v-if="simulatingWaveforms"><i class="fa-solid fa-spinner fa-spin me-1"></i></span>
                                <span v-else><i class="fa-solid fa-check-circle me-1"></i>Verify Attenuation</span>
                            </button>
                        </div>
                    </div>
                    <div class="card-body" :style="$styleStore.wizard.inputValueBgColor">
                        <!-- Error message -->
                        <div v-if="simulationError" class="alert alert-danger mb-3">
                            <i class="fa-solid fa-exclamation-circle me-1"></i>{{ simulationError }}
                        </div>
                        
                        <!-- Design Proposal -->
                        <div v-if="designProposal" class="mb-3 p-3 border rounded" :style="$styleStore.wizard.inputTextColor">
                            <h6><i class="fa-solid fa-lightbulb me-1 text-warning"></i>Proposed Design</h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <strong>Inductance:</strong> {{ formatInductance(designProposal.minimumInductance) }}
                                </div>
                                <div class="col-md-4">
                                    <strong>Capacitance:</strong> {{ formatCapacitance(designProposal.filterCapacitance || localData.filterCapacitance) }}
                                </div>
                                <div class="col-md-4">
                                    <strong>Cutoff Frequency:</strong> {{ formatFrequency(designProposal.cutoffFrequency) }}
                                </div>
                            </div>
                        </div>

                        <!-- Verification Results table -->
                        <div v-if="verificationResults && verificationResults.length > 0">
                            <table class="table table-sm" :style="$styleStore.wizard.inputTextColor">
                                <thead>
                                    <tr>
                                        <th>Frequency</th>
                                        <th>Required</th>
                                        <th>Simulated</th>
                                        <th>Theoretical</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(result, index) in verificationResults" :key="index">
                                        <td>{{ formatFrequency(result.frequency) }}</td>
                                        <td>{{ result.requiredAttenuation.toFixed(1) }} dB</td>
                                        <td>{{ result.measuredAttenuation.toFixed(1) }} dB</td>
                                        <td>{{ result.theoreticalAttenuation.toFixed(1) }} dB</td>
                                        <td>
                                            <span v-if="result.passed" class="text-success"><i class="fa-solid fa-check-circle"></i> Pass</span>
                                            <span v-else class="text-danger"><i class="fa-solid fa-times-circle"></i> Fail</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Empty state -->
                        <div v-else-if="!designProposal" class="text-center py-3" :style="$styleStore.wizard.inputTextColor">
                            <i class="fa-solid fa-filter fa-2x mb-2 opacity-50"></i>
                            <p class="mb-0 opacity-75">Click "Propose Design" to get optimal L and C values, or "Verify Attenuation" to check your current design</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4 ps-2">
            <div class="offset-1 col-10 row">
                <button
                    :disabled="errorMessage != ''"
                    :style="$styleStore.wizard.reviewButton"
                    class="col-6 m-0 px-xl-3 px-md-0 btn"
                    @click="processAndReview"
                >
                {{'I want to review the specification'}}
                </button>
                <button
                    :disabled="errorMessage != ''"
                    :style="$styleStore.wizard.acceptButton"
                    class="col-6 m-0 px-xl-3 px-md-0 btn"
                    @click="processAndAdvise"
                >
                {{'I want go directly to designing'}}
                </button>
            </div>
        </div>
    </div>
</template>

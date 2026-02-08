<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'DabWizard',
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const localData = {
            inputVoltage: { nominal: 400, tolerance: 0.1 },
            outputVoltage: 400,
            outputPower: 1000,
            switchingFrequency: 100000,
            phaseShift: 30,
            efficiency: 0.97,
            seriesInductance: 0,
            useLeakageInductance: true,
            magnetizingInductance: 1e-3,
            turnsRatio: 1.0,
            ambientTemperature: 25,
            insulationType: 'Basic',
        };
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        return {
            masStore,
            taskQueueStore,
            localData,
            errorMessage: "",
            insulationTypes,
            simulatingWaveforms: false,
            waveformSource: '',
            waveformError: "",
            magneticWaveforms: [],
            converterWaveforms: [],
            designRequirements: null,
            simulatedTurnsRatios: null,
            numberOfPeriods: 2,
            numberOfSteadyStatePeriods: 1,
        }
    },
    methods: {
        updateErrorMessage() { this.errorMessage = ""; },
        
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
        
        async process() {
            this.masStore.resetMas("power");
            try {
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    switchingFrequency: this.localData.switchingFrequency,
                    phaseShift: this.localData.phaseShift,
                    efficiency: this.localData.efficiency,
                    seriesInductance: this.localData.seriesInductance,
                    useLeakageInductance: this.localData.useLeakageInductance,
                    desiredInductance: this.localData.magnetizingInductance,
                    desiredTurnsRatios: [this.localData.turnsRatio],
                    operatingPoints: [{
                        outputVoltages: [this.localData.outputVoltage],
                        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                        phaseShift: this.localData.phaseShift,
                        switchingFrequency: this.localData.switchingFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }]
                };
                const result = await this.taskQueueStore.calculateDabInputs(aux);
                if (result.error) {
                    this.errorMessage = result.error;
                    return false;
                }
                this.masStore.setInputs(result.masInputs);
                this.designRequirements = result.designRequirements;
                this.simulatedTurnsRatios = result.simulatedTurnsRatios;
                return true;
            } catch (error) {
                this.errorMessage = error.message || "Failed to process DAB inputs";
                return false;
            }
        },

        async processAndReview() {
            const success = await this.process();
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            this.$stateStore.operatingPoints.modePerPoint = [];
            this.masStore.mas.magnetic.coil.functionalDescription.forEach((_) => {
                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
            })
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },

        async processAndAdvise() {
            const success = await this.process();
            if (!success) {
                setTimeout(() => {this.errorMessage = ""}, 5000);
                return;
            }
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            this.$stateStore.operatingPoints.modePerPoint = [this.$stateStore.OperatingPointsMode.Manual];
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },

        async getAnalyticalWaveforms() {
            this.waveformSource = 'analytical';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    switchingFrequency: this.localData.switchingFrequency,
                    phaseShift: this.localData.phaseShift,
                    efficiency: this.localData.efficiency,
                    seriesInductance: this.localData.seriesInductance,
                    useLeakageInductance: this.localData.useLeakageInductance,
                    desiredInductance: this.localData.magnetizingInductance,
                    desiredTurnsRatios: [this.localData.turnsRatio],
                    operatingPoints: [{
                        outputVoltages: [this.localData.outputVoltage],
                        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                        phaseShift: this.localData.phaseShift,
                        switchingFrequency: this.localData.switchingFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }]
                };
                const result = await this.taskQueueStore.calculateDabInputs(aux);
                if (result.error) {
                    this.waveformError = result.error;
                } else {
                    // Process waveforms to ensure valid data structure
                    console.log('Raw waveforms:', result.magneticWaveforms);
                    const processedWaveforms = (result.magneticWaveforms || []).map(wf => ({
                        ...wf,
                        waveforms: (wf.waveforms || []).filter(w => 
                            w && w.x && w.y && Array.isArray(w.x) && Array.isArray(w.y) && w.x.length > 0 && w.y.length > 0
                        ).map(w => ({
                            label: w.label || 'Unknown',
                            data: { x: w.x, y: w.y },
                            colorLabel: w.color || '#b18aea',
                            type: 'value',
                            position: 'left',
                            unit: w.unit || 'A',
                            numberDecimals: 3
                        }))
                    })).filter(wf => wf.waveforms.length > 0);
                    console.log('Processed waveforms:', processedWaveforms);
                    this.magneticWaveforms = processedWaveforms;
                    this.designRequirements = result.designRequirements;
                }
            } catch (error) {
                this.waveformError = error.message || "Failed to get analytical waveforms";
            }
            this.simulatingWaveforms = false;
        },

        async simulateIdealWaveforms() {
            this.waveformSource = 'simulation';
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                const aux = {
                    inputVoltage: this.localData.inputVoltage,
                    switchingFrequency: this.localData.switchingFrequency,
                    phaseShift: this.localData.phaseShift,
                    efficiency: this.localData.efficiency,
                    seriesInductance: this.localData.seriesInductance,
                    useLeakageInductance: this.localData.useLeakageInductance,
                    desiredInductance: this.localData.magnetizingInductance,
                    desiredTurnsRatios: [this.localData.turnsRatio],
                    operatingPoints: [{
                        outputVoltages: [this.localData.outputVoltage],
                        outputCurrents: [this.localData.outputPower / this.localData.outputVoltage],
                        phaseShift: this.localData.phaseShift,
                        switchingFrequency: this.localData.switchingFrequency,
                        ambientTemperature: this.localData.ambientTemperature,
                    }]
                };
                const result = await this.taskQueueStore.calculateDabInputs(aux);
                if (result.error) {
                    this.waveformError = result.error;
                } else {
                    // Process waveforms to ensure valid data structure
                    console.log('Raw waveforms (sim):', result.magneticWaveforms);
                    const processedWaveforms = (result.magneticWaveforms || []).map(wf => ({
                        ...wf,
                        waveforms: (wf.waveforms || []).filter(w => 
                            w && w.x && w.y && Array.isArray(w.x) && Array.isArray(w.y) && w.x.length > 0 && w.y.length > 0
                        ).map(w => ({
                            label: w.label || 'Unknown',
                            data: { x: w.x, y: w.y },
                            colorLabel: w.color || '#b18aea',
                            type: 'value',
                            position: 'left',
                            unit: w.unit || 'A',
                            numberDecimals: 3
                        }))
                    })).filter(wf => wf.waveforms.length > 0);
                    console.log('Processed waveforms (sim):', processedWaveforms);
                    this.magneticWaveforms = processedWaveforms;
                    this.designRequirements = result.designRequirements;
                }
            } catch (error) {
                this.waveformError = error.message || "Failed to simulate waveforms";
            }
            this.simulatingWaveforms = false;
        },
    },
}
</script>

<template>
    <div class="wizard-container container-fluid px-3">
        <div class="wizard-header text-center py-2 mb-3">
            <h4 class="wizard-title mb-0"><i class="fa-solid fa-right-left me-2"></i>DAB Wizard</h4>
        </div>
        <div class="row g-2">
            <div class="col-12 col-xl-3">
                <div class="d-flex flex-column gap-2">
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-gauge-high me-1"></i>Conditions</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'switchingFrequency'" :replaceTitle="'Sw. Freq'" unit="Hz" :min="minimumMaximumScalePerParameter['frequency']['min']" :max="minimumMaximumScalePerParameter['frequency']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'phaseShift'" :replaceTitle="'Ph. Shift'" unit="°" :min="0" :max="180" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'ambientTemperature'" :replaceTitle="'Temp'" unit="°C" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" :allowNegative="true" :allowZero="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'efficiency'" :replaceTitle="'Eff'" unit="%" :visualScale="100" :min="0.5" :max="1" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <ElementFromList :name="'insulationType'" :replaceTitle="'Insul'" :options="insulationTypes" :titleSameRow="true" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-cogs me-1"></i>Transformer</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'turnsRatio'" :replaceTitle="'Turns'" :unit="null" :min="0.1" :max="100" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'magnetizingInductance'" :replaceTitle="'Mag L'" unit="H" :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'seriesInductance'" :replaceTitle="'Ser L'" unit="H" :min="0" :max="minimumMaximumScalePerParameter['inductance']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <div class="form-check mt-2"><input class="form-check-input" type="checkbox" v-model="localData.useLeakageInductance" id="useLeakageInductance"><label class="form-check-label small" for="useLeakageInductance" :style="{ color: $styleStore.wizard.inputTextColor }">Use Leakage L</label></div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <span v-if="errorMessage" class="error-text"><i class="fa-solid fa-exclamation-triangle me-1"></i>{{ errorMessage }}</span>
                        <span v-else></span>
                        <div class="action-btns">
                            <button :disabled="errorMessage != ''" class="action-btn-sm secondary" @click="processAndReview"><i class="fa-solid fa-magnifying-glass me-1"></i>Review Specs</button>
                            <button :disabled="errorMessage != ''" class="action-btn-sm primary" @click="processAndAdvise"><i class="fa-solid fa-wand-magic-sparkles me-1"></i>Design Magnetic</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-4">
                <div class="d-flex flex-column gap-2">
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-plug me-1"></i>Input Voltage</div>
                        <div class="compact-body">
                            <DimensionWithTolerance :name="'inputVoltage'" :replaceTitle="''" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" :labelWidthProportionClass="'d-none'" :valueWidthProportionClass="'col-4'" v-model="localData.inputVoltage" :severalRows="true" :addButtonStyle="$styleStore.wizard.addButton" :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']" :titleFontSize="$styleStore.wizard.inputLabelFontSize" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                    <div class="compact-card">
                        <div class="compact-header"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Output</div>
                        <div class="compact-body ps-4">
                            <Dimension :name="'outputVoltage'" :replaceTitle="'Voltage'" unit="V" :min="minimumMaximumScalePerParameter['voltage']['min']" :max="minimumMaximumScalePerParameter['voltage']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                            <Dimension :name="'outputPower'" :replaceTitle="'Power'" unit="W" :min="1" :max="minimumMaximumScalePerParameter['power']['max']" v-model="localData" :labelWidthProportionClass="'col-5'" :valueWidthProportionClass="'col-7'" :valueFontSize="$styleStore.wizard.inputFontSize" :labelFontSize="$styleStore.wizard.inputLabelFontSize" :labelBgColor="'transparent'" :valueBgColor="$styleStore.wizard.inputValueBgColor" :textColor="$styleStore.wizard.inputTextColor" @update="updateErrorMessage"/>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-5">
                <div class="compact-card simulation-card h-100">
                    <div class="compact-header d-flex justify-content-between align-items-center">
                        <span><i class="fa-solid fa-wave-square me-1"></i>Waveforms</span>
                        <div class="d-flex align-items-center gap-2">
                            <div class="periods-selector">
                                <label class="periods-label">Periods:</label>
                                <select v-model.number="numberOfPeriods" class="periods-select"><option v-for="n in 10" :key="n" :value="n">{{ n }}</option></select>
                            </div>
                            <div class="periods-selector">
                                <label class="periods-label">Steady:</label>
                                <input v-model.number="numberOfSteadyStatePeriods" type="number" min="1" max="20" class="periods-select" style="width: 50px;" />
                            </div>
                            <div class="sim-btns">
                                <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn analytical" @click="getAnalyticalWaveforms" title="Get analytical waveforms">
                                    <span v-if="simulatingWaveforms && waveformSource === 'analytical'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                    <span v-else><i class="fa-solid fa-calculator"></i> Analytical</span>
                                </button>
                                <button :disabled="errorMessage != '' || simulatingWaveforms" class="sim-btn" @click="simulateIdealWaveforms" title="Simulate ideal waveforms">
                                    <span v-if="simulatingWaveforms && waveformSource === 'simulation'"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                    <span v-else><i class="fa-solid fa-play"></i> Simulated</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="compact-body simulation-body">
                        <div v-if="waveformError" class="error-text mb-2"><i class="fa-solid fa-exclamation-circle me-1"></i>{{ waveformError }}</div>
                        <div v-if="magneticWaveforms.length > 0">
                            <div v-for="(wf, index) in magneticWaveforms" :key="index" class="waveform-item">
                                <LineVisualizer 
                                    v-if="wf.waveforms && wf.waveforms.length > 0" 
                                    :data="wf.waveforms" 
                                    :xAxisOptions="getTimeAxisOptions()"
                                    :title="wf.operatingPointName || 'Waveforms'" 
                                    :titleFontSize="14" 
                                    :axisLabelFontSize="10" 
                                    :chartPaddings="{top: 35, left: 45, right: 45, bottom: 25}" 
                                    :bgColor="$styleStore.theme?.light || 'transparent'" 
                                    :lineColor="$styleStore.theme?.primary || '#b18aea'" 
                                    :textColor="$styleStore.wizard.inputTextColor?.color || '#ffffff'" 
                                    :chartStyle="'height: 140px'" 
                                    :toolbox="false" 
                                    :showPoints="false"
                                    :showGrid="false"
                                    :showAxisLines="false"
                                    :showAxisUnitLabels="false"/>
                            </div>
                        </div>
                        <div v-else class="empty-state-compact"><i class="fa-solid fa-wave-square"></i><span>Click <b>Analytical</b> or <b>Simulated</b> to generate</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.wizard-container { max-width: 1800px; margin: 0 auto; }
.wizard-header { background: linear-gradient(135deg, rgba(177, 138, 234, 0.12) 0%, rgba(100, 80, 180, 0.08) 100%); border-radius: 10px; border: 1px solid rgba(177, 138, 234, 0.2); }
.wizard-title { font-size: 1.2rem; font-weight: 600; color: #b18aea; }
.compact-card { background: rgba(30, 30, 40, 0.6); border: 1px solid rgba(177, 138, 234, 0.2); border-radius: 8px; overflow: hidden; }
.compact-header { padding: 6px 10px; background: rgba(177, 138, 234, 0.1); border-bottom: 1px solid rgba(177, 138, 234, 0.15); font-size: 0.8rem; font-weight: 500; color: #b18aea; }
.compact-body { padding: 8px; }
.simulation-card { min-height: 300px; }
.simulation-body { min-height: 250px; display: flex; flex-direction: column; }

/* Action Buttons */
.action-btns { display: flex; gap: 8px; }
.action-btn-sm { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
.action-btn-sm.primary { background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%); color: white; }
.action-btn-sm.secondary { background: rgba(177, 138, 234, 0.15); border: 1px solid rgba(177, 138, 234, 0.3); color: #b18aea; }
.action-btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* Sim Buttons */
.sim-btns { display: flex; gap: 4px; }
.sim-btn { background: linear-gradient(135deg, #b18aea 0%, #8b5cf6 100%); border: none; border-radius: 4px; padding: 4px 10px; color: white; font-size: 0.7rem; font-weight: 500; cursor: pointer; }
.sim-btn.analytical { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
.sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.periods-selector { display: flex; align-items: center; gap: 4px; }
.periods-label { font-size: 0.75rem; color: #888; }
.periods-select { background: rgba(0,0,0,0.3); border: 1px solid rgba(177, 138, 234, 0.3); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; color: inherit; }
.waveform-item { margin-bottom: 8px; }
.empty-state-compact { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.3); font-size: 0.9rem; gap: 8px; }
.empty-state-compact i { font-size: 2rem; }
.error-text { color: #ff6b6b; font-size: 0.8rem; }
.form-check-label.small { font-size: 0.75rem; }
</style>

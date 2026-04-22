<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { nextTick } from 'vue'
import { Offcanvas } from 'bootstrap'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { magneticAdviserWeights } from 'WebSharedComponents/assets/js/defaults.js'
import Advise from './MagneticAdviser/Advise.vue'
import AdviseDetails from './MagneticAdviser/AdviseDetails.vue'
</script>

<script>

const style = getComputedStyle(document.body);
const theme = {
  primary: style.getPropertyValue('--bs-primary'),
  secondary: style.getPropertyValue('--bs-secondary'),
  success: style.getPropertyValue('--bs-success'),
  info: style.getPropertyValue('--bs-info'),
  warning: style.getPropertyValue('--bs-warning'),
  danger: style.getPropertyValue('--bs-danger'),
  light: style.getPropertyValue('--bs-light'),
  dark: style.getPropertyValue('--bs-dark'),
  white: style.getPropertyValue('--bs-white'),
};

export default {
    emits: ["canContinue"],
    components: {
        Slider,
    },
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const adviseCacheStore = useAdviseCacheStore();
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();

        if (this.$settingsStore.magneticAdviserSettings.weights == null) {
            this.$settingsStore.magneticAdviserSettings.weights = magneticAdviserWeights;
        }

        const loading = false;
        const dataUptoDate = false;

        return {
            adviseCacheStore,
            masStore,
            taskQueueStore,
            loading,
            dataUptoDate,
            currentAdviseToShow: 0,
            detailMas: null,
        }
    },
    computed: {
        titledFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.$settingsStore.magneticAdviserSettings.weights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
            }
            return titledFilters;
        },
    },
    mounted () {
        // If we already have advises cached, show them as up-to-date
        if (!this.adviseCacheStore.noMasAdvises()) {
            this.dataUptoDate = true;
            this.currentAdviseToShow = this.adviseCacheStore.currentMasAdvises.length - 1;
        }
        // Otherwise, don't auto-launch - let user click the button
    },
    methods: {
        async calculateAdvisedMagnetics() {
            this.currentAdviseToShow = 0;

            // Timeout to give time to gif to load
            setTimeout(async () => {
                try {
                    if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                        const settings = await this.taskQueueStore.getSettings();
                        settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserSettings.allowDistributedGaps;
                        settings["coreIncludeStacks"] = this.$settingsStore.adviserSettings.allowStacks;
                        settings["useToroidalCores"] = this.$settingsStore.adviserSettings.allowToroidalCores;
                        settings["useOnlyCoresInStock"] = this.$settingsStore.adviserSettings.useOnlyCoresInStock;
                        await this.taskQueueStore.setSettings(settings);

                        // Ensure coreAdviseMode is a string, not an object
                        let coreAdviseMode = this.$settingsStore.adviserSettings.coreAdviseMode;
                        console.log('[MagneticAdviser] raw coreAdviseMode:', coreAdviseMode);
                        console.log('[MagneticAdviser] typeof coreAdviseMode:', typeof coreAdviseMode);
                        console.log('[MagneticAdviser] coreAdviseMode instanceof Object:', coreAdviseMode instanceof Object);
                        console.log('[MagneticAdviser] String(coreAdviseMode):', String(coreAdviseMode));
                        
                        // Handle case where it's an object or [object Object]
                        if (typeof coreAdviseMode === 'object' || String(coreAdviseMode) === '[object Object]') {
                            console.warn('[MagneticAdviser] coreAdviseMode was an object, resetting to default');
                            coreAdviseMode = "standard cores";
                            this.$settingsStore.adviserSettings.coreAdviseMode = coreAdviseMode;
                        }
                        
                        // Final safety: ensure it's a string
                        coreAdviseMode = String(coreAdviseMode);
                        console.log('[MagneticAdviser] final coreAdviseMode:', coreAdviseMode);
                        
                        const aux = await this.taskQueueStore.calculateAdvisedMagnetics(
                            this.masStore.mas.inputs,
                            this.$settingsStore.magneticAdviserSettings.weights,
                            this.$settingsStore.magneticAdviserSettings.maximumNumberResults,
                            coreAdviseMode
                        );

                        const data = aux["data"];

                        this.adviseCacheStore.currentMasAdvises = [];
                        data.forEach((datum) => {
                            this.adviseCacheStore.currentMasAdvises.push(datum);
                        })
                        this.$userStore.magneticAdviserSelectedAdvise = 0;
                        if (this.adviseCacheStore.currentMasAdvises.length > 0) {
                            this.$emit("canContinue", true);
                        }

                        this.loading = false;
                        this.dataUptoDate = true;

                    }
                    else {
                        console.error("No operating points found")
                        this.loading = false;
                    }
                } catch (error) {
                    console.error("Error calculating advising magnetics");
                    console.error(error);
                    this.loading = false;
                }
            }, 10);
        },
        changedInputValue(key, value) {
            this.dataUptoDate = false;
            this.$settingsStore.magneticAdviserSettings.weights[key] = value / 100;
        },
        maximumNumberResultsChangedInputValue(value) {
            this.dataUptoDate = false;
        },
        changedSliderValue(newkey, newValue) {
            this.dataUptoDate = false;
            const remainingValue = 100 - newValue;
            var valueInOthers = 0;
            for (let [key, value] of Object.entries(this.$settingsStore.magneticAdviserSettings.weights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    valueInOthers += value;
                }
            }
            for (let [key, value] of Object.entries(this.$settingsStore.magneticAdviserSettings.weights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    if (value == 0) {
                        this.$settingsStore.magneticAdviserSettings.weights[key] = remainingValue / 2;
                    }
                    else {
                        this.$settingsStore.magneticAdviserSettings.weights[key] = value / valueInOthers * remainingValue;
                    }
                }
            }
        },
        selectedMas(index) {
            this.$userStore.magneticAdviserSelectedAdvise = index;
            this.$emit("canContinue", true);
        },
        showDetails(index) {
            this.detailMas = deepCopy(this.adviseCacheStore.currentMasAdvises[index].mas);
            nextTick(() => {
                const offcanvasEl = document.getElementById('CoreAdviserDetailOffCanvas');
                if (offcanvasEl) {
                    const offcanvas = Offcanvas.getOrCreateInstance(offcanvasEl);
                    offcanvas.show();
                }
            });
        },
        adviseReady(index) {
            if (this.currentAdviseToShow < this.adviseCacheStore.currentMasAdvises.length - 1) {
                setTimeout(() => {this.currentAdviseToShow = this.currentAdviseToShow + 1}, 100);
            }
        },
        calculateAdvises(event) {
            this.loading = true;
            setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
        },
        loadAndGoToBuilder() {
            // Load the selected advise into masStore.mas
            if (this.adviseCacheStore.currentMasAdvises.length > 0 && this.$userStore.magneticAdviserSelectedAdvise != null) {
                this.masStore.setMas(deepCopy(this.adviseCacheStore.currentMasAdvises[this.$userStore.magneticAdviserSelectedAdvise].mas));
            }
            // Navigate back to magneticBuilder
            this.$stateStore.getCurrentToolState().subsection = 'magneticBuilder';
        },
        goBackToBuilder() {
            // Go back to magneticBuilder without selecting any new design
            this.$stateStore.getCurrentToolState().subsection = 'magneticBuilder';
        },

    }
}
</script>

<template>
    <AdviseDetails v-if="detailMas" :modelValue="detailMas"/>
    <div class="container-fluid py-3">
        <div class="row g-3">
            <!-- Sidebar Panel -->
            <aside class="col-12 col-lg-3">
                <div class="optim-panel h-100">
                    <div class="optim-header">
                        <i class="bi bi-sliders"></i>
                        <span>Optimization Weights</span>
                    </div>
                    <div class="optim-body">
                        <!-- Weight sliders -->
                        <div v-for="(value, key) in $settingsStore.magneticAdviserSettings.weights" :key="key"
                             class="optim-item">
                            <div class="optim-item-header">
                                <span class="optim-item-title">{{ titledFilters[key] }}</span>
                                <span class="optim-item-badge">{{ removeTrailingZeroes($settingsStore.magneticAdviserSettings.weights[key]) }}%</span>
                            </div>
                            <Slider
                                v-model="$settingsStore.magneticAdviserSettings.weights[key]"
                                :disabled="loading"
                                class="slider-primary"
                                :height="6"
                                :min="10"
                                :max="80"
                                :step="10"
                                :tooltips="false"
                                @change="changedSliderValue(key, $event)"
                            />
                        </div>

                        <!-- Max Results -->
                        <div class="optim-item optim-item-last">
                            <div class="optim-item-header">
                                <div class="d-flex flex-column">
                                    <span class="optim-item-title">Max Results</span>
                                    <small class="optim-item-sub">Number of designs to show</small>
                                </div>
                                <span class="optim-item-badge">{{ $settingsStore.magneticAdviserSettings.maximumNumberResults }}</span>
                            </div>
                            <Slider
                                v-model="$settingsStore.magneticAdviserSettings.maximumNumberResults"
                                :disabled="loading"
                                class="slider-primary"
                                :height="6"
                                :min="2"
                                :max="20"
                                :step="1"
                                :tooltips="false"
                            />
                        </div>
                    </div>
                    <div class="optim-footer">
                        <button
                            :disabled="loading"
                            :data-cy="dataTestLabel + '-calculate-mas-advises-button'"
                            class="optim-btn optim-btn-primary"
                            @click="calculateAdvises"
                        >
                            <i class="bi bi-rocket-takeoff-fill"></i>
                            <span>Get Advised Magnetics</span>
                        </button>
                        <button
                            :disabled="loading || !dataUptoDate || adviseCacheStore.currentMasAdvises == null || adviseCacheStore.currentMasAdvises.length == 0"
                            :data-cy="dataTestLabel + '-load-and-go-to-builder-button'"
                            class="optim-btn optim-btn-success"
                            @click="loadAndGoToBuilder"
                        >
                            <i class="bi bi-check-lg"></i>
                            <span>Load Selected</span>
                        </button>
                        <button
                            :disabled="loading"
                            :data-cy="dataTestLabel + '-go-back-to-builder-button'"
                            class="optim-btn optim-btn-outline-danger"
                            @click="goBackToBuilder"
                        >
                            <i class="bi bi-arrow-left"></i>
                            <span>Go Back</span>
                        </button>
                    </div>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="col-12 col-lg-9">
                <!-- Loading State -->
                <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center" style="min-height: 400px;">
                    <img :src="loadingGif" alt="Calculating..." class="rounded mb-3" style="width: 200px;" />
                    <p class="text-white-50">Analyzing magnetic designs...</p>
                </div>

                <!-- Results Grid -->
                <div v-else class="row g-3" style="max-height: calc(100vh - 220px); overflow-y: auto;">
                    <TransitionGroup name="card-fade">
                        <div 
                            v-for="(advise, adviseIndex) in adviseCacheStore.currentMasAdvises" 
                            v-if="adviseCacheStore.currentMasAdvises != null"
                            :key="adviseIndex"
                            class="col-12 col-md-6 col-xl-4"
                            :class="{ 'opacity-25': !dataUptoDate }"
                        >
                            <Advise
                                v-if="Object.values(titledFilters).length > 0 && currentAdviseToShow >= adviseIndex"
                                :adviseIndex="adviseIndex"
                                :masData="advise.mas"
                                :scoring="advise.scoringPerFilter"
                                :weightedTotalScoring="advise.weightedTotalScoring"
                                :selected="$userStore.magneticAdviserSelectedAdvise === adviseIndex"
                                graphType="bar"
                                @selectedMas="selectedMas(adviseIndex)"
                                @showDetails="showDetails(adviseIndex)"
                                @adviseReady="adviseReady(adviseIndex)"
                            />
                        </div>
                    </TransitionGroup>

                    <!-- Empty State -->
                    <div v-if="!adviseCacheStore.currentMasAdvises || adviseCacheStore.currentMasAdvises.length === 0" class="col-12">
                        <div class="d-flex flex-column align-items-center justify-content-center text-center py-5">
                            <div style="font-size: 4rem; opacity: 0.5;">🧲</div>
                            <h4 class="text-white-50 mt-3">No Results Yet</h4>
                            <p class="text-muted">Configure your preferences and click "Get Advised Magnetics" to start</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
/* Slider styling */
.slider-primary {
    --slider-connect-bg: var(--bs-primary);
    --slider-handle-bg: var(--bs-primary);
    --slider-bg: rgba(255, 255, 255, 0.1);
}

/* Setting item hover effect */
.setting-item:hover {
    background-color: rgba(255, 255, 255, 0.03);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    border-radius: 0.5rem;
}

/* ============ Optimization Weights panel ============ */
/* Theme shim: --bs-light is actually #2a2a2a (dark) and --bs-white is #d4d4d4 in this app,
   so semantic "light text" tokens must be built from literal rgb white. */
.optim-panel {
    --op-panel-1: color-mix(in srgb, var(--bs-light) 92%, #ffffff 8%);
    --op-panel-2: var(--bs-light);
    --op-border: rgba(255, 255, 255, 0.1);
    --op-border-strong: rgba(255, 255, 255, 0.2);
    --op-text: #f2f2f2;
    --op-text-muted: rgba(242, 242, 242, 0.7);

    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--op-panel-1) 0%, var(--op-panel-2) 100%);
    border: 1px solid var(--op-border);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    overflow: hidden;
}

.optim-header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid var(--op-border);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
}

.optim-header i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.45));
}

.optim-body {
    padding: 0.35rem 0.95rem 0.5rem 0.95rem;
    flex: 1;
}

.optim-item {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--op-border);
}

.optim-item.optim-item-last {
    border-bottom: 0;
}

.optim-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.55rem;
    gap: 0.5rem;
}

.optim-item-title {
    color: var(--op-text);
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.2;
}

.optim-item-sub {
    color: var(--op-text-muted);
    font-size: 0.7rem;
    line-height: 1.1;
}

.optim-item-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(var(--bs-primary-rgb), 0.22);
    color: var(--bs-primary);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.5);
}

.optim-footer {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.85rem 0.95rem 0.95rem 0.95rem;
    border-top: 1px solid var(--op-border);
    background: rgba(255, 255, 255, 0.03);
}

.optim-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.5rem 0.85rem;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: normal;
    line-height: 1.2;
}

.optim-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

.optim-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.optim-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: #ffffff;
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, #ffffff 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.optim-btn-success {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: #ffffff;
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, #ffffff 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.optim-btn-outline-danger {
    background: rgb(var(--bs-danger-rgb) / 0.15);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.55);
    color: var(--bs-danger);
}

.optim-btn-outline-danger:hover:not(:disabled) {
    background: rgb(var(--bs-danger-rgb) / 0.25);
    border-color: rgb(var(--bs-danger-rgb) / 0.75);
}

/* Transitions */
.card-fade-enter-active {
    transition: all 0.4s ease-out;
}

.card-fade-leave-active {
    transition: all 0.3s ease-in;
}

.card-fade-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}

.card-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>

<style src="@vueform/slider/themes/default.css"></style>
<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { nextTick } from 'vue'
import { Offcanvas } from 'bootstrap'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { magneticAdviserWeights } from '/WebSharedComponents/assets/js/defaults.js'
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

                        const aux = await this.taskQueueStore.calculateAdvisedMagnetics(
                            this.masStore.mas.inputs,
                            this.$settingsStore.magneticAdviserSettings.weights,
                            this.$settingsStore.magneticAdviserSettings.maximumNumberResults,
                            this.$settingsStore.adviserSettings.coreAdviseMode
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
                <div class="card bg-dark border-0 shadow-lg h-100">
                    <div class="card-header border-bottom border-secondary px-4 py-3">
                        <div class="d-flex align-items-center">
                            <i class="fa-solid fa-sliders text-primary me-2 fs-5"></i>
                            <h5 class="card-title mb-0 text-white">Optimization Weights</h5>
                        </div>
                    </div>
                    <div class="card-body px-4 py-4">
                        <!-- Weight sliders -->
                        <div v-for="(value, key) in $settingsStore.magneticAdviserSettings.weights" :key="key" 
                             class="setting-item d-flex flex-column py-3 border-bottom border-secondary">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h6 class="text-white mb-0">{{ titledFilters[key] }}</h6>
                                </div>
                                <span class="badge bg-primary text-black">{{ removeTrailingZeroes($settingsStore.magneticAdviserSettings.weights[key]) }}%</span>
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
                        <div class="setting-item d-flex flex-column py-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h6 class="text-white mb-0">Max Results</h6>
                                    <small class="text-secondary">Number of designs to show</small>
                                </div>
                                <span class="badge bg-primary text-black">{{ $settingsStore.magneticAdviserSettings.maximumNumberResults }}</span>
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
                    <div class="card-footer border-top border-secondary px-4 py-3">
                        <!-- Action buttons -->
                        <div class="d-grid gap-2">
                            <button 
                                :disabled="loading" 
                                :data-cy="dataTestLabel + '-calculate-mas-advises-button'" 
                                class="btn btn-primary" 
                                @click="calculateAdvises"
                            >
                                <i class="fa-solid fa-rocket me-2"></i>Get Advised Magnetics
                            </button>
                            <button 
                                :disabled="loading || !dataUptoDate || adviseCacheStore.currentMasAdvises == null || adviseCacheStore.currentMasAdvises.length == 0" 
                                :data-cy="dataTestLabel + '-load-and-go-to-builder-button'" 
                                class="btn btn-success" 
                                @click="loadAndGoToBuilder"
                            >
                                <i class="fa-solid fa-check me-2"></i>Load Selected
                            </button>
                            <button 
                                :disabled="loading" 
                                :data-cy="dataTestLabel + '-go-back-to-builder-button'" 
                                class="btn btn-outline-danger" 
                                @click="goBackToBuilder"
                            >
                                <i class="fa-solid fa-arrow-left me-2"></i>Go Back
                            </button>
                        </div>
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
                            class="col-12 col-md-6"
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
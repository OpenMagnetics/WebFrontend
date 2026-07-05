<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { nextTick } from 'vue'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { magneticAdviserWeights } from 'WebSharedComponents/assets/js/defaults.js'
import Advise from './MagneticAdviser/Advise.vue'
import AdviseDetails from './MagneticAdviser/AdviseDetails.vue'
import { kirchhoffHandoff, sendMagneticToKirchhoff } from '/src/composables/kirchhoffHandoff'
</script>

<script>

const style = getComputedStyle(document.body);
const theme = {
  primary: style.getPropertyValue('--p-primary'),
  secondary: style.getPropertyValue('--p-secondary'),
  success: style.getPropertyValue('--p-success'),
  info: style.getPropertyValue('--p-info'),
  warning: style.getPropertyValue('--p-warning'),
  danger: style.getPropertyValue('--p-danger'),
  light: style.getPropertyValue('--p-light'),
  dark: style.getPropertyValue('--p-dark'),
  white: style.getPropertyValue('--p-white'),
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
            adviseDetailsVisible: false,
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
        // Active only when Kirchhoff opened us to design a magnetic (?handoff=kirchhoff).
        kirchhoffActive() { return kirchhoffHandoff.value != null; },
    },
    mounted () {
        // Came from Kirchhoff and no advises yet → run the adviser immediately so the user just sees
        // "Analyzing…" then the results, with no manual clicks.
        if (this.kirchhoffActive && this.adviseCacheStore.noMasAdvises()) {
            this.calculateAdvises();
        }
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
                        
                        // Handle case where it's an object or [object Object]
                        if (typeof coreAdviseMode === 'object' || String(coreAdviseMode) === '[object Object]') {
                            coreAdviseMode = "standard cores";
                            this.$settingsStore.adviserSettings.coreAdviseMode = coreAdviseMode;
                        }
                        
                        // Final safety: ensure it's a string
                        coreAdviseMode = String(coreAdviseMode);
                        
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
            this.adviseDetailsVisible = true;
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
                // Snapshot wound_with groups by winding name from the current
                // (pre-advise) coil so we can re-apply them after setMas. The
                // adviser regenerates functionalDescription from scratch and
                // strips woundWith; without re-applying, center-tap wizards
                // (AHB-CT, Push-Pull, Forward-CT) lose the section-sharing
                // hint and a subsequent BasicCoilSelector.wind() throws
                // "Number of slots cannot be less than 1".
                const woundWithByName = {};
                const fdBefore = this.masStore.mas?.magnetic?.coil?.functionalDescription;
                if (Array.isArray(fdBefore)) {
                    for (const w of fdBefore) {
                        if (w?.name && Array.isArray(w.woundWith) && w.woundWith.length > 0) {
                            woundWithByName[w.name] = [...w.woundWith];
                        }
                    }
                }
                this.masStore.setMas(deepCopy(this.adviseCacheStore.currentMasAdvises[this.$userStore.magneticAdviserSelectedAdvise].mas));
                const fdAfter = this.masStore.mas?.magnetic?.coil?.functionalDescription;
                if (Array.isArray(fdAfter) && Object.keys(woundWithByName).length > 0) {
                    for (const w of fdAfter) {
                        if (w?.name && woundWithByName[w.name]) {
                            w.woundWith = woundWithByName[w.name];
                        }
                    }
                }
            }
            // Navigate back to magneticBuilder
            this.$stateStore.getCurrentToolState().subsection = 'magneticBuilder';
        },
        goBackToBuilder() {
            // Go back to magneticBuilder without selecting any new design
            this.$stateStore.getCurrentToolState().subsection = 'magneticBuilder';
        },
        // Send the selected advised design back to the Kirchhoff converter that opened us (cross-origin
        // handoff); Kirchhoff binds it into the converter and re-simulates.
        sendToKirchhoff() {
            this.sendAdviseToKirchhoff(this.$userStore.magneticAdviserSelectedAdvise);
        },
        // Send a specific advised design straight back to the Kirchhoff converter that opened us.
        sendAdviseToKirchhoff(index) {
            const advises = this.adviseCacheStore.currentMasAdvises;
            if (advises == null || index == null || advises[index] == null) return;
            this.$userStore.magneticAdviserSelectedAdvise = index;
            sendMagneticToKirchhoff(deepCopy(advises[index].mas));
        },

    }
}
</script>

<template>
    <AdviseDetails v-if="detailMas" v-model:visible="adviseDetailsVisible" :modelValue="detailMas"/>
    <div class="container-fluid py-3">
        <div class="row g-3">
            <!-- Sidebar Panel -->
            <aside class="col-12 lg:col-3">
                <div class="optim-panel h-100">
                    <div class="optim-header">
                        <i class="pi pi-sliders-h"></i>
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
                            <i class="pi pi-send"></i>
                            <span>Get Advised Magnetics</span>
                        </button>
                        <button
                            :disabled="loading || !dataUptoDate || adviseCacheStore.currentMasAdvises == null || adviseCacheStore.currentMasAdvises.length == 0"
                            :data-cy="dataTestLabel + '-load-and-go-to-builder-button'"
                            class="optim-btn optim-btn-success"
                            @click="loadAndGoToBuilder"
                        >
                            <i class="pi pi-check"></i>
                            <span>Load Selected</span>
                        </button>
                        <button
                            v-if="kirchhoffActive"
                            :disabled="loading || adviseCacheStore.currentMasAdvises == null || adviseCacheStore.currentMasAdvises.length == 0"
                            :data-cy="dataTestLabel + '-send-to-kirchhoff-button'"
                            class="optim-btn optim-btn-success"
                            @click="sendToKirchhoff"
                        >
                            <i class="pi pi-arrow-right-arrow-left"></i>
                            <span>Send to Kirchhoff</span>
                        </button>
                        <button
                            :disabled="loading"
                            :data-cy="dataTestLabel + '-go-back-to-builder-button'"
                            class="optim-btn optim-btn-outline-danger"
                            @click="goBackToBuilder"
                        >
                            <i class="pi pi-arrow-left"></i>
                            <span>Go Back</span>
                        </button>
                    </div>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="col-12 lg:col-9">
                <!-- Loading State -->
                <div v-if="loading" data-cy="magneticAdviser-loading" class="d-flex flex-column align-items-center justify-content-center" style="min-height: 400px;">
                    <img :src="loadingGif" alt="Calculating..." class="rounded mb-3" style="width: 200px;" />
                    <p class="text-white-50">Analyzing magnetic designs...</p>
                </div>

                <!-- Results Grid -->
                <div v-else class="row g-3" style="max-height: calc(100vh - 220px); overflow-y: auto;">
                    <TransitionGroup name="card-fade">
                        <div
                            v-for="(advise, adviseIndex) in adviseCacheStore.currentMasAdvises"
                            :key="advise.mas.magnetic.manufacturerInfo.reference + '-' + adviseIndex"
                            class="col-12 md:col-6 xl:col-4"
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
                                :kirchhoffActive="kirchhoffActive"
                                @selectedMas="selectedMas(adviseIndex)"
                                @showDetails="showDetails(adviseIndex)"
                                @adviseReady="adviseReady(adviseIndex)"
                                @sendToKirchhoff="sendAdviseToKirchhoff(adviseIndex)"
                            />
                        </div>
                    </TransitionGroup>

                    <!-- Empty State -->
                    <div v-if="!adviseCacheStore.currentMasAdvises || adviseCacheStore.currentMasAdvises.length === 0" class="col-12">
                        <div class="d-flex flex-column align-items-center justify-content-center text-center py-5">
                            <div style="font-size: 4rem; opacity: 0.5;">🧲</div>
                            <h4 class="text-white-50 mt-3">No Results Yet</h4>
                            <p class="text-color-secondary">Configure your preferences and click "Get Advised Magnetics" to start</p>
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
    --slider-connect-bg: var(--p-primary);
    --slider-handle-bg: var(--p-primary);
    --slider-bg: rgba(var(--p-white-rgb), 0.1);
}

/* Setting item hover effect */
.setting-item:hover {
    background-color: rgba(var(--p-white-rgb), 0.03);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    border-radius: 0.5rem;
}

/* ============ Optimization Weights panel ============ */
/* Theme shim: --p-light is actually #2a2a2a (dark) and --p-white is var(--p-light) in this app,
   so semantic "light text" tokens must be built from literal rgb white. */
.optim-panel {
    --op-panel-1: color-mix(in srgb, var(--p-light) 92%, var(--p-white) 8%);
    --op-panel-2: var(--p-light);
    --op-border: rgba(var(--p-white-rgb), 0.1);
    --op-border-strong: rgba(var(--p-white-rgb), 0.2);
    --op-text: var(--p-white);
    --op-text-color-secondary: rgba(var(--p-white-rgb), 0.7);

    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--op-panel-1) 0%, var(--op-panel-2) 100%);
    border: 1px solid var(--op-border);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(var(--p-black-rgb), 0.5),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
    overflow: hidden;
}

.optim-header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.75rem 1rem;
    background: rgba(var(--p-white-rgb), 0.04);
    border-bottom: 1px solid var(--op-border);
    color: var(--p-primary);
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
}

.optim-header i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.45));
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
    color: var(--op-text-color-secondary);
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
    background: rgba(var(--p-primary-rgb), 0.22);
    color: var(--p-primary);
    border: 1px solid rgba(var(--p-primary-rgb), 0.5);
}

.optim-footer {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.85rem 0.95rem 0.95rem 0.95rem;
    border-top: 1px solid var(--op-border);
    background: rgba(var(--p-white-rgb), 0.03);
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
        color-mix(in srgb, var(--p-primary) 115%, transparent 0%) 0%,
        var(--p-primary) 55%,
        rgb(var(--p-primary-rgb) / 0.85) 100%);
    color: var(--p-white);
    border: 1px solid color-mix(in srgb, var(--p-primary) 70%, var(--p-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--p-primary-rgb) / 0.35),
        0 2px 8px rgb(var(--p-primary-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--p-black-rgb), 0.25);
}

.optim-btn-success {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--p-success) 115%, transparent 0%) 0%,
        var(--p-success) 55%,
        rgb(var(--p-success-rgb) / 0.85) 100%);
    color: var(--p-white);
    border: 1px solid color-mix(in srgb, var(--p-success) 70%, var(--p-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--p-success-rgb) / 0.35),
        0 2px 8px rgb(var(--p-success-rgb) / 0.4),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.3);
    text-shadow: 0 1px 1px rgba(var(--p-black-rgb), 0.25);
}

.optim-btn-outline-danger {
    background: rgb(var(--p-danger-rgb) / 0.15);
    border: 1px solid rgb(var(--p-danger-rgb) / 0.55);
    color: var(--p-danger);
}

.optim-btn-outline-danger:hover:not(:disabled) {
    background: rgb(var(--p-danger-rgb) / 0.25);
    border-color: rgb(var(--p-danger-rgb) / 0.75);
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
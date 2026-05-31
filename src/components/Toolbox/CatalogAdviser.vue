<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import Advise from './CatalogAdviser/Advise.vue'
import { useCatalogStore } from '../../stores/catalog'
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
        // When true, run the adviser entirely in the browser via the MKF WASM
        // engine (cache must be pre-populated, e.g. via load_magnetics on boot).
        // When false (default), POST to the backend's /calculate_advised_magnetics
        // endpoint as before.
        useWasmCache: {
            type: Boolean,
            default: false,
        },
        // When true (default), shows a "Continue without search" button that
        // lets the user skip the catalogue and proceed to a custom design.
        // Set false from a parent application that handles its own navigation.
        showContinueButton: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const adviseCacheStore = useAdviseCacheStore();
        const masStore = useMasStore();

        const catalogStore = useCatalogStore();

        const loading = false;

        return {
            adviseCacheStore,
            catalogStore,
            masStore,
            loading,
            hasSearched: false,
            showWeights: false,
        }
    },
    computed: {
        resultsMessage() {
            if (this.loading) {
                return "Looking for the best designs for you in our catalog"
            }
            else if (!this.hasSearched) {
                return null;
            }
            else if (this.catalogStore.advises.length === 0) {
                return "No suitable magnetics found in the catalog matching your requirements."
            }
            else if (this.catalogStore.advises[0].scoring > 0) {
                if (this.catalogStore.advises.length > 1) {
                    return "We found these suitable magnetics in our standard catalog:"
                }
                else {
                    return "We found this suitable magnetic in our standard catalog:"
                }
            }
            else {
                if (this.catalogStore.advises.length > 1) {
                    return "We didn't find any standard magnetics in catalog that complied with your requirements, but these were the closest, which means they are a good starting point to create your own design:"
                }
                else {
                    return "We didn't find any standard magnetics in catalog that complied with your requirements, but this was the closest, which means it is a good starting point to create your own design:"
                }
            }

        }
    },
    watch: { 
    },
    created () {
    },
    mounted () {
        this.$emit("canContinue", false);
        // Consume any pending search token so the watcher below doesn't fire
        // a duplicate search immediately after.
        const hadPendingSearch =
            this.catalogStore.searchRequestToken > this.catalogStore.searchRequestConsumed;
        this.catalogStore.consumeSearchRequest();

        // Cache short-circuit: if we already have results computed from the
        // exact same inputs + filters + maxResults, don't recompute. The user
        // typically lands here after navigating back from the viewer with no
        // changes — recomputing wastes seconds and rebuilds an identical list.
        // An explicit "Find Magnetic" (token bump) always forces a re-run.
        const cachedKey = this.catalogStore.advisesKey;
        const currentKey = this.buildAdvisesKey();
        if (!hadPendingSearch
                && cachedKey
                && cachedKey === currentKey
                && this.catalogStore.advises.length > 0) {
            this.hasSearched = true;
            this.loading = false;
            this.$emit('canContinue', true);
        } else {
            this.calculateAdvisedMagnetics();
        }
        // Watch for new search requests from the wizard triggered after mount.
        this._searchTokenUnwatch = this.$watch(
            () => this.catalogStore.searchRequestToken,
            () => this.maybeRunPendingSearch()
        );
    },
    beforeUnmount () {
        this._searchTokenUnwatch?.();
    },
    methods: {
        maybeRunPendingSearch() {
            const token = this.catalogStore.searchRequestToken;
            const consumed = this.catalogStore.searchRequestConsumed;
            if (token > consumed) {
                this.catalogStore.consumeSearchRequest();
                this.calculateAdvisedMagnetics();
            }
        },
        maximumNumberResultsChangedInputValue(value) {
        },
        changedInputValue(filter, newValue) {
            this.catalogStore.filters[filter] = Number(newValue)
        },
        changedSliderValue(filter, newValue) {
        },
        continueWithoutSearch(index) {
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$emit("canContinue", true);
        },
        viewMagnetic(index) {
            this.masStore.mas = this.catalogStore.advises[index].mas
            this.$stateStore.setCurrentToolSubsection("magneticViewer");
            this.$emit("canContinue", true);
        },
        editMagnetic(index) {
            this.masStore.mas = this.catalogStore.advises[index].mas
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$emit("canContinue", true);
        },
        buildFilterFlow() {
            const filterFlow = [];
            for (const [key, value] of Object.entries(this.catalogStore.filters)) {
                if (value > 0) {
                    filterFlow.push({
                        "filter": key,
                        "invert": true,
                        "log": false,
                        "strictlyRequired": value==100,
                        "weight": value / 100
                    })
                }
            }
            return filterFlow;
        },
        // Stable cache key for the current search inputs. Anything that would
        // change the scorer's output must be in here. JSON.stringify on the
        // inputs and filterFlow is sufficient — Pinia keeps property order
        // stable across reads, and `maximum_number_results` is hardcoded to 9.
        buildAdvisesKey() {
            try {
                return JSON.stringify({
                    inputs: this.masStore.mas.inputs,
                    filterFlow: this.buildFilterFlow(),
                    max: 9,
                });
            } catch {
                return "";
            }
        },
        calculateAdvisedMagnetics() {
            this.catalogStore.advises = [];
            this.catalogStore.advisesKey = "";
            this.loading = true;
            if (this.useWasmCache) {
                this.calculateAdvisedMagneticsFromWasmCache();
            } else {
                this.calculateAdvisedMagneticsFromBackend();
            }
        },
        calculateAdvisedMagneticsFromBackend() {
            setTimeout(() => {
                const url = import.meta.env.VITE_API_ENDPOINT + '/calculate_advised_magnetics';
                const data = {
                    inputs:  this.masStore.mas.inputs,
                    maximum_number_results:  9,
                    filter_flow: this.buildFilterFlow(),
                }

                this.$axios.post(url, data)
                .then(response => {
                    this.catalogStore.advises = [];
                    this.loading = false;
                    this.hasSearched = true;

                    response.data.data.forEach((datum) => {
                        this.catalogStore.advises.push(datum);
                    })
                    this.catalogStore.advisesKey = this.buildAdvisesKey();
                    this.$emit('canContinue', this.catalogStore.advises.length > 0);
                })
                .catch(error => {
                    this.loading = false;
                    this.hasSearched = true;
                    this.$emit('canContinue', false);
                    console.error(error);
                });

            }, 100);
        },
        async calculateAdvisedMagneticsFromWasmCache() {
            try {
                const mkf = this.$mkf;
                if (!mkf) throw new Error('MKF WASM engine not available');

                // Short-circuit: if the requested winding count isn't present
                // in the cache, the C++ scorer either crashes ("Exception:
                // vector" on empty candidate set) or produces NaN scores.
                // We surface "No choke available" instead.
                const inputs = this.masStore.mas.inputs;
                const dr = inputs?.designRequirements || {};
                const requestedWindings =
                    (Array.isArray(dr.isolationSides) && dr.isolationSides.length)
                    || (Array.isArray(dr.turnsRatios) ? dr.turnsRatios.length + 1 : null);
                const available = this.$stateStore?.catalogAvailableWindingCounts || [];
                if (requestedWindings && available.length > 0
                        && !available.includes(requestedWindings)) {
                    console.info(
                        `[CatalogAdviser] No catalog entry has ${requestedWindings} windings ` +
                        `(available: ${available.join(', ')}); skipping C++ adviser.`
                    );
                    this.catalogStore.advises = [];
                    this.catalogStore.advisesKey = "";
                    this.$emit('canContinue', false);
                    return;
                }

                const inputsJson = JSON.stringify(inputs);
                const filterFlowJson = JSON.stringify(this.buildFilterFlow());
                const resultStr = await mkf.calculate_advised_magnetics_from_cache(inputsJson, filterFlowJson, 9);
                if (typeof resultStr === 'string' && resultStr.startsWith('Exception')) {
                    throw new Error(resultStr);
                }
                const parsed = typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;
                this.catalogStore.advises = [];
                (parsed?.data || []).forEach((datum) => {
                    this.catalogStore.advises.push(datum);
                });
                this.catalogStore.advisesKey = this.buildAdvisesKey();
                this.$emit('canContinue', this.catalogStore.advises.length > 0);
            } catch (error) {
                console.error('[CatalogAdviser] WASM advise failed:', error);
                this.$emit('canContinue', false);
            } finally {
                this.loading = false;
                this.hasSearched = true;
            }
        },

    }
}
</script>

<template>
    <div class="container text-start pr-0 container-fluid"  style="height: 75vh" :style="$styleStore.catalogAdviser.main">
        <div class="row">
            <div class="col-2 p-1 pr-0 control" style="height: 75vh">
                <div
                    class="h-100 d-flex flex-column p-2"
                    style="overflow-x: hidden; overflow-y: auto;"
                    :style="$styleStore.catalogAdviser.adviserBody"
                >

                    <!-- Advanced weighting collapsible -->
                    <div class="mb-2">
                        <button
                            class="p-button p-button-sm w-100 d-flex justify-content-between align-items-center py-1"
                            :style="$styleStore.catalogAdviser.generalButton"
                            type="button"
                            @click="showWeights = !showWeights"
                        >
                            <span>Advanced weighting</span>
                            <span>{{ showWeights ? '▲' : '▼' }}</span>
                        </button>
                        <div v-show="showWeights" class="mt-2">
                            <div class="row ml-1 mx-0 text-start" v-for="(weight, filter) in catalogStore.filters" :key="filter">
                                <label class="form-label col-12 py-0 my-0 small">{{filter}}</label>
                                <div class="col-7 pt-2 pr-3">
                                    <Slider v-model="catalogStore.filters[filter]" :disabled="loading" class="col-12 text-primary slider" :height="10" :min="0" :max="100" :step="10" :color="theme.primary" :tooltips="false" @change="changedSliderValue(filter, $event)"/>
                                </div>
                                <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 px-0 col-3 text-end" @change="changedInputValue(filter, $event.target.value)" :value="removeTrailingZeroes(catalogStore.filters[filter], 0)" ref="inputRef"/>
                            </div>
                            <!-- Search button inside collapsible -->
                            <button
                                :disabled="loading"
                                class="p-button p-button-sm w-100 mt-2"
                                :style="$styleStore.catalogAdviser.continueButton"
                                :data-cy="dataTestLabel + '-search-button'"
                                @click="calculateAdvisedMagnetics"
                            >
                                {{ loading ? 'Searching…' : 'Search' }}
                            </button>
                        </div>
                    </div>

                    <!-- Continue without search (hidden when parent sets :showContinueButton="false") -->
                    <button
                        v-if="showContinueButton"
                        :disabled="loading"
                        class="btn text-xl my-2 col-offset-1 col-10"
                        :style="$styleStore.catalogAdviser.continueButton"
                        @click="continueWithoutSearch"
                    >
                        Continue without search
                    </button>

                </div>
            </div>
            <div class="col-10 text-start pr-0 container-fluid"  style="height: 75vh">
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: auto; height: 20%;" :src="$settingsStore.loadingGif">
                </div>
                <p v-if="resultsMessage && !loading" class="px-2 pt-2 mb-1 small text-muted">{{ resultsMessage }}</p>
                <div class="col-12 row advises">
                    <!-- No-results banner -->
                    <div v-if="hasSearched && !loading && catalogStore.advises.length === 0"
                         class="col-12 text-center py-5">
                        <i class="pi pi-ban text-5xl text-danger"></i>
                        <p class="mt-3 fw-semibold">No choke available in the catalog for your requirements.</p>
                        <p class="text-muted small">Adjust your requirements or use the custom design path.</p>
                    </div>
                    <template v-for="(advise, adviseIndex) in catalogStore.advises" :key="adviseIndex">
                        <div class="col-4 m-0 p-0 mt-1" v-if="advise.scoring != null">
                            <Advise
                                :adviseIndex="adviseIndex"
                                :masData="advise.mas"
                                :scoring="advise.scoring"
                                :allowView="true"
                                :allowEdit="false"
                                :allowOrder="false"
                                @viewMagnetic="viewMagnetic(adviseIndex)"
                                @editMagnetic="editMagnetic(adviseIndex)"
                            />
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<style type="text/css">
.advises{
    position: relative;
    float: left;
    text-align: center;
    height:100%;
    overflow-y: auto; 
}
.control{
    position: relative;
    float: left;
    text-align: center;
    overflow-y: auto; 
}

.slider {
  --slider-connect-bg: var(--bs-primary);
  --slider-handle-bg: var(--bs-primary);
}

</style>

<style src="@vueform/slider/themes/default.css"></style>
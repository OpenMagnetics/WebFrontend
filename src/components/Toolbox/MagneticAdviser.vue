<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { magneticAdviserWeights } from '/WebSharedComponents/assets/js/defaults.js'
import Advise from '/src/components/Toolbox/MagneticAdviser/Advise.vue'
import AdviseDetails from '/src/components/Toolbox/MagneticAdviser/AdviseDetails.vue'
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
    },
    data() {
        const adviseCacheStore = useAdviseCacheStore();
        const masStore = useMasStore();

        if (this.$settingsStore.magneticAdviserSettings.weights == null) {
            this.$settingsStore.magneticAdviserSettings.weights = magneticAdviserWeights;
        }

        const loading = false;

        return {
            adviseCacheStore,
            masStore,
            loading,
            currentAdviseToShow: 0,
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
        brokenLinedFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.$settingsStore.magneticAdviserSettings.weights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                titledFilters[key] = titledFilters[key].split(' ')
                .map(item => toTitleCase(item));
            }
            return titledFilters;
        },
    },
    watch: { 
    },
    created () {
    },
    mounted () {
        if (this.adviseCacheStore.noMasAdvises()) {
            this.loading = true;
            setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
        }
    },
    methods: {
        getTopMagneticByFilter(data, filter) {
            data.sort(function(a, b) { 
                if (filter == null) {
                    return b.weightedTotalScoring - a.weightedTotalScoring;
                }
                else {
                   return b.scoringPerFilter[filter] - a.scoringPerFilter[filter];
               }
            })
            var topMas = deepCopy(data[0]);
            return topMas;
        },
        deleteMasElementFromArray(data, datum) {
            var index = -1;
            for (var i = data.length - 1; i >= 0; i--) {
                if (data[i].mas.magnetic.manufacturerInfo.name == datum.mas.magnetic.manufacturerInfo.name) {
                    index = i;
                    break;
                }
            }
            if (index > -1) { // only splice data when item is found
              data.splice(index, 1); // 2nd parameter means remove one item only
            }
        },
        calculateAdvisedMagnetics() {
            this.currentAdviseToShow = 0;

            // Timeout to give time to gif to load
            setTimeout(() => {
                this.$mkf.ready.then(_ => {
                    if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                        console.time('Execution Time');

                        const settings = JSON.parse(this.$mkf.get_settings());
                        settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserAllowDistributedGaps == "1";
                        settings["coreIncludeStacks"] = this.$settingsStore.adviserAllowStacks == "1";
                        settings["useToroidalCores"] = this.$settingsStore.adviserToroidalCores == "1";
                        this.$mkf.set_settings(JSON.stringify(settings));

                        // console.log(JSON.stringify(this.masStore.mas.inputs))
                        // console.log(JSON.stringify(this.$settingsStore.magneticAdviserSettings.weights))
                        const aux = JSON.parse(this.$mkf.calculate_advised_magnetics(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.$settingsStore.magneticAdviserSettings.weights), this.$settingsStore.magneticAdviserSettings.maximumNumberResults, this.$settingsStore.adviserUseOnlyCoresInStock == "1" || this.$settingsStore.adviserUseOnlyCoresInStock == 1));

                        // console.log(aux)

                        var data = aux["data"];

                        var orderedWeights = [];
                        for (let [key, value] of Object.entries(this.$settingsStore.magneticAdviserSettings.weights)) {
                            orderedWeights.push({
                                filter: key,
                                weight: value
                            })
                        }

                        console.log(`Found ${data.length} designs`)

                        this.adviseCacheStore.currentMasAdvises = [];
                        // orderedWeights.forEach((value) => {
                        //     const topMas = this.getTopMagneticByFilter(data, value.filter);
                        //     this.adviseCacheStore.currentMasAdvises.push(topMas);
                        // })
                        // this.adviseCacheStore.currentMasAdvises.forEach((mas) => {
                        //     this.deleteMasElementFromArray(data, mas);
                        // })

                        data.forEach((datum) => {
                            this.adviseCacheStore.currentMasAdvises.push(datum);
                        })
                        console.timeEnd('Execution Time');
                        this.$userStore.magneticAdviserSelectedAdvise = 0;
                        if (this.adviseCacheStore.currentMasAdvises.length > 0) {
                            this.masStore.mas = this.adviseCacheStore.currentMasAdvises[this.$userStore.magneticAdviserSelectedAdvise].mas;
                            this.$emit("canContinue", true);
                        }

                        this.loading = false;

                    }
                    else {
                        console.error("No operating points found")
                        this.loading = false;
                    }
                });
            }, 10);
        },
        changedInputValue(key, value) {
            this.$settingsStore.magneticAdviserSettings.weights[key] = value / 100;
        },
        maximumNumberResultsChangedInputValue(value) {
        },
        changedSliderValue(newkey, newValue) {
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
        maximumNumberResultsChangedSliderValue(newValue) {
        },
        selectedMas(index) {
            this.masStore.setMas(deepCopy(this.adviseCacheStore.currentMasAdvises[index].mas));
            this.$userStore.magneticAdviserSelectedAdvise = index;
            console.log("canContinue")
            this.$emit("canContinue", true);

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

    }
}
</script>

<template>
    <AdviseDetails :modelValue="masStore.mas"/>
    <div class="container" >
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-2 py-1 ">
                <div class="row" v-for="value, key in $settingsStore.magneticAdviserSettings.weights">
                    <label class="form-label col-12 py-0 my-0">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <Slider v-model="$settingsStore.magneticAdviserSettings.weights[key]" :disabled="loading" class="col-12 text-primary slider" :height="10" :min="10" :max="80" :step="10" :color="theme.primary" :tooltips="false" @change="changedSliderValue(key, $event)"/>
                    </div>

                <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="changedInputValue(key, $event.target.value)" :value="removeTrailingZeroes($settingsStore.magneticAdviserSettings.weights[key])" ref="inputRef">

                </div>
                <p>The sliders are designed to transmit your preferences into which criterion is most important for the design.</p>
                <div class="row">
                    <label class="form-label col-12 py-0 my-0">Max. No results</label>
                    <div class=" col-7 me-2 pt-2">
                        <Slider v-model="$settingsStore.magneticAdviserSettings.maximumNumberResults" :disabled="loading" class="col-12 text-primary  slider" :height="10" :min="2" :max="20" :step="1"  :color="theme.primary"  :tooltips="false" @change="maximumNumberResultsChangedSliderValue($event)"/>
                    </div>

                    <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="2" :step="1" @change="maximumNumberResultsChangedInputValue($event.target.value)" :value="removeTrailingZeroes($settingsStore.magneticAdviserSettings.maximumNumberResults)" ref="inputRef">
                </div>
                <button :disabled="loading" :data-cy="dataTestLabel + '-calculate-mas-advises-button'" class="btn btn-success mx-auto d-block mt-4" @click="calculateAdvises" >Get advised magnetics!</button>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-md-4 col-sm-12 m-0 p-0 mt-1" v-for="advise, adviseIndex in adviseCacheStore.currentMasAdvises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoringPerFilter"
                            :selected="$userStore.magneticAdviserSelectedAdvise == adviseIndex"
                            :graphType="$settingsStore.adviserSpiderBarChartNotBar == '1'? 'radar' : 'bar'"
                            @selectedMas="selectedMas(adviseIndex)"
                            @adviseReady="adviseReady(adviseIndex)"
                        />
                    </div>
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
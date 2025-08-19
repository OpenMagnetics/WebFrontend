<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { coreAdviserWeights } from '/WebSharedComponents/assets/js/defaults.js'
import Advise from './MagneticCoreAdviser/Advise.vue'
import AdviseDetails from './MagneticCoreAdviser/AdviseDetails.vue'
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
        Slider
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

        if (this.$settingsStore.coreAdviserSettings.weights == null) {
            this.$settingsStore.coreAdviserSettings.weights = coreAdviserWeights;
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
            for (let [key, _] of Object.entries(this.$settingsStore.coreAdviserSettings.weights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
            }
            return titledFilters;
        },
        brokenLinedFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.$settingsStore.coreAdviserSettings.weights)) {
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
        if (this.adviseCacheStore.noCoreAdvises()) {
            setTimeout(() => {this.calculateAdvisedCores();}, 200);
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
        calculateAdvisedCores() {
            this.currentAdviseToShow = 0;

            this.$mkf.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                    console.time('Execution Time');

                    const settings = JSON.parse(this.$mkf.get_settings());
                    settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserSettings.allowDistributedGaps;
                    settings["coreIncludeStacks"] = this.$settingsStore.adviserSettings.allowStacks;
                    settings["useToroidalCores"] = this.$settingsStore.adviserSettings.allowToroidalCores;
                    settings["useOnlyCoresInStock"] = this.$settingsStore.adviserSettings.useOnlyCoresInStock;
                    this.$mkf.set_settings(JSON.stringify(settings));

                    var aux;
                    const result = this.$mkf.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.$settingsStore.coreAdviserSettings.weights), 20, this.$settingsStore.adviserSettings.coreAdviseMode);
                    if (result.startsWith("Exception")) {
                        console.error(result)
                        this.loading = false;
                    }
                    else {
                        aux = JSON.parse(result);
                    }

                    var log = aux["log"];
                    var data = aux["data"];
                    data.forEach((datum) => {
                        datum.mas.inputs = deepCopy(this.masStore.mas.inputs);
                    })

                    var orderedWeights = [];
                    for (let [key, value] of Object.entries(this.$settingsStore.coreAdviserSettings.weights)) {
                        orderedWeights.push({
                            filter: key,
                            weight: value
                        })
                    }

                    this.adviseCacheStore.currentCoreAdvises = [];
                    // orderedWeights.forEach((value) => {
                    //     const topMas = this.getTopMagneticByFilter(data, value.filter);
                    //     this.adviseCacheStore.currentCoreAdvises.push(topMas);
                    // })
                    this.adviseCacheStore.currentCoreAdvises.forEach((mas) => {
                        this.deleteMasElementFromArray(data, mas);
                    })
                    data.forEach((datum) => {
                        this.adviseCacheStore.currentCoreAdvises.push(datum);
                    })
                    console.timeEnd('Execution Time');
                    this.$userStore.coreAdviserSelectedAdvise = 0;
                    if (this.adviseCacheStore.currentCoreAdvises.length > 0) {
                        this.masStore.mas = this.adviseCacheStore.currentCoreAdvises[this.$userStore.coreAdviserSelectedAdvise].mas;
                        this.$emit("canContinue", true);
                    }

                    this.loading = false;

                }
                else {
                    console.error("No operating points found")
                    this.loading = false;
                }
            }).catch(error => {
                console.error("Error calculating advising cores");
                console.error(error);
            });
        },
        changedInputValue(key, value) {
            this.$settingsStore.coreAdviserSettings.weights[key] = value / 100;
        },
        changedSliderValue(newkey, newValue) {
            const remainingValue = 100 - newValue;
            var valueInOthers = 0;
            for (let [key, value] of Object.entries(this.$settingsStore.coreAdviserSettings.weights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    valueInOthers += value;
                }
            }
            for (let [key, value] of Object.entries(this.$settingsStore.coreAdviserSettings.weights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    if (value == 0) {
                        this.$settingsStore.coreAdviserSettings.weights[key] = remainingValue / 2;
                    }
                    else {
                        this.$settingsStore.coreAdviserSettings.weights[key] = value / valueInOthers * remainingValue;
                    }
                }
            }
        },
        selectedMas(index) {
            this.masStore.mas = this.adviseCacheStore.currentCoreAdvises[index].mas;
            this.$userStore.coreAdviserSelectedAdvise = index;
            this.$emit("canContinue", true);

        },
        adviseReady(index) {
            if (this.currentAdviseToShow < this.adviseCacheStore.currentCoreAdvises.length - 1) {
                setTimeout(() => {this.currentAdviseToShow = this.currentAdviseToShow + 1}, 100);
            }
        },
        calculateAdvises(event) {
            this.loading = true;
            setTimeout(() => {this.calculateAdvisedCores();}, 200);
        },

    }
}
</script>

<template>
    <AdviseDetails :modelValue="masStore.mas"/>
    <div class="container" >
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-2 py-1 ">
                <div class="row" v-for="value, key in $settingsStore.coreAdviserSettings.weights">
                    <label class="form-label col-12 py-0 my-0">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <Slider v-model="$settingsStore.coreAdviserSettings.weights[key]" :disabled="loading" class="col-12 text-primary slider" :height="10" :min="10" :max="80" :step="10"  id="core-adviser-weight-area-product" :tooltips="false" @change="changedSliderValue(key, $event)"/>
                    </div>

                <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="changedInputValue(key, $event.target.value)" :value="removeTrailingZeroes($settingsStore.coreAdviserSettings.weights[key])" ref="inputRef">

                </div>
                <button :disabled="loading" :data-cy="dataTestLabel + '-calculate-mas-advises-button'" class="btn btn-success mx-auto d-block mt-4" @click="calculateAdvises" >Get advised cores!</button>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="row" v-if="loading" >
                    <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" :src="loadingGif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-md-4 col-sm-12 m-0 p-0 mt-1" v-for="advise, adviseIndex in adviseCacheStore.currentCoreAdvises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoringPerFilter"
                            :selected="$userStore.coreAdviserSelectedAdvise == adviseIndex"
                            :graphType="$settingsStore.adviserSettings.spiderBarChartNotBar? 'radar' : 'bar'"
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
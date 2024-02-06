<script setup>
import { useMasStore } from '/src/stores/mas'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import slider from "vue3-slider"
import { removeTrailingZeroes, toTitleCase, toCamelCase, calculateObjectSize, deepCopy, cyrb53 } from '/src/assets/js/utils.js'
import { magneticAdviserWeights } from '/src/assets/js/defaults.js'
import Advise from '/src/components/Toolbox/MagneticAdviser/Advise.vue'
import AdviseDetails from '/src/components/Toolbox/MagneticAdviser/AdviseDetails.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
</script>

<script>
var magneticAdviser = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                magneticAdviser = Object.assign(this, {
                    ready: Promise.resolve()
                });
                resolve();
            }
        });
    })
};

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
        "vue3-slider": slider
    },
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const inventoryCacheStore = useInventoryCacheStore();

        if (masStore.magneticAdviserWeights == null) {
            masStore.magneticAdviserWeights = magneticAdviserWeights;
        }


        const advises = [];
        const loading = false;
        const tryingToSend = false;
        const recentChange = false;

        return {
            masStore,
            loading,
            inventoryCacheStore,
            advises,
            tryingToSend,
            recentChange,
            currentAdviseToShow: 0,
        }
    },
    computed: {
        titledFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.masStore.magneticAdviserWeights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
            }
            return titledFilters;
        },
        brokenLinedFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.masStore.magneticAdviserWeights)) {
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
        setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
    },
    methods: {
        getKeyToCache() {
            var cacheKeyString = JSON.stringify(this.masStore.mas.inputs);
            for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                cacheKeyString += value;
            }

            const cacheKey = cyrb53(cacheKeyString);

            console.log(cacheKey)
            return cacheKey;
        },
        addCurrentAdvisesToCache() {
            var cacheKey = this.getKeyToCache();
            this.masStore.coreAdvisesCache[cacheKey] = this.advises;
        },
        tryLoadAdvisesfromCache() {
            if (this.masStore.areCoreAdvisesValid()) {
                var cacheKey = this.getKeyToCache();
                console.log(Object.keys(this.masStore.coreAdvisesCache))
                if (cacheKey in this.masStore.coreAdvisesCache) {
                    console.log("Cache hit!")
                    this.advises = this.masStore.coreAdvisesCache[cacheKey];
                    this.$userStore.magneticAdviserSelectedAdvise = 0;
                    if (this.advises.length > 0) {
                        this.masStore.mas = this.advises[this.$userStore.magneticAdviserSelectedAdvise].mas;
                        this.$emit("canContinue", true);
                    }
                    return true;
                }
                else {
                    console.log("Cache miss!")
                    return false;
                }
            }
        },
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
            this.loading = true;
            this.currentAdviseToShow = 0;

            if (this.tryLoadAdvisesfromCache()) {
                setTimeout(() => {this.loading = false;}, 500);
                return;
            }

            magneticAdviser.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                    console.time('Execution Time');

                    const aux = JSON.parse(magneticAdviser.calculate_advised_magnetics(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.masStore.magneticAdviserWeights), this.masStore.magneticAdviserMaximumNumberResults, this.$userStore.magneticAdviserUseOnlyCoresInStock == 1));

                    var data = aux["data"];

                    var orderedWeights = [];
                    for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                        orderedWeights.push({
                            filter: key,
                            weight: value
                        })
                    }

                    this.advises = [];
                    // orderedWeights.forEach((value) => {
                    //     const topMas = this.getTopMagneticByFilter(data, value.filter);
                    //     this.advises.push(topMas);
                    // })
                    // this.advises.forEach((mas) => {
                    //     this.deleteMasElementFromArray(data, mas);
                    // })
                    data.forEach((datum) => {
                        this.advises.push(datum);
                    })
                    console.timeEnd('Execution Time');
                    this.masStore.coreAdvises = this.advises;
                    this.masStore.coreAdvisesTimestamp = Date.now();
                    this.addCurrentAdvisesToCache();
                    this.$userStore.magneticAdviserSelectedAdvise = 0;
                    if (this.advises.length > 0) {
                        this.masStore.mas = this.advises[this.$userStore.magneticAdviserSelectedAdvise].mas;
                        this.$emit("canContinue", true);
                    }

                    this.loading = false;

                }
                else {
                    console.error("No operating points found")
                    this.loading = false;
                }
            });
        },
        tryToSend() {
            if (!this.tryingToSend && !this.loading) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToSend = false
                        this.tryToSend()
                    }
                    else {
                        this.tryingToSend = false
                        this.calculateAdvisedMagnetics()
                    }
                }
                , 500);
            }
        },
        changedInputValue(key, value) {
            this.masStore.magneticAdviserWeights[key] = value / 100;
            this.recentChange = true;
            this.tryToSend();
        },
        maximumNumberResultsChangedInputValue(value) {
            this.recentChange = true;
            this.masStore.resetCache();
            this.tryToSend();
        },
        changedSliderValue(newkey, newValue) {
            const remainingValue = 1 - newValue;
            var valueInOthers = 0;
            for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                if (key != newkey) {
                    valueInOthers += value;
                }
            }
            for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                if (key != newkey) {
                    this.masStore.magneticAdviserWeights[key] = value / valueInOthers * remainingValue;
                }
            }
            this.recentChange = true;

            this.tryToSend();
        },
        maximumNumberResultsChangedSliderValue(newValue) {
            this.recentChange = true;
            this.masStore.resetCache();
            this.tryToSend();
        },
        selectedMas(index) {
            this.masStore.mas = this.advises[index].mas;
            this.$userStore.magneticAdviserSelectedAdvise = index;
            this.$emit("canContinue", true);

        },
        adviseReady(index) {
            if (this.currentAdviseToShow < this.advises.length - 1) {
                setTimeout(() => {this.currentAdviseToShow = this.currentAdviseToShow + 1}, 100);
            }
        },
        onChangeBarOrSpider(event) {
            this.$router.go();
        },
        onChangeWithOrWithoutStock(event) {
            console.log(this.$userStore.magneticAdviserUseOnlyCoresInStock)
            this.masStore.resetCache();
            this.$router.go();
        },

    }
}
</script>

<template>
    <AdviseDetails :modelValue="masStore.mas"/>
    <div class="container" >
        <div class="row">
            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-2 py-1 ">
                <div class="row" v-for="value, key in masStore.magneticAdviserWeights">
                    <label class="form-label col-12 py-0 my-0">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <vue3-slider v-model="masStore.magneticAdviserWeights[key]" :disabled="loading" class="col-2 text-primary" :height="10" :min="0.1" :max="1" :step="0.1" :color="theme.primary" :handleScale="2" :alwaysShowHandle="true" @drag-end="changedSliderValue(key, $event)"/>
                    </div>

                <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="changedInputValue(key, $event.target.value)" :value="removeTrailingZeroes(masStore.magneticAdviserWeights[key] * 100)" ref="inputRef">

                </div>
                <p>The sliders are designed to transmit your preferences into which criterion is most important for the design.</p>
                <div class="row">
                    <label class="form-label col-12 py-0 my-0">Max. No results</label>
                    <div class=" col-7 me-2 pt-2">
                        <vue3-slider v-model="masStore.magneticAdviserMaximumNumberResults" :disabled="loading" class="col-2 text-primary" :height="10" :min="1" :max="20" :step="1"  :color="theme.primary" :handleScale="2" :alwaysShowHandle="true" @drag-end="maximumNumberResultsChangedSliderValue($event)"/>
                    </div>

                    <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="maximumNumberResultsChangedInputValue($event.target.value)" :value="removeTrailingZeroes(masStore.magneticAdviserMaximumNumberResults)" ref="inputRef">
                </div>

                <div class="row">
                    <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 mt-2 p-0 ps-3 text-white col-3 ">Bar</label>
                    <input :disabled="loading" :data-cy="dataTestLabel + '-bar-spider-button'" v-model="$userStore.magneticAdviserSpiderBarChartNotBar" @change="onChangeBarOrSpider" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                    <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 mt-2 p-0 ps-3 text-white col-7">Spider chart</label>
                </div>
                <p class="mt-5">Choose between using all available cores or only those in stock.</p>
                <div class="row">
                    <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 mt-2 p-0 ps-3 text-white col-3 ">All</label>
                    <input :disabled="loading" :data-cy="dataTestLabel + '-with-without-stock-button'" v-model="$userStore.magneticAdviserUseOnlyCoresInStock" @change="onChangeWithOrWithoutStock" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                    <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 mt-2 p-0 ps-3 text-white col-7">Only in stock</label>
                </div>
                <p class="mt-1 text-danger">Warning: Using all cores will take a longer time.</p>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-md-4 col-sm-12 m-0 p-0 mt-1" v-for="advise, adviseIndex in advises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoringPerFilter"
                            :selected="$userStore.magneticAdviserSelectedAdvise == adviseIndex"
                            :graphType="$userStore.magneticAdviserSpiderBarChartNotBar == '1'? 'radar' : 'bar'"
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
</style>
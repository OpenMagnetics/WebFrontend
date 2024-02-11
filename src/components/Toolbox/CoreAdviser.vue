<script setup>
import { useMasStore } from '/src/stores/mas'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, calculateObjectSize, deepCopy, cyrb53 } from '/src/assets/js/utils.js'
import { coreAdviserWeights } from '/src/assets/js/defaults.js'
import Advise from '/src/components/Toolbox/CoreAdviser/Advise.vue'
import AdviseDetails from '/src/components/Toolbox/CoreAdviser/AdviseDetails.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
</script>

<script>
var coreAdviser = {
    ready: new Promise(resolve => {
        Module({
            onRuntimeInitialized () {
                coreAdviser = Object.assign(this, {
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
        Slider
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

        if (masStore.coreAdviserWeights == null) {
            masStore.coreAdviserWeights = coreAdviserWeights;
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
            for (let [key, _] of Object.entries(this.masStore.coreAdviserWeights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
            }
            return titledFilters;
        },
        brokenLinedFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.masStore.coreAdviserWeights)) {
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
        // this.$userStore.coreAdviserSelectedAdvise = -1;
        // const url = import.meta.env.VITE_API_ENDPOINT + '/read_mas_inventory'

        // this.$axios.post(url, {})
        // .then(response => {
        //     this.inventoryCacheStore.coreInventory = response.data['cores'];
        //     // if (this.masStore.areCoreAdvisesValid()) {
        //     //     console.log("Cache valid!")
        //     //     this.advises = this.masStore.coreAdvises;
        //     //     this.addCurrentAdvisesToCache();
        //     //     this.$userStore.coreAdviserSelectedAdvise = 0;
        //     //     if (this.advises.length > 0) {
        //     //         this.masStore.mas = this.advises[this.$userStore.coreAdviserSelectedAdvise].mas;
        //     //         this.$emit("canContinue", true);
        //     //     }
        //     // }
        //     // else {
        //     //     console.log("Cache not valid!")
        //         this.calculateAdvisedCores();
        //     // }
        // })
        // .catch(error => {
        //     console.error("Error loading inventory")
        //     console.error(error)
        // });
        setTimeout(() => {this.calculateAdvisedCores();}, 200);


        // coreAdviser.ready.then(_ => {
        //     console.log('Starting Execution Time Loading');
        //     console.time('Execution Time Loading');
        //     coreAdviser.clear_loaded_cores();
        //     coreAdviser.load_cores(false, true);
        //     console.timeEnd('Execution Time Loading');
        // });
    },
    methods: {
        getKeyToCache() {
            var cacheKeyString = JSON.stringify(this.masStore.mas.inputs);
            for (let [key, value] of Object.entries(this.masStore.coreAdviserWeights)) {
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
                    this.$userStore.coreAdviserSelectedAdvise = 0;
                    if (this.advises.length > 0) {
                        this.masStore.mas = this.advises[this.$userStore.coreAdviserSelectedAdvise].mas;
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
        calculateAdvisedCores() {
            this.loading = true;
            this.currentAdviseToShow = 0;

            if (this.tryLoadAdvisesfromCache()) {
                setTimeout(() => {this.loading = false;}, 500);
                return;
            }

            coreAdviser.ready.then(_ => {
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                    console.time('Execution Time');

                    console.log("Boolean(this.$userStore.coreAdviserUseOnlyCoresInStock)")
                    console.log(this.$userStore.coreAdviserUseOnlyCoresInStock)
                    const aux = JSON.parse(coreAdviser.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.masStore.coreAdviserWeights), 20, this.$userStore.coreAdviserUseOnlyCoresInStock == 1));

                    var log = aux["log"];
                    var data = aux["data"];
                    data.forEach((datum) => {
                        datum.mas.inputs = deepCopy(this.masStore.mas.inputs);
                    })

                    console.log(aux)


                    var orderedWeights = [];
                    for (let [key, value] of Object.entries(this.masStore.coreAdviserWeights)) {
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
                    this.advises.forEach((mas) => {
                        this.deleteMasElementFromArray(data, mas);
                    })
                    data.forEach((datum) => {
                        this.advises.push(datum);
                    })
                    console.timeEnd('Execution Time');
                    this.masStore.coreAdvises = this.advises;
                    this.masStore.coreAdvisesTimestamp = Date.now();
                    this.addCurrentAdvisesToCache();
                    this.$userStore.coreAdviserSelectedAdvise = 0;
                    if (this.advises.length > 0) {
                        this.masStore.mas = this.advises[this.$userStore.coreAdviserSelectedAdvise].mas;
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
                        this.calculateAdvisedCores()
                    }
                }
                , 500);
            }
        },
        changedInputValue(key, value) {
            this.masStore.coreAdviserWeights[key] = value / 100;
            this.recentChange = true;
            this.tryToSend();
        },
        changedSliderValue(newkey, newValue) {
            const remainingValue = 1 - newValue;
            var valueInOthers = 0;
            for (let [key, value] of Object.entries(this.masStore.coreAdviserWeights)) {
                if (key != newkey) {
                    valueInOthers += value;
                }
            }
            for (let [key, value] of Object.entries(this.masStore.coreAdviserWeights)) {
                if (key != newkey) {
                    this.masStore.coreAdviserWeights[key] = value / valueInOthers * remainingValue;
                }
            }
            this.recentChange = true;

            this.tryToSend();
        },
        selectedMas(index) {
            this.masStore.mas = this.advises[index].mas;
            this.$userStore.coreAdviserSelectedAdvise = index;
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
            console.log(this.$userStore.coreAdviserUseOnlyCoresInStock)
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
                <div class="row" v-for="value, key in masStore.coreAdviserWeights">
                    <label class="form-label col-12 py-0 my-0">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <Slider v-model="masStore.coreAdviserWeights[key]" :disabled="loading" class="col-2 text-primary" :height="10" :min="0.1" :max="1" :step="0.1"  id="core-adviser-weight-area-product" :color="theme.primary" :handleScale="2" :alwaysShowHandle="true" @drag-end="changedSliderValue(key, $event)"/>
                    </div>

                <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="changedInputValue(key, $event.target.value)" :value="removeTrailingZeroes(masStore.coreAdviserWeights[key] * 100)" ref="inputRef">

                </div>
                <p class="mt-2">Our algorithm ranks the cores based on how they score on the above criteria.</p>
                <p>The sliders are designed to transmit your preferences into which criterion is most important for the design.</p>
                <div class="row">
                    <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 mt-2 p-0 ps-3 text-white col-3 ">Bar</label>
                    <input :disabled="loading" :data-cy="dataTestLabel + '-bar-spider-button'" v-model="$userStore.coreAdviserSpiderBarChartNotBar" @change="onChangeBarOrSpider" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                    <label v-tooltip="'Choose between spider or bar charts'" class="fs-6 mt-2 p-0 ps-3 text-white col-7">Spider chart</label>
                </div>
                <p class="mt-5">Choose between using all available cores or only those in stock.</p>
                <div class="row">
                    <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 mt-2 p-0 ps-3 text-white col-3 ">All</label>
                    <input :disabled="loading" :data-cy="dataTestLabel + '-with-without-stock-button'" v-model="$userStore.coreAdviserUseOnlyCoresInStock" @change="onChangeWithOrWithoutStock" type="range" class="mt-2 form-range col-1" min="0" max="1" step="1" style="width: 30px">
                    <label v-tooltip="'Choose between using all available cores or only those in stock'" class="fs-6 mt-2 p-0 ps-3 text-white col-7">Only in stock</label>
                </div>
                <p class="mt-1 text-danger">Warning: Using all cores will take a longer time.</p>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="row" v-if="loading" >
                    <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-md-4 col-sm-12 m-0 p-0 mt-1" v-for="advise, adviseIndex in advises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoringPerFilter"
                            :selected="$userStore.coreAdviserSelectedAdvise == adviseIndex"
                            :graphType="$userStore.coreAdviserSpiderBarChartNotBar == '1'? 'radar' : 'bar'"
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
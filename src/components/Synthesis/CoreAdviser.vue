<script setup>
import { useMasStore } from '/src/stores/mas'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import slider from "vue3-slider"
import { removeTrailingZeroes, toTitleCase, toCamelCase, calculateObjectSize, deepCopy } from '/src/assets/js/utils.js'
import { coreAdviserWeights } from '/src/assets/js/defaults.js'
import Advise from '/src/components/Synthesis/CoreAdviser/Advise.vue'
import AdviseDetails from '/src/components/Synthesis/CoreAdviser/AdviseDetails.vue'
import Module from '/src/assets/js/libMKF.wasm.js';

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
        const url = import.meta.env.VITE_API_ENDPOINT + '/read_mas_inventory'

        console.log(url)
        console.log("addCurrentAdvisesToCache")
        this.$axios.post(url, {})
        .then(response => {
            this.inventoryCacheStore.coreInventory = response.data['cores'];
            if (this.masStore.areCoreAdvisesValid()) {
                this.advises = this.masStore.coreAdvises;
                this.addCurrentAdvisesToCache();
            }
            else {
                this.calculateAdvisedCores();
            }
        })
        .catch(error => {
            console.error("Error loading inventory")
            console.error(error)
        });
    },
    methods: {
        getKeyToCache() {
            var cacheKey = JSON.stringify(this.masStore.mas.inputs.operatingPoints);
            for (let [key, value] of Object.entries(this.masStore.coreAdviserWeights)) {
                cacheKey += value;
            }
            return cacheKey;
        },
        addCurrentAdvisesToCache() {
            var cacheKey = this.getKeyToCache();
            this.masStore.coreAdvisesCache[cacheKey] = this.advises;
        },
        tryLoadAdvisesfromCache() {
            if (this.masStore.areCoreAdvisesValid()) {
                var cacheKey = this.getKeyToCache();
                if (cacheKey in this.masStore.coreAdvisesCache) {
                    console.log("key found!")
                    this.advises = this.masStore.coreAdvisesCache[cacheKey];
                    return true;
                }
                else {
                    console.log("key NOT found!")
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

            var mkf = {
                ready: new Promise(resolve => {
                    Module({
                        onRuntimeInitialized () {
                            mkf = Object.assign(this, {
                                ready: Promise.resolve()
                            });
                            resolve();
                        }
                    });
                })
            };

            mkf.ready.then(_ => {
                // this.advises = JSON.parse(this.$mkf.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.inventoryCacheStore.coreInventory), JSON.stringify(this.$dataCacheStore.masData)));
                if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                    console.time('Execution Time');

                    console.log(this.masStore.coreAdviserWeights)
                    const aux = JSON.parse(mkf.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.masStore.coreAdviserWeights), JSON.stringify(this.inventoryCacheStore.coreInventory), JSON.stringify(this.$dataCacheStore.masData), 20));

                    var log = aux["log"];
                    var data = aux["data"];
                    data.forEach((datum) => {
                        datum.mas.inputs = deepCopy(this.masStore.mas.inputs);
                        console.log(datum.mas.magnetic.manufacturerInfo.reference);
                        console.log(datum.mas.outputs[0].windingLosses.dcResistancePerWinding);
                    })


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
        changedSliderValue() {
            console.log("Really?")
            this.recentChange = true;
            this.tryToSend();
        },
        selectedMas(index) {
            this.masStore.mas= this.advises[index].mas;
            console.log("selectedMas")
            console.log(this.masStore.mas)
            console.log(this.advises[index])
        },
        adviseReady(index) {
            if (this.currentAdviseToShow < this.advises.length - 1) {
                console.log(this.currentAdviseToShow)
                setTimeout(() => {this.currentAdviseToShow = this.currentAdviseToShow + 1}, 100);
            }
        },

    }
}
</script>

<template>
    <AdviseDetails :modelValue="this.masStore.mas"/>
    <div class="container" >
        <div class="row" style="height: 70vh">

            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-2 ">
                <div class="row" v-for="value, key in masStore.coreAdviserWeights">
                    <label class="form-label col-12">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <vue3-slider v-model="masStore.coreAdviserWeights[key]" :disabled="loading" class="col-2 text-primary" :height="10" :min="0.1" :max="1" :step="0.1"  id="core-adviser-weight-area-product" :color="theme.primary" :handleScale="2" :alwaysShowHandle="true" @drag-end="changedSliderValue"/>
                    </div>

                <input  :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" :min="10" :step="10" @change="changedInputValue(key, $event.target.value)" :value="removeTrailingZeroes(masStore.coreAdviserWeights[key] * 100)" ref="inputRef">

                </div>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid" style="height: 100%">
                <div class="row" v-if="loading" >
                    <img data-cy="CoreAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-4 m-0 p-0 mt-1" v-for="advise, adviseIndex in advises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoringPerFilter"
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
</style>
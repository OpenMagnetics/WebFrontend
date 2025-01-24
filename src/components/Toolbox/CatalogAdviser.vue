<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { magneticAdviserWeights } from '/WebSharedComponents/assets/js/defaults.js'
import Advise from '/src/components/Toolbox/CatalogAdviser/Advise.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { useCatalogStore } from '/src/stores/catalog'
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
        const inventoryCacheStore = useInventoryCacheStore();

        const catalogStore = useCatalogStore();
        var catalogString = "";

        if (masStore.magneticAdviserWeights == null) {
            masStore.magneticAdviserWeights = magneticAdviserWeights;
        }

        const loading = false;

        return {
            adviseCacheStore,
            catalogString,
            catalogStore,
            masStore,
            inventoryCacheStore,
            loading,
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
        fetch(this.catalogStore.catalogUrl)
        .then((data) => data.text())
        .then((data) => {
            this.catalogString = data;
            // data.split("\n").forEach((masString) => {
            //     const mas = JSON.parse(masString)
            //     console.log(mas)
            //     this.catalogData.push({
            //         reference: mas.magnetic.manufacturerInfo.reference,
            //         core: mas.magnetic.core.name,
            //         mas: mas,
            //     })
            // })
            // console.log(this.catalogData)
            // console.log(data)
            // if (this.adviseCacheStore.noMasAdvises()) {
                setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
            // }
        })

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
                magneticAdviser.ready.then(_ => {
                    if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                        console.time('Execution Time');

                        const settings = JSON.parse(magneticAdviser.get_settings());
                        settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserAllowDistributedGaps == "1";
                        settings["coreIncludeStacks"] = this.$settingsStore.adviserAllowStacks == "1";
                        settings["useToroidalCores"] = this.$settingsStore.adviserToroidalCores == "1";
                        magneticAdviser.set_settings(JSON.stringify(settings));
                        // console.log(this.catalogString)

                        const result = magneticAdviser.calculate_advised_magnetics_from_catalog(JSON.stringify(this.masStore.mas.inputs), this.catalogString, 2);

                        var aux;
                        if (result.startsWith("Exception")) {
                            console.error(result);
                            return;
                        }
                        else {
                            aux = JSON.parse(result);
                        }

                        var data = aux["data"];
                        console.log(data)

                        // console.log(`Found ${data.length} designs`)

                        this.catalogStore.advises = [];

                        data.forEach((datum) => {
                            this.catalogStore.advises.push(datum);
                        })
                        console.timeEnd('Execution Time');
                        if (this.catalogStore.advises.length > 0) {
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
            this.masStore.magneticAdviserWeights[key] = value / 100;
        },
        maximumNumberResultsChangedInputValue(value) {
        },
        changedSliderValue(newkey, newValue) {
            const remainingValue = 100 - newValue;
            var valueInOthers = 0;
            for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    valueInOthers += value;
                }
            }
            for (let [key, value] of Object.entries(this.masStore.magneticAdviserWeights)) {
                if (isNaN(value)) {
                    value = 0;
                }
                if (key != newkey) {
                    if (value == 0) {
                        this.masStore.magneticAdviserWeights[key] = remainingValue / 2;
                    }
                    else {
                        this.masStore.magneticAdviserWeights[key] = value / valueInOthers * remainingValue;
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
            <div class="col-sm-12 col-md-10 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: 50%; height: auto;" src="/images/loading.gif">

                </div>
                <div class="row advises" v-else>
                    <div class="col-md-4 col-sm-12 m-0 p-0 mt-1" v-for="advise, adviseIndex in catalogStore.advises">
                        <Advise
                            v-if="(Object.values(titledFilters).length > 0) && (currentAdviseToShow >= adviseIndex)"
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoring"
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
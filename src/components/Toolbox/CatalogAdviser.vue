<script setup>
import { useMasStore } from '/src/stores/mas'
import { useAdviseCacheStore } from '/src/stores/adviseCache'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Advise from '/src/components/Toolbox/CatalogAdviser/Advise.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { useCatalogStore } from '/src/stores/catalog'
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
        const inventoryCacheStore = useInventoryCacheStore();

        const catalogStore = useCatalogStore();
        var catalogString = "";

        const loading = false;

        return {
            adviseCacheStore,
            catalogString,
            catalogStore,
            masStore,
            inventoryCacheStore,
            loading,
        }
    },
    computed: {
        resultsMessage() {
            if (this.loading) {
                return "Looking for the best designs for you in our catalog"
            }
            else if (this.catalogStore.advises.length > 0) {
                if (this.catalogStore.advises[0].scoring > 0) {
                    if (this.catalogStore.advises.length > 1) {
                        return "We found these suitable magnetics in our standard catalog:"
                    }
                    else {
                        return "We found this suitable magnetic in our standard catalog:"
                    }
                }
                else {
                    if (this.catalogStore.advises.length > 1) {
                        return "We didn't find any standard magnetics in catalog that complied with you requirements, but these were the closest, which means they are a good starting poing to create your own design:"
                    }
                    else {
                        return "We didn't find any standard magnetics in catalog that complied with you requirements, but this was the closest, which means it is a good starting poing to create your own design:"
                    }
                }
            }

        }
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
            if (this.catalogStore.advises.length == 0) {
                this.loading = true;
                setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
            }
        })
    },
    methods: {
        calculateAdvisedMagnetics() {
            // Timeout to give time to gif to load
            setTimeout(() => {
                this.$mkfAdvisers.ready.then(_ => {
                    if (this.masStore.mas.inputs.operatingPoints.length > 0) {
                        console.time('Execution Time');

                        const settings = JSON.parse(this.$mkfAdvisers.get_settings());
                        settings["coreIncludeDistributedGaps"] = this.$settingsStore.adviserAllowDistributedGaps == "1";
                        settings["coreIncludeStacks"] = this.$settingsStore.adviserAllowStacks == "1";
                        settings["useToroidalCores"] = this.$settingsStore.adviserToroidalCores == "1";
                        this.$mkfAdvisers.set_settings(JSON.stringify(settings));
                        // console.log(this.catalogString)

                        const result = this.$mkfAdvisers.calculate_advised_magnetics_from_catalog(JSON.stringify(this.masStore.mas.inputs), this.catalogString, 2);

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
                        // if (this.catalogStore.advises.length > 0) {
                        //     this.$emit("canContinue", true);
                        // }

                        this.loading = false;

                    }
                    else {
                        console.error("No operating points found")
                        this.loading = false;
                    }
                });
            }, 10);
        },
        maximumNumberResultsChangedInputValue(value) {
        },
        maximumNumberResultsChangedSliderValue(newValue) {
        },
        viewMagnetic(index) {
            this.masStore.mas = deepCopy(this.catalogStore.advises[index].mas);
            this.$emit("canContinue", true);

            this.$userStore.setCurrentToolSubsection("magneticViewer");
        },
        editMagnetic(index) {
            this.masStore.mas = deepCopy(this.catalogStore.advises[index].mas);
            if (this.masStore.mas.magnetic.manufacturerInfo != null && !this.masStore.mas.magnetic.manufacturerInfo.reference.includes("Edited")) {
                this.masStore.mas.magnetic.manufacturerInfo.reference += "_Edited";
            }
            this.$emit("canContinue", true);

            this.$userStore.setCurrentToolSubsection("magneticBuilder");
        },
        calculateAdvises(event) {
            this.loading = true;
            setTimeout(() => {this.calculateAdvisedMagnetics();}, 200);
        },

    }
}
</script>

<template>
    <div class="container text-start pe-0 container-fluid"  style="height: 70vh" >
        <div class="row">
            <div class="col-10 offset-1 text-start pe-0 container-fluid"  style="height: 70vh">
                <div class="col-12 row fs-5 mb-4">
                    {{resultsMessage}}
                </div>
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: auto; height: 20%;" :src="$settingsStore.loadingGif">

                </div>
                <div class="col-12 row advises">
                    <div class="col-6 m-0 p-0 mt-1" v-for="advise, adviseIndex in catalogStore.advises">
                        <Advise
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoring"
                            @viewMagnetic="viewMagnetic(adviseIndex)"
                            @editMagnetic="editMagnetic(adviseIndex)"
                            @orderSample="catalogStore.orderSample(catalogStore.advises[adviseIndex].mas)"
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
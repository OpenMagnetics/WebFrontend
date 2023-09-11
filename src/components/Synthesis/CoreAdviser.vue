<script setup>
import { useMasStore } from '/src/stores/mas'
import { useInventoryCacheStore } from '/src/stores/inventoryCache'
import slider from "vue3-slider"
import { removeTrailingZeroes, toTitleCase, toCamelCase, calculateObjectSize } from '/src/assets/js/utils.js'
import Advise from '/src/components/Synthesis/CoreAdviser/Advise.vue'
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
        const weights = {}
        // const advises = [1]
        const advises = [1, 1,1,1,1]

        return {
            masStore,
            inventoryCacheStore,
            weights,
            advises,
        }
    },
    computed: {
        titledFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.weights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
            }
            return titledFilters;
        },
        brokenLinedFilters() {
            const titledFilters = {};
            for (let [key, _] of Object.entries(this.weights)) {
                titledFilters[key] = toTitleCase(key.toLowerCase().replaceAll("_", " "));
                titledFilters[key] = titledFilters[key].split(' ')
                .map(item => toTitleCase(item));
            }
            console.log(titledFilters)
            return titledFilters;
        },
    },
    watch: { 
    },
    created () {
        // console.log(this.$dataCacheStore.masData.cores[0].functionalDescription.shape);
        // if (typeof(this.$dataCacheStore.masData.cores[0].functionalDescription.shape) == "string") {
        //     this.$mkf.ready.then(_ => {
        //         const processedCores = []
        //         var data = this.$dataCacheStore.masData;
        //         console.log(data.cores)
        //         data.cores = JSON.parse(this.$mkf.load_core_data(JSON.stringify(data)));
        //         console.log(data.cores)
        //         this.$dataCacheStore.loadCores(data.cores);
        //         console.log(this.$dataCacheStore.masData.cores[0].functionalDescription.shape);
        //     });
        // }
    },
    mounted () {
        const url = import.meta.env.VITE_API_ENDPOINT + '/read_mas_inventory'
            console.log(url)
        this.$axios.post(url, {})
        .then(response => {
            this.inventoryCacheStore.coreInventory = response.data['cores'];

            console.log(this.inventoryCacheStore.coreInventory[0])

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
                    const aux = JSON.parse(mkf.calculate_advised_cores(JSON.stringify(this.masStore.mas.inputs), JSON.stringify(this.inventoryCacheStore.coreInventory), JSON.stringify(this.$dataCacheStore.masData), 43));
                    console.log(aux['cores'].length);
                    console.log(calculateObjectSize(aux['cores']));
                    console.log(aux['cores'][0]);
                    console.log(aux['log']);
                    console.log(aux['scores']);
                }
                else {
                    console.error("No operating points found")
                }
            });

            this.$mkf.ready.then(_ => {
                var filters = this.$mkf.get_available_core_filters();
                for (var i = 0; i < filters.size(); i++) {
                    this.weights[filters.get(i)] = 100;
                }
            });
        })
        .catch(error => {
            console.error("Error loading inventory")
            console.error(error)
        });
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <div class="row">

            <div class="col-sm-12 col-md-2 text-start border border-primary m-0 px-2 ">
                <div class="row" v-for="value, key in weights">
                    <label class="form-label col-12">{{titledFilters[key]}}</label>
                    <div class=" col-7 me-2 pt-2">
                        <vue3-slider v-model="weights[key]" class="col-2 text-primary" :height="10" :min="0" :max="100" :step="10"  id="core-adviser-weight-area-product" :color="theme.primary" :handleScale="2" :alwaysShowHandle="true"/>
                    </div>

                    <input :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 mb-2 px-0 col-3 bg-light text-white" v-model="weights[key]">

                </div>
            </div>
            <div class="col-sm-12 col-md-10 text-start pe-0 ">
                <div class="row">
                    <div class="col-4 m-0 p-0 mt-1" v-for="advise, adviseIndex in advises">
                        <Advise
                            v-if="Object.values(titledFilters).length > 0"
                            :adviseIndex="adviseIndex"
                            :filters="Object.values(brokenLinedFilters)"
                            :scoring="[1, 0.2, 0.5, 0.6, 0.9, 0.5]"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

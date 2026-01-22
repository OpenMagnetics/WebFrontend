<script setup>
import { useMasStore } from '../../stores/mas'
import { useAdviseCacheStore } from '../../stores/adviseCache'
import Slider from '@vueform/slider'
import { removeTrailingZeroes, toTitleCase, toCamelCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
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
        this.$emit("canContinue", true);
    },
    methods: {
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
        editMagnetic(index) {
            this.masStore.mas = this.catalogStore.advises[index].mas
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$emit("canContinue", true);
        },
        calculateAdvisedMagnetics() {
            this.catalogStore.advises = [];
            this.loading = true;
            setTimeout(() => {
                const url = import.meta.env.VITE_API_ENDPOINT + '/calculate_advised_magnetics';

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

                const data = {
                    inputs:  this.masStore.mas.inputs,
                    maximum_number_results:  9,
                    filter_flow: filterFlow,
                }

                this.$axios.post(url, data)
                .then(response => {
                    this.catalogStore.advises = [];
                    this.loading = false;

                    response.data.data.forEach((datum) => {
                        this.catalogStore.advises.push(datum);
                    })
                })
                .catch(error => {
                    this.loading = false;
                    console.error(error);
                });

            }, 100);
        },

    }
}
</script>

<template>
    <div class="container text-start pe-0 container-fluid"  style="height: 75vh" :style="$styleStore.catalogAdviser.main">
        <div class="row">
            <div class="col-2 border text-center p-0 m-0 row control"  style="height: 75vh">
                <div class="col-12">
                    <label :data-cy="dataTestLabel + '-explanation-text'" class="">Do you want to search in Midcom history for possible similar designs?</label>

                    <button
                        :disabled="loading"
                        class="btn fs-5 py-1 offset-1 col-10"
                        :style="$styleStore.catalogAdviser.searchButton"
                        @click="calculateAdvisedMagnetics"
                    >
                        {{loading? 'Searching in history' : 'Search history'}}
                    </button>
                    <h5
                        v-if="!loading"
                        :data-cy="dataTestLabel + '-history-explanation-text'"
                        class="fw-light fs-6"
                    >
                        {{loading? '\n' : '(It might take a few minutes)'}}
                    </h5>

                    <div class="row text-start" v-for="(weight, filter) in catalogStore.filters" :key="filter">
                        <label class="form-label col-12 py-0 my-0">{{filter}}</label>
                        <div class=" col-7 me-2 pt-2">
                            <Slider v-model="catalogStore.filters[filter]" :disabled="loading" class="col-12 text-primary slider" :height="10" :min="0" :max="100" :step="10" :color="theme.primary" :tooltips="false" @change="changedSliderValue(filter, $event)"/>
                        </div>

                        <input :disabled="loading" :data-cy="dataTestLabel + '-number-input'" type="number" class="m-0 px-0 col-3" @change="changedInputValue(filter, $event.target.value)" :value="removeTrailingZeroes(catalogStore.filters[filter], 0)" ref="inputRef"/>

                    </div>
                    <button
                        :disabled="loading"
                        class="btn fs-5 my-2 offset-1 col-10"
                        :style="$styleStore.catalogAdviser.continueButton"
                        @click="continueWithoutSearch"
                    >
                        {{"No thanks"}}
                    </button>
                </div>
            </div>
            <div class="col-10 text-start pe-0 container-fluid"  style="height: 75vh">
                <div class="row" v-if="loading" >
                    <img data-cy="magneticAdviser-loading" class="mx-auto d-block col-12" alt="loading" style="width: auto; height: 20%;" :src="$settingsStore.loadingGif">
                </div>
                <div class="col-12 row advises">
                    <div class="col-4 m-0 p-0 mt-1" v-for="(advise, adviseIndex) in catalogStore.advises" :key="adviseIndex">
                        <Advise
                            :adviseIndex="adviseIndex"
                            :masData="advise.mas"
                            :scoring="advise.scoring"
                            :allowView="false"
                            :allowEdit="true"
                            :allowOrder="false"
                            @editMagnetic="editMagnetic(adviseIndex)"
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
<script setup>
import { useMasStore } from '/src/stores/mas'
import Dimension from '/src/components/DataInput/Dimension.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { checkAndFixMas } from '/src/assets/js/utils.js'
import { useHistoryStore } from '/src/stores/history'
import { tooltipsMagneticBuilder } from '/src/assets/js/texts.js'
</script>

<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        windingIndex: {
            type: Number,
            default: 0,
        },
        loadingGif: {
            type: String,
            default: "/images/loading.gif",
        },
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const loading = false;
        const blockingRebounds = false;
        const forceUpdate = 0;
        const recentChange = false;
        const tryingToAssign = false;
        var localData = {
            numberTurns: 1,
            numberParallels: 1,
        };

        return {
            blockingRebounds,
            masStore,
            historyStore,
            localData,
            forceUpdate,
            loading,
            recentChange,
            tryingToAssign,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    'transition-delay': '1s',
                    width: '300px',
                    "text-align": "start",
                },
            }
        },
    },
    watch: {
        'masStore.mas.magnetic.coil.functionalDescription': {
            handler(newValue, oldValue) {
                if (!this.blockingRebounds && newValue[this.windingIndex].numberTurns != this.localData.numberTurns) {
                    this.assignLocalData(newValue[this.windingIndex])
                    this.blockingRebounds = true;
                    setTimeout(() => this.blockingRebounds = false, 10);
                }
            },
          deep: true
        },
    },
    mounted () {
        // this.cleanCoil();

        this.blockingRebounds = true;
        setTimeout(() => this.blockingRebounds = false, 10);

        checkAndFixMas(this.masStore.mas, this.$mkf).then(response => {
            this.masStore.mas = response;
            this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex]);
        })
        .catch(error => {
            console.error(error.data)
        });

        this.historyStore.$onAction((action) => {
            if (action.name == "historyPointerUpdated") {
                this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex])
                this.blockingRebounds = true;
                setTimeout(() => this.blockingRebounds = false, 10);
            }
        })
    },
    methods: {
        tryToAssign() {
            if (!this.tryingToAssign) {
                this.recentChange = false;
                this.tryingToAssign = true;
                setTimeout(() => {
                    if (this.recentChange) {
                        this.tryingToAssign = false;
                        this.tryToAssign();
                    }
                    else {
                        this.assignTurns();
                    }
                }
                , 100);
            }
        },
        cleanCoil() {
            setTimeout(() => {
                this.masStore.mas.magnetic.coil.turnsDescription = null;
                this.masStore.mas.magnetic.coil.layersDescription = null;
                this.masStore.mas.magnetic.coil.sectionsDescription = null;
            }, 50);
            
        },
        assignLocalData(winding) {
            this.localData["numberTurns"] = winding.numberTurns;
            this.localData["numberParallels"] = winding.numberParallels;
            this.forceUpdate += 1;
        },
        assignTurns() {
            if (!this.blockingRebounds) {
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberTurns = this.localData["numberTurns"];
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberParallels = this.localData["numberParallels"];
            }
            this.tryingToAssign = false;
        },
        turnsUpdated() {
            if (this.localData["numberTurns"] != this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberTurns ||
                this.localData["numberParallels"] != this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberParallels) {

                this.cleanCoil();
            }
            this.recentChange = true;
            this.tryToAssign();
        },

    }
}
</script>

<template>
    <div class="container">
        <div class="row" v-tooltip="styleTooltip">
            <img :data-cy="dataTestLabel + '-BasicWireSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireNumberTurns"
                v-if="!loading"
                :name="'numberTurns'"
                :replaceTitle="'No. Turns'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberTurns'"
                :numberDecimals="0"
                :min="1"
                :max="1000000"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-6 col-6'"
                @update="turnsUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
                v-tooltip="tooltipsMagneticBuilder.wireNumberParallels"
                v-if="!loading"
                :name="'numberParallels'"
                :replaceTitle="'No. Parallels'"
                :unit="null"
                :dataTestLabel="dataTestLabel + '-NumberParallels'"
                :numberDecimals="0"
                :min="1"
                :max="1000000"
                :allowNegative="false"
                :modelValue="localData"
                :forceUpdate="forceUpdate"
                :styleClassInput="'offset-6 col-6'"
                @update="turnsUpdated"
            />
        </div>
    </div>
</template>

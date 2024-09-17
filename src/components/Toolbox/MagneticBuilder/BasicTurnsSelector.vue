<script setup>
import { useMasStore } from '/src/stores/mas'
import Dimension from '/src/components/DataInput/Dimension.vue'
import Module from '/src/assets/js/libAdvisers.wasm.js'
import { checkAndFixMas } from '/src/assets/js/utils.js'
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
        const loading = false;
        const blockingRebounds = false;
        const forceUpdate = 0;
        var localData = {
            numberTurns: 1,
            numberParallels: 1,
        };

        return {
            blockingRebounds,
            masStore,
            localData,
            forceUpdate,
            loading,
        }
    },
    computed: {
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
        checkAndFixMas(this.masStore.mas, this.$mkf).then(response => {
            this.masStore.mas = response;
            this.assignLocalData(this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex]);
        })
        .catch(error => {
            console.error(error.data)
        });
    },
    methods: {
        cleanCoil() {
            this.masStore.mas.magnetic.coil.turnsDescription = null;
            this.masStore.mas.magnetic.coil.layersDescription = null;
            this.masStore.mas.magnetic.coil.sectionsDescription = null;
        },
        assignLocalData(winding) {
            this.localData["numberTurns"] = winding.numberTurns;
            this.localData["numberParallels"] = winding.numberParallels;
            this.forceUpdate += 1;
        },
        assignWire() {
            this.$mkf.ready.then(_ => {
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberTurns = this.localData["numberTurns"];
                this.masStore.mas.magnetic.coil.functionalDescription[this.windingIndex].numberParallels = this.localData["numberParallels"];
            });
        },
        wireUpdated() {
            this.assignWire();
        },

    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <img :data-cy="dataTestLabel + '-BasicWireSelector-loading'" v-if="loading" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" :src="loadingGif">
            <Dimension class="col-12 mb-1 text-start"
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
                :styleClassInput="'offset-6'"
                @update="wireUpdated"
            />
            <Dimension class="col-12 mb-1 text-start"
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
                :styleClassInput="'offset-6'"
                @update="wireUpdated"
            />
        </div>
    </div>
</template>

<script setup>
import DimensionReadOnly from '/WebSharedComponents/DataInput/DimensionReadOnly.vue'
import { removeTrailingZeroes } from '/WebSharedComponents/assets/js/utils.js'
import { minimumMaximumScalePerParameter, titleColor } from '/WebSharedComponents/assets/js/defaults.js'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const localData = {
            instantaneousPower: null,
            rmsPower: null,
        }
        return {
            localData
        }
    },
    computed: {
    },
    watch: {
        'modelValue': {
          handler(newValue, oldValue) {
            this.process();
          },
          deep: true
        }
    },
    mounted () {
        this.process();
    },
    methods: {
        process() {
            this.$mkf.ready.then(_ => {
                this.localData.instantaneousPower = this.$mkf.calculate_instantaneous_power(JSON.stringify(this.modelValue));
                this.localData.rmsPower = this.$mkf.calculate_rms_power(JSON.stringify(this.modelValue));
            });
        }
    }
}
</script>

<template>
    <div class="container-flex">
        <div class="row">
            <DimensionReadOnly class="col-6"
                :name="'instantaneousPower'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-InstantaneousPower'"
                :value="localData.instantaneousPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :styleClass="'fs-5'"
            />
            <DimensionReadOnly class="col-6"
                :name="'rmsPower'"
                :unit="'W'"
                :dataTestLabel="dataTestLabel + '-rmsPower'"
                :value="localData.rmsPower"
                :min="minimumMaximumScalePerParameter.power.min"
                :max="minimumMaximumScalePerParameter.power.max"
                :disableShortenLabels="true"
                :styleClass="'fs-5'"
            />
        </div>
    </div>
</template>


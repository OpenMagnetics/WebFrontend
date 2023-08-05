<script setup>
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { getRootMeanSquare,
         formatPower,
         getInstantaneousPower,
         removeTrailingZeroes } from '/src/assets/js/utils.js'
import { useCurrentStore,
         useVoltageStore,
         useCommonStore } from '/src/stores/waveform'
import { titleColor } from '/src/assets/js/defaults.js'
</script>

<script>
export default {
    emits: [],
    components: {
    },
    props: {
    },
    data() {

        const commonStore = useCommonStore()
        const voltageStore = useVoltageStore()
        const currentStore = useCurrentStore()
        var currentSampledDataPoint = null
        var voltageSampledDataPoint = null
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
        }
        const rmsPower = null;
        const rmsPowerUnit = null;
        const instantaneousPower = null;
        const instantaneousPowerUnit = null;
        return {
            commonStore,
            voltageStore,
            currentStore,
            currentSampledDataPoint,
            voltageSampledDataPoint,
            style,
            theme,
            rmsPower,
            rmsPowerUnit,
            instantaneousPower,
            instantaneousPowerUnit,
        }
    },
    methods: {
        getOutputs() {
            const currentRMS = getRootMeanSquare(this.currentSampledDataPoint)
            const voltageRMS = getRootMeanSquare(this.voltageSampledDataPoint)
            const rmsPowerAux = formatPower(currentRMS * voltageRMS)
            this.rmsPower = removeTrailingZeroes(rmsPowerAux['label'], 2)
            this.rmsPowerUnit = rmsPowerAux['unit']

            const instantaneousPowerRaw = getInstantaneousPower(this.currentSampledDataPoint, this.voltageSampledDataPoint)
            const instantaneousPowerAux = formatPower(removeTrailingZeroes(instantaneousPowerRaw, 2))
            this.instantaneousPower = removeTrailingZeroes(instantaneousPowerAux['label'], 2)
            this.instantaneousPowerUnit = instantaneousPowerAux['unit']
        }

    },
    computed: {

    },
    mounted() {
        this.currentStore.$onAction((action) => {
            if (action.name == "setSampledDataPoints") {
                this.currentSampledDataPoint = action.args[0]
                if (this.voltageSampledDataPoint != null && this.currentSampledDataPoint != null){
                    this.getOutputs()
                }
            }
        })

        this.voltageStore.$onAction((action) => {
            if (action.name == "setSampledDataPoints") {
                this.voltageSampledDataPoint = action.args[0]
                if (this.voltageSampledDataPoint != null && this.currentSampledDataPoint != null){
                    this.getOutputs()
                }
            }
        })

    },
}

</script>


<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom me-2">
            <label class="fs-4 ms-3 mb-3" :class="titleColor('power')"> Outputs for Power</label>
            <div></div>
            <label class="fs-5 ms-3">RMS power:</label>
            <label data-cy="OperationPointCombinedOutput-rms-power-text" class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{rmsPowerUnit}}</label>
            <label data-cy="OperationPointCombinedOutput-rms-power-unit-text" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{rmsPower}}</label>

            <div></div>
            <label class="fs-5 ms-3">Instantaneous power:</label>
            <label data-cy="OperationPointCombinedOutput-instantaeous-power-text" class="fs-5 ms-2 me-4 float-end" style="width: 10px;">{{instantaneousPowerUnit}}</label>
            <label data-cy="OperationPointCombinedOutput-instantaeous-power-unit-text" class="fs-5 bg-dark text-white float-end" style="width: 100%; max-width: 60px; text-align:right;">{{instantaneousPower}}</label>

    </div>
</template>


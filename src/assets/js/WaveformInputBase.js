import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'

export function loadBase(electricalParameter, precision, isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams) {
    configure({
      validateOnBlur: true,
      validateOnChange: true,
      validateOnInput: true,
      validateOnModelUpdate: true,
    });

    const offset = ref(0)
    const peakToPeak = ref(5)
    const dutyCycle = ref(0.5)
    const switchingFrequency = ref(100000)
    const data = ref(defaultData)
    const formRef = ref(null);
    const commonStore = useCommonStore()

    var store = null
    const getDataPoints = computed(() => {
        return dataPoints
    })

    const titleColor = computed(() => {
        if (electricalParameter == "current") {
            return "text-info"
        }
        else {
            return "text-primary"
        }
    })

    const offsetValue = computed((event) => {
        return offset.value
    })

    function peakToPeakChange(event) {
        peakToPeak.value = Number(event.target.value)
        store.setParam("peakToPeak", peakToPeak.value);
        updateDataPoints()
    }
    function offsetChange(event) {
        offset.value = Number(event.target.value)
        store.setParam("offset", offset.value);
        updateDataPoints()
    }

    function updateDataPoints() {
        var params = store.getParams.value
        params['dutyCycle'] = dutyCycle.value
        if (params['offset'] == undefined) {
            params['offset'] = offset.value
        }
        if (params['peakToPeak'] == undefined) {
            params['peakToPeak'] = peakToPeak.value
        }
        const aux = getDataPointsFromParams(params)
        store.setDataPoints(Utils.deepCopy(Utils.scaleData(aux, switchingFrequency.value)));
    }

    onMounted(() => {
        if (electricalParameter == "current") {
            store = useCurrentStore()
        } else {
            store = useVoltageStore()
        }


        if (isChartReady) {
            switchingFrequency.value = commonStore.getSwitchingFrequency.value;
            dutyCycle.value = commonStore.getDutyCycle.value;
            updateDataPoints()
            // store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
            // const {peakToPeakValue, dutyCycleValue, offsetValue} = getParamsFromDataPoints(data.value, precision)
            // store.setParam("peakToPeak", peakToPeakValue);
            // store.setParam("offset", offsetValue);
        }

        store.$onAction((action) => {
            if (action.name == "setChartReady") {
                store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
            }
            else if (action.name == "setDataPointsFromDragging") {
                const dataPoints = action.args[0]
                const {peakToPeakValue, dutyCycleValue, offsetValue} = getParamsFromDataPoints(dataPoints, precision)
                peakToPeak.value = Number(peakToPeakValue)
                offset.value = Number(offsetValue)
                store.setParam("peakToPeak", peakToPeakValue);
                commonStore.setDutyCycleFromPoints(dutyCycleValue);
                store.setParam("offset", offsetValue);
            }
        })
        commonStore.$onAction((action) => {
            if (action.name == "setDutyCycle") {
                dutyCycle.value = action.args[0]
                updateDataPoints()
            }
            if (action.name == "setSwitchingFrequency") {
                switchingFrequency.value = action.args[0]
                updateDataPoints()
            }
        })
    })

    const schema = Yup.object().shape({
        offsetValidator: Yup.number().required().typeError("The value for offset must be a number"),
        peakToPeakValidator: Yup.number().required().typeError("The value for peak to peak must be a number"),
    });

    return {
        offset,
        peakToPeak,
        dutyCycle,
        data,
        store,
        getDataPoints,
        titleColor,
        offsetValue,
        peakToPeakChange,
        offsetChange,
        schema,
        formRef,
        }
}
import { ref, watch, computed, defineProps, onMounted } from 'vue'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/waveformDefaults.js'

export function loadBase(electricalParameter, isChartReady, defaultData, getParamsFromDataPoints, getDataPointsFromParams) {
    configure({
      validateOnBlur: true,
      validateOnChange: true,
      validateOnInput: true,
      validateOnModelUpdate: true,
    });

    var store = null
    
    if (electricalParameter == "current") {
        store = useCurrentStore()
    } else {
        store = useVoltageStore()
    }
    const commonStore = useCommonStore()
    var params = store.getParams.value

    const offset = ref(params['offset'])
    const peakToPeak = ref(params['peakToPeak'])
    const switchingFrequency = ref(commonStore.getSwitchingFrequency.value)
    const dutyCycle = ref(commonStore.getDutyCycle.value)
    const data = ref(defaultData)
    const formRef = ref(null);


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
        if (isChartReady) {
            switchingFrequency.value = commonStore.getSwitchingFrequency.value;
            dutyCycle.value = commonStore.getDutyCycle.value;
            updateDataPoints()
        }

        store.$onAction((action) => {
            if (action.name == "setChartReady") {
                store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
            }
            else if (action.name == "setDataPointsFromDragging" || action.name == "setDataPointsFromFile") {
                const dataPoints = action.args[0]
                const {peakToPeakValue, dutyCycleValue, offsetValue} = getParamsFromDataPoints(dataPoints, Defaults.defaultPrecision)
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

        store.setNewWaveformType()
    })

    const schema = Yup.object().shape({
        offsetValidator: Yup.number().required().typeError("The value for offset must be a number"),
        peakToPeakValidator: Yup.number().required().typeError("The value for peak to peak must be a number").min(Defaults.defaultMinimumNumberForms),
    });

    return {
        offset,
        peakToPeak,
        dutyCycle,
        data,
        store,
        peakToPeakChange,
        offsetChange,
        schema,
        formRef,
        }
}
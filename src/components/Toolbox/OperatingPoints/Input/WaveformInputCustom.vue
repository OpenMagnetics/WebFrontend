<script setup>
import WaveformInputCustomPoint from './WaveformInputCustomPoint.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import { WaveformLabel } from 'WebSharedComponents/assets/ts/MAS.ts'
import { minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    emits: ["labelChanged"],
    props: {
        // Non-empty: the induce button is shown disabled, with this as its explanation
        // (an inductor derives the other signal by itself; see OperatingPointManual).
        induceDisabledReason: {
            type: String,
            default: '',
        },
        modelValue:{
            type: Object,
            required: true
        },
        signalDescriptor: {
            type: String,
            required: false,
            default: "current",
        },
        defaultValue:{
            type: Object,
            default: () => ({})
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        var resettingPoints = false;
        var addedOrRemovedIndex = 0;
        var showAllPoints = false;
        return {
            resettingPoints,
            addedOrRemovedIndex,
            showAllPoints
        }
    },
    computed: {
        waveformLabelOptions() {
            const result = {};
            Object.values(WaveformLabel).forEach(v => { result[v] = toTitleCase(v); });
            // toTitleCase inserts a space before every capital, so the DCM
            // acronym renders as "Rectangular D C M". Keep it intact.
            result[WaveformLabel.RectangularDCM] = 'Rectangular DCM';
            return result;
        },
        induceableSignal() {
            if (this.signalDescriptor == 'current') {
                return true;
            }
            else {
                const label = this.modelValue.current?.processed?.label;
                return label != "rectangular" && label != "bipolarRectangular" && label != "unipolarRectangular";
            }
        }
    },

    methods: {
        addedOrRemovedPoint() {
            this.resettingPoints = true;
            this.addedOrRemovedIndex = true;
            this.$emit('updatedTime');
            setTimeout(() => this.resettingPoints = false, 100);
        },
        labelChanged(value) {
            this.$emit("labelChanged");
        },
    }
}
</script>

<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3">
        <!-- <label class="text-2xl row" :class="titleColor(signalDescriptor)">Waveform for {{signalDescriptor}}</label> -->
        <div></div>
        <ElementFromList class="pb-2 mb-1"
            v-if="modelValue[signalDescriptor] != null"
            :name="'label'"
            :dataTestLabel="dataTestLabel + '-Label'"
            :options="Object.values(WaveformLabel)"
            :optionLabels="waveformLabelOptions"
            :titleSameRow="true"
            :replaceTitle="'Waveform'"
            v-model="modelValue[signalDescriptor].processed"
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
            @update="labelChanged"
        />
        <div v-if="modelValue[signalDescriptor] != null && modelValue[signalDescriptor].waveform != null && modelValue[signalDescriptor].waveform.data != null">
            <template v-for="(value, key) in modelValue[signalDescriptor].waveform.data" :key="key">
                <WaveformInputCustomPoint
                    v-if="(!resettingPoints || addedOrRemovedIndex>=key) && (showAllPoints || key < 3 || Object.keys(modelValue[signalDescriptor].waveform.data).length <= 3)"
                    :modelValue="modelValue[signalDescriptor].waveform"
                    :name="key"
                    :dataTestLabel="dataTestLabel + '-WaveformInputCustomPoint-' + key"
                    :signalDescriptor="signalDescriptor"
                    @updatedTime="$emit('updatedTime')"
                    @updatedData="$emit('updatedData')"
                    @addedOrRemovedPoint="addedOrRemovedPoint(key)"
                    />
                    <div v-else-if="resettingPoints && addedOrRemovedIndex<key" style="height: 40px;"></div>
            </template>
            <button
                v-if="Object.keys(modelValue[signalDescriptor].waveform.data).length > 3"
                class="wic-add-btn col-12 mt-1 py-0"
                style="font-size: 0.75em;"
                @click="showAllPoints = !showAllPoints">
                <i :class="showAllPoints ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
                {{ showAllPoints ? 'Show less' : `Show ${Object.keys(modelValue[signalDescriptor].waveform.data).length - 3} more points` }}
            </button>
        </div>
        <button
            v-if="induceableSignal"
            type="button"
            class="op-induce"
            :disabled="induceDisabledReason !== ''"
            :title="induceDisabledReason !== '' ? induceDisabledReason : null"
            @click="$emit('induce')">
            <i class="pi pi-bolt"></i>
            {{'Induce from ' + (signalDescriptor == 'current'? 'voltage' : 'current')}}
        </button>
    </div>
</template>

<style scoped>
/* The induce button is styled with the editor cells (.op-induce in OperatingPoint.vue). */

/* "Show N more points" toggle: a subtle outline button instead of the
   unstyled grey bar. */
.wic-add-btn {
    background: rgba(var(--p-white-rgb), 0.06);
    border: 1px solid rgba(var(--p-white-rgb), 0.15);
    color: rgba(var(--p-white-rgb), 0.85);
    border-radius: 8px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.wic-add-btn:hover {
    background: rgba(var(--p-white-rgb), 0.12);
    border-color: rgba(var(--p-white-rgb), 0.3);
}
</style>


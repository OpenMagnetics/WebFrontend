<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import OperatingPoint from '../OperatingPoints/OperatingPoint.vue'
import Drawer from 'primevue/drawer'

</script>
<script>

export default {
    components: { Drawer },
    emits: ['canContinue', 'update:visible'],
    props: {
        name: {
            type: String,
            default: '',
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        visible: { type: Boolean, default: false },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();

        return {
            masStore,
            taskQueueStore,
        }
    },
    methods: {
        updatedWaveform(signalDescriptor) {

            this.convertFromWaveformToProcessed(0, 0, signalDescriptor);
        },
        async convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor) {
            var processed = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed;
            var frequency = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].frequency;

            try {
                if (processed && processed.label != "custom") {
                    var waveform = await this.taskQueueStore.createWaveform(processed, frequency);

                    if (waveform.data.length > 0) {
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = waveform;
                        this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                    }
                }
                else {
                    var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;
                    var scaledWaveform = await this.taskQueueStore.scaleWaveformTimeToFrequency(waveform, frequency);
                    this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = scaledWaveform;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                }
            } catch (error) {
                console.error('Error in convertFromProcessedToWaveform:', error);
            }
        },
        async convertFromWaveformToProcessed(operatingPointIndex, windingIndex, signalDescriptor) {
            var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;

            try {
                var processed = await this.taskQueueStore.calculateBasicProcessedData(waveform);

                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = processed;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.dutyCycle = processed.dutyCycle;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed.dutyCycle = processed.dutyCycle;
                if (signalDescriptor == 'voltage'){
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                }
            } catch (error) {
                console.error('Error in convertFromWaveformToProcessed:', error);
            }
        },
    },
    mounted() {
        if (this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.length > 0) {
            if (this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].current.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].current.processed).length === 0){
                this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].current.processed = deepCopy(defaultOperatingPointExcitation.current.processed)
            }
            if (this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed == null || Object.keys(this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0].voltage.processed).length === 0){
                this.modelValue.voltage.processed = deepCopy(defaultOperatingPointExcitation.voltage.processed)
            }
        }
        this.$emit("canContinue", this.canContinue);

        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                const operatingPointIndex = 0;
                const windingIndex = 0;
                const signalDescriptor = action.args[0];

                if (signalDescriptor != null) {
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor);
                }
                else {
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "voltage");
                }
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                const signalDescriptor = action.args[0];
            }

            this.$emit("canContinue", this.canContinue);
        })
    },
    created() {
    },
}
</script>


<template>
    <Drawer
        :visible="visible"
        @update:visible="(v) => $emit('update:visible', v)"
        position="left"
        :modal="true"
        :style="{ width: '65vw', background: 'var(--bs-dark)' }"
        :header="'Edit Operation Point'">
        <div class="container mx-auto text-white">
            <OperatingPoint @updatedWaveform="updatedWaveform" />
        </div>
    </Drawer>

</template>
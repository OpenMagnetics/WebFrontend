<script setup>
import { useMasStore } from '../../../stores/mas'
import OperatingPoint from '../OperatingPoints/OperatingPoint.vue'

</script>
<script>

export default {
    props: {
        name: {
            type: String,
            default: '',
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();

        return {
            masStore,
        }
    },
    methods: {
        updatedWaveform(signalDescriptor) {

            this.convertFromWaveformToProcessed(0, 0, signalDescriptor);
        },
        convertFromProcessedToWaveform(operatingPointIndex, windingIndex, signalDescriptor) {
            var processed = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed;
            var frequency = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].frequency;

            this.$mkf.ready.then(_ => {
                if (processed.label != "Custom") {
                    var waveform = JSON.parse(this.$mkf.create_waveform(JSON.stringify(processed), frequency));

                    if (waveform.data.length > 0) {
                        this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = waveform;
                        this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                    }
                }
                else {
                    var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;
                    var scaledWaveform = JSON.parse(this.$mkf.scale_waveform_time_to_frequency(JSON.stringify(waveform), frequency));
                    this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform = scaledWaveform;
                    this.masStore.updatedInputExcitationWaveformUpdatedFromProcessed(signalDescriptor);
                }
            });

        },
        convertFromWaveformToProcessed(operatingPointIndex, windingIndex, signalDescriptor) {
            var waveform = this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].waveform;

                        console.time('Execution Time');
            this.$mkf.ready.then(_ => {
                        console.timeEnd('Execution Time');
                var processed = JSON.parse(this.$mkf.calculate_basic_processed_data(JSON.stringify(waveform)));

                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex][signalDescriptor].processed = processed;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].current.processed.dutyCycle = processed.dutyCycle;
                this.masStore.mas.inputs.operatingPoints[operatingPointIndex].excitationsPerWinding[windingIndex].voltage.processed.dutyCycle = processed.dutyCycle;
                if (signalDescriptor == 'voltage'){
                    this.convertFromProcessedToWaveform(operatingPointIndex, windingIndex, "current");
                }
            });
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
    <div class="offcanvas offcanvas-size-lg offcanvas-start bg-dark" tabindex="-1" :id="name" :aria-labelledby="name + 'OperatingPointOffCanvasLabel'">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title text-white fs-3" :id="name + 'OperatingPointOffCanvasLabel'">Edit Operation Point</h5>
            <button :data-cy="dataTestLabel + '-SimulationOperationPointTool-corner-close-button'" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="OperatingPointOffCanvasClose"></button>
        </div>
        <div class="offcanvas-body">
            <div class="container mx-auto text-white">
                <OperatingPoint 
                    @updatedWaveform="updatedWaveform"
                />
            </div>
        </div>
    </div>

</template>
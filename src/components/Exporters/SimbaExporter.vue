<script setup>
import { clean, download } from 'WebSharedComponents/assets/js/utils.js'
import { useTaskQueueStore } from '../../stores/taskQueue'

</script>
<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        magnetic: {
            type: Object,
            required: true,
        },
        temperature: {
            type: Number,
            required: true,
        },
        attachToFile: {
            type: Boolean,
            default: false,
        },
        classProp: {
            type: String,
            default: "btn-primary m-0 p-0",
        },
    },
    data() {
        const taskQueueStore = useTaskQueueStore();
        const exported = false;

        return {
            taskQueueStore,
            exported,
        }
    },
    computed: {
    },
    methods: {
        readSimbaFile(event) {
            const fr = new FileReader();

            const name = this.$refs['simbaFileReader'].files.item(0).name
            fr.readAsText(this.$refs['simbaFileReader'].files.item(0));


            fr.onload = async e => {
                const jsimba = e.target.result

                this.exported = true
                try {
                    var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(this.magnetic, this.temperature, "SIMBA", jsimba);
                    const filename = name.split(".")[0];
                    var blob = new Blob([subcircuit], {
                        type: 'text/csv; charset=utf-8'
                    });
                    download(blob, filename + "_with_OM_library.jsimba", "text/plain;charset=UTF-8");


                } catch (error) {
                    console.error(error);
                } finally {
                    this.exported = false
                }
            }
        },
        onClick() {
            if (this.attachToFile) {
                this.$refs.simbaFileReader.click()
                this.exported = true
                setTimeout(() => this.exported = false, 2000);

            }
            else {
                // The export can take several seconds: the button stays disabled, with a spinner,
                // until the file has been produced (ABT #2582).
                this.exported = true
                this.createSimbaSubcircuit().finally(() => { this.exported = false });
            }
        },
        async createSimbaSubcircuit() {
            try {
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(this.magnetic, this.temperature, "SIMBA", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
                download(blob, this.magnetic.manufacturerInfo.reference + ".jsimba", "text/csv; charset=utf-8");

            } catch (error) {
                console.error(error);
            }
        },
    }
}
</script>

<template>
    <div class="container">
        <input data-cy="CoreImport-MAS-file-button" type="file" ref="simbaFileReader" @change="readSimbaFile()" class="p-button p-button-primary mt-1 rounded-3" hidden />
        <button
            :style="$styleStore.magneticBuilder.main"
            :disabled="exported"
            :data-cy="dataTestLabel + '-download-button'"
            class="btn p-2"
            :class="classProp"
            @click="onClick"
        >
            <i v-if="exported" class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i>
            {{attachToFile? 'Attach magnetic subcircuit to Simba simulation' : 'Download magnetic subcircuit for Simba'}} 
        </button>
    </div>
</template>
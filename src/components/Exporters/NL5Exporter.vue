<script setup>
import { download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
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
        classProp: {
            type: String,
            default: "btn-primary m-0 p-0",
        },
    },
    data() {
        const taskQueueStore = useTaskQueueStore();
        return {
            taskQueueStore,
            exported: false,
        }
    },
    methods: {
        onClick() {
            this.exported = true;
            setTimeout(() => this.createNL5Subcircuit(), 20);
            setTimeout(() => this.exported = false, 2000);
        },
        async createNL5Subcircuit() {
            try {
                const magnetic = deepCopy(this.magnetic);
                magnetic.manufacturerInfo.reference = magnetic.manufacturerInfo.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.temperature, "NL5", "");
                var blob = new Blob([subcircuit], { type: 'application/xml; charset=utf-8' });
                const filename = magnetic.manufacturerInfo.reference;
                download(blob, filename + ".nl5", "application/xml; charset=utf-8");
            } catch (error) {
                console.error(error);
            }
        },
    }
}
</script>

<template>
    <div class="container">
        <button
            :style="$styleStore.magneticBuilder.main"
            :disabled="exported"
            :data-cy="dataTestLabel + '-download-button'"
            class="btn p-2"
            :class="classProp"
            @click="onClick"
        >
            {{'Download magnetic subcircuit for NL5'}}
        </button>
    </div>
</template>

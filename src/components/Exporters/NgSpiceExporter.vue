<script setup>
import { clean, download, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
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
        const exported = false;

        return {
            taskQueueStore,
            exported,
        }
    },
    computed: {
    },
    methods: {
        onClick() {
            this.exported = true
            if (this.isSymbol) {
                setTimeout(() => this.createLtSpiceSymbol(), 20);
            }
            else {
                setTimeout(() => this.createLtSpiceSubcircuit(), 20);
            }
            setTimeout(() => this.exported = false, 2000);
        },
        async createLtSpiceSubcircuit() {
            try {
                const magnetic = deepCopy(this.magnetic);
                magnetic.manufacturerInfo.reference = magnetic.manufacturerInfo.reference.replaceAll(" ", "_").replaceAll("-", "_").replaceAll(".", "_").replaceAll(",", "_").replaceAll(":", "_").replaceAll("___", "_").replaceAll("__", "_");
                var subcircuit = await this.taskQueueStore.exportMagneticAsSubcircuit(magnetic, this.temperature, "LtSpice", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
                const filename = magnetic.manufacturerInfo.reference;
                download(blob, filename + ".cir", "text/csv; charset=utf-8");

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
            {{'Download magnetic subcircuit for NgSpice'}}
        </button>
    </div>
</template>
<script setup>
import { clean, download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'

</script>
<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        mas: {
            type: Object,
            required: true,
        },
        includeInputs: {
            type: Boolean,
            default: false,
        },
        classProp: {
            type: String,
            default: "btn-primary m-0 p-0",
        },
    },
    data() {
        const exported = false;

        return {
            exported,
        }
    },
    computed: {
    },
    methods: {
        onClick() {
            var mas = deepCopy(this.mas);
            // "only with magnetic" (includeInputs false) strips the excitations
            // and results; "with excitations and results" keeps them.
            if (!this.includeInputs) {
                delete mas.inputs;
                delete mas.outputs;
            }

            mas = clean(mas);

            download(JSON.stringify(mas, null, 4), this.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
            this.exported = true
            setTimeout(() => this.exported = false, 2000);
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
            {{includeInputs? 'Download MAS file with excitations and results' : 'Download MAS file only with magnetic'}}
        </button>
    </div>
</template>
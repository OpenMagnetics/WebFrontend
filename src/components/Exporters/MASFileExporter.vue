<script setup>
import { clean, download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { assertValidMas } from 'WebSharedComponents/assets/js/masValidator.js'

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
        const exportError = '';

        return {
            exported,
            exportError,
        }
    },
    computed: {
    },
    methods: {
        onClick() {
            this.exportError = '';
            // Every download is a valid document of its schema (ABT #1388):
            //  - "with excitations and results": a full MAS (inputs + magnetic + outputs);
            //  - "only with magnetic": a MAS Magnetic document (magnetic.json). It used
            //    to be a MAS with inputs and outputs deleted, which MAS requires, so it
            //    was never a valid MAS file. Load MAS reads both.
            // clean() drops null / empty values: MAS has no null for an absent optional.
            const kind = this.includeInputs ? 'Mas' : 'Magnetic';
            const doc = clean(deepCopy(this.includeInputs ? this.mas : this.mas.magnetic));
            try {
                assertValidMas(kind, doc, 'MAS export');
            } catch (e) {
                this.exportError = e.message;
                // eslint-disable-next-line no-console
                console.error(e);
                return;
            }

            download(JSON.stringify(doc, null, 4), this.mas.magnetic.manufacturerInfo.reference + ".json", "text/plain");
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
        <p v-if="exportError" :data-cy="dataTestLabel + '-export-error'" class="text-danger small mt-2 mb-0">
            This design is not a valid MAS document, so it was not downloaded: {{ exportError }}
        </p>
    </div>
</template>

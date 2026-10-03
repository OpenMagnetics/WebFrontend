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
        fileName() {
            // A catalogue part is saved under its reference. A design changed away from
            // the catalogue part has no manufacturerInfo (the core selectors clear it),
            // so it is saved under its core's name (user report #186: the download
            // threw on the null and nothing happened).
            const reference = this.mas.magnetic.manufacturerInfo?.reference;
            const name = reference ?? this.mas.magnetic.core?.name;
            if (typeof name !== 'string' || name.trim() === '') {
                throw new Error('this design has neither a manufacturer reference nor a core name to save it under');
            }
            return `${name}.json`;
        },
        onClick() {
            this.exportError = '';
            // Every download is a valid document of its schema (ABT #1388):
            //  - "with excitations and results": a full MAS (inputs + magnetic + outputs);
            //  - "only with magnetic": a MAS Magnetic document (magnetic.json). It used
            //    to be a MAS with inputs and outputs deleted, which MAS requires, so it
            //    was never a valid MAS file. Load MAS reads both.
            // clean() drops null / empty values: MAS has no null for an absent optional.
            // Any failure is shown under the button: a click that silently does nothing
            // reads as a broken app.
            try {
                const kind = this.includeInputs ? 'Mas' : 'Magnetic';
                const doc = clean(deepCopy(this.includeInputs ? this.mas : this.mas.magnetic));
                assertValidMas(kind, doc, 'MAS export');
                download(JSON.stringify(doc, null, 4), this.fileName(), "text/plain");
            } catch (e) {
                this.exportError = e.message;
                // eslint-disable-next-line no-console
                console.error(e);
                return;
            }
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
            The MAS file was not downloaded: {{ exportError }}
        </p>
    </div>
</template>

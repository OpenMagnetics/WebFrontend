<script setup>
import * as downloadjs from 'downloadjs'
import { clean } from '/src/assets/js/utils.js'

</script>
<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        core: {
            type: Object,
            required: true,
        },
        fullCoreModel: {
            type: Boolean,
            default: true,
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
        onClick(event) {
            var url;
            var data;
            var coreName;
            if (!this.fullCoreModel) {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_shape_stp'
                data = this.core['functionalDescription']['shape'];
            }
            else {
                url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_3d_model_stp'
                data = this.core;
            }

            if (this.core.name != null) {
                coreName = this.core.name;
            }
            else {
                coreName = "Custom core"; 
            }
            data = clean(data);

            this.$axios.post(url, data)
            .then(response => {
                downloadjs.default(response.data, coreName + ".stp", "text/plain");
                this.$emit("export", coreName + ".stp")
                this.exported = true
                setTimeout(() => this.exported = false, 2000);
            })
            .catch(error => {
                console.error(error)
            });

        },
    }
}
</script>

<template>
    <div class="container">
        <button :disabled="exported" :data-cy="dataTestLabel + '-download-STP-File-button'" class="btn" :class="classProp" @click="onClick"> Download STP model </button>
    </div>
</template>
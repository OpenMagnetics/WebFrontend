<script setup>
import { clean, download, base64ToArrayBuffer } from '/WebSharedComponents/assets/js/utils.js'

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
                download(base64ToArrayBuffer(response.data), coreName + ".stp", "binary/octet-stream; charset=utf-8");
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
        <button
            :style="$styleStore.magneticBuilder.main"
            :disabled="exported"
            :data-cy="dataTestLabel + '-download-button'"
            class="btn p-2"
            :class="classProp"
            @click="onClick"
        >
            Download STP model
        </button>
    </div>
</template>
<script setup>
import { clean, download } from '/WebSharedComponents/assets/js/utils.js'

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
            var coreName;
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_gapping_technical_drawing'
            var data = this.core;

            if (this.core.name != null) {
                coreName = this.core.name;
            }
            else {
                coreName = "Custom core"; 
            }

            data = clean(data);

            this.$axios.post(url, data)
            .then(response => {
                download(response.data.front_view, coreName + ".svg", "text/plain");
                this.$emit("export", coreName + ".svg")
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
            Download Technical Drawing
        </button>
    </div>
</template>
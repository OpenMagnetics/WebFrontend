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
        mas: {
            type: Object,
            required: true,
        },
        includeHField: {
            type: Boolean,
            default: false,
        },
        includeFringing: {
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
        onClick(event) {
            if (this.includeHField) {

                const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core_and_fields'

                this.$axios.post(url, {magnetic: this.mas.magnetic, operatingPoint: this.mas.inputs.operatingPoints[0], includeFringing: this.includeFringing})
                .then(response => {
                    download(response.data, this.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section_And_H_Field.svg", "image/svg+xml");
                    this.magneticSectionAndFieldPlotExported = true
                    setTimeout(() => this.magneticSectionAndFieldPlotExported = false, 2000);
                })
                .catch(error => {
                    console.error("Error plotting magnetic section")
                    console.error(error)
                });
            }
            else {
                const url = import.meta.env.VITE_API_ENDPOINT + '/plot_core'

                this.$axios.post(url, {magnetic: this.mas.magnetic, operatingPoint: this.mas.inputs.operatingPoints[0]})
                .then(response => {
                    download(response.data, this.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section.svg", "image/svg+xml");
                    this.exported = true
                    setTimeout(() => this.exported = false, 2000);
                })
                .catch(error => {
                    console.error("Error plotting magnetic section")
                    console.error(error)
                });
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
            {{includeHField? includeFringing? 'Download Winding 2D Section with H field' : 'Download Winding 2D Section with H field but no fringing' : 'Download Winding 2D Section'}}
        </button>
    </div>
</template>
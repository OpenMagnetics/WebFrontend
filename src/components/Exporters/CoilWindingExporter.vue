<script setup>
import { clean, download } from 'WebSharedComponents/assets/js/utils.js'
import { waitForMkf, updateEngineSettings } from 'WebSharedComponents/assets/js/mkfRuntime'

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
        async onClick(event) {
            try {
                const mkf = await waitForMkf();
                await mkf.ready;
                if (this.includeHField) {
                    // The plot runs inside the settings queue with the fringing flag it
                    // needs, and the flag is restored before any other settings writer runs.
                    let previousFringing;
                    const svg = await updateEngineSettings(mkf, (settings) => {
                        previousFringing = settings.painterIncludeFringing;
                        settings.painterIncludeFringing = this.includeFringing;
                    }, async (settings) => {
                        try {
                            return await mkf.plot_magnetic_field(
                                JSON.stringify(this.mas.magnetic),
                                JSON.stringify(this.mas.inputs.operatingPoints[0])
                            );
                        } finally {
                            settings.painterIncludeFringing = previousFringing;
                            await mkf.set_settings(JSON.stringify(settings));
                        }
                    });
                    if (typeof svg === 'string' && svg.startsWith('Exception')) throw new Error(svg);
                    download(svg, this.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section_And_H_Field.svg", "image/svg+xml");
                    this.exported = true;
                    setTimeout(() => this.exported = false, 2000);
                } else {
                    const svg = await mkf.plot_turns(JSON.stringify(this.mas.magnetic));
                    if (typeof svg === 'string' && svg.startsWith('Exception')) throw new Error(svg);
                    download(svg, this.mas.magnetic.manufacturerInfo.reference + "_Magnetic_Section.svg", "image/svg+xml");
                    this.exported = true;
                    setTimeout(() => this.exported = false, 2000);
                }
            } catch (error) {
                console.error("Error plotting magnetic section");
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
            {{includeHField? includeFringing? 'Download Winding 2D Section with H field' : 'Download Winding 2D Section with H field but no fringing' : 'Download Winding 2D Section'}}
        </button>
    </div>
</template>
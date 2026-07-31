<script setup>
import { download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { initMvbWorker, buildMagneticSTEP } from 'WebSharedComponents/assets/js/mvbRuntime.js'
</script>
<script>

export default {
    props: {
        dataTestLabel: { type: String, default: '' },
        core: { type: Object, required: true },
        coil: { type: Object, default: null },
        fullCoreModel: { type: Boolean, default: true },
        classProp: { type: String, default: 'btn-primary m-0 p-0' },
    },
    data() {
        return { exported: false, exporting: false };
    },
    methods: {
        async onClick() {
            if (this.exporting) return;
            const coreName = this.core.name ?? 'Custom core';
            try {
                this.exporting = true;
                await initMvbWorker();

                const coreAux = deepCopy(this.core);
                coreAux.geometricalDescription = null;
                coreAux.processedDescription = null;
                if (coreAux.functionalDescription?.shape?.familySubtype != null) {
                    coreAux.functionalDescription.shape.familySubtype =
                        String(coreAux.functionalDescription.shape.familySubtype);
                }
                // MVB's drawMagnetic parses a full MAS Magnetic — a coil-less
                // {core} payload dies inside the WASM with bad_optional_access
                // (no core-only STEP draw exists, unlike STL's buildCoreSTL).
                if (this.coil == null) {
                    throw new Error('[CoreSTPExporter] STEP export needs the coil: pass the wound magnetic\'s coil prop (MVB has no core-only STEP draw)');
                }
                const magnetic = { core: coreAux, coil: deepCopy(this.coil) };

                const buf = await buildMagneticSTEP(magnetic, {
                    includeBobbin: this.fullCoreModel,
                });

                download(buf, coreName + '.stp', 'binary/octet-stream; charset=utf-8');
                this.$emit('export', coreName + '.stp');
                this.exported = true;
                setTimeout(() => this.exported = false, 2000);
            } catch (error) {
                console.error('[CoreSTPExporter]', error);
            } finally {
                this.exporting = false;
            }
        },
    },
}
</script>

<template>
    <div class="container">
        <button
            :style="$styleStore.magneticBuilder.main"
            :disabled="exported || exporting"
            :data-cy="dataTestLabel + '-download-button'"
            class="btn p-2"
            :class="classProp"
            @click="onClick"
        >
            {{ exporting ? 'Building…' : 'Download STP model' }}
        </button>
    </div>
</template>

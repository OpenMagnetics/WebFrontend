<script setup>
import { download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { initMvbWorker, buildCoreSTL, buildMagneticSTL } from 'WebSharedComponents/assets/js/mvbRuntime.js'
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
                const magnetic = { core: coreAux };
                if (this.fullCoreModel && this.coil) {
                    magnetic.coil = deepCopy(this.coil);
                }
                const stlOpts = { tolMm: 0.1, angTol: 0.2, binary: true };

                let buf;
                if (this.fullCoreModel && this.coil) {
                    const turnCount = magnetic.coil?.turnsDescription?.length ?? magnetic.coil?.turns_description?.length ?? 0;
                    // Full-magnetic STL with many turns generates geometry that
                    // crashes the WASM renderer (OOM in OCCT meshing / boolean
                    // ops). Skip to core-only when the coil is very complex.
                    if (turnCount > 60) {
                        console.warn('[CoreStlExporter] coil has', turnCount, 'turns; using core-only STL to avoid renderer crash');
                        buf = await buildCoreSTL(magnetic, stlOpts);
                    } else {
                        try {
                            buf = await buildMagneticSTL(magnetic, stlOpts);
                        } catch (e) {
                            console.warn('[CoreStlExporter] full-magnetic STL failed, falling back to core-only:', e);
                            buf = await buildCoreSTL(magnetic, stlOpts);
                        }
                    }
                } else {
                    buf = await buildCoreSTL(magnetic, stlOpts);
                }

                download(buf, coreName + '.stl', 'binary/octet-stream; charset=utf-8');
                this.$emit('export', coreName + '.stl');
                this.exported = true;
                setTimeout(() => this.exported = false, 2000);
            } catch (error) {
                console.error('[CoreStlExporter]', error);
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
            {{ exporting ? 'Building…' : 'Download STL model' }}
        </button>
    </div>
</template>

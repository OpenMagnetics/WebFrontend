<script setup>
import { download, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { initMvbWorker, buildCoreSTL, buildMagneticSTL } from '/WebSharedComponents/assets/js/mvbRuntime.js'
</script>
<script>

export default {
    props: {
        dataTestLabel: { type: String, default: '' },
        core: { type: Object, required: true },
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
                const stlOpts = { tolMm: 0.1, angTol: 0.2, binary: true };

                const buf = this.fullCoreModel
                    ? await buildMagneticSTL(magnetic, stlOpts)
                    : await buildCoreSTL(magnetic, stlOpts);

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

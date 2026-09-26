<script setup>
import { download, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { initMvbWorker, buildMagneticFemSTEP } from 'WebSharedComponents/assets/js/mvbRuntime.js'
</script>
<script>

// The 3D a mesher takes (gmsh, OMFEM), not the one the viewer draws: the real winding as fused,
// conformal copper bodies at their conducting footprint, core and wire faceted together at 12
// segments, named solids. The same product as `mvbpp_step_generator --real --fem --segments 12`.
// It is slow (tens of seconds to minutes on a large winding), so the button says so while it runs.
export default {
    props: {
        dataTestLabel: { type: String, default: '' },
        magnetic: { type: Object, required: true },
        classProp: { type: String, default: 'btn-primary m-0 p-0' },
    },
    data() {
        return { exported: false, exporting: false, exportError: '' };
    },
    computed: {
        wound() {
            return (this.magnetic?.coil?.turnsDescription?.length ?? 0) > 0;
        },
    },
    methods: {
        async onClick() {
            if (this.exporting) return;
            this.exportError = '';
            const name = this.magnetic?.manufacturerInfo?.reference ?? this.magnetic?.core?.name ?? 'magnetic';
            try {
                this.exporting = true;
                await initMvbWorker();
                const magnetic = deepCopy(this.magnetic);
                magnetic.core.geometricalDescription = null;
                const buf = await buildMagneticFemSTEP(magnetic);
                download(buf, name + '_fem.step', 'binary/octet-stream; charset=utf-8');
                this.exported = true;
                setTimeout(() => this.exported = false, 2000);
            } catch (error) {
                this.exportError = error?.mvbMessage ?? error?.message ?? String(error);
                console.error('[MagneticFemStepExporter]', error);
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
            :disabled="exported || exporting || !wound"
            :data-cy="dataTestLabel + '-download-button'"
            :title="wound ? 'Real winding, fused bodies, no coating, 12 segments: the geometry gmsh and OMFEM mesh' : 'Wind the coil first'"
            class="btn p-2"
            :class="classProp"
            @click="onClick"
        >
            {{ exporting ? 'Building FEM model… (slow)' : 'Download FEM STEP (gmsh / OMFEM)' }}
        </button>
        <p v-if="exportError" :data-cy="dataTestLabel + '-export-error'" class="text-danger small mt-2 mb-0">
            The FEM model could not be built: {{ exportError }}
        </p>
    </div>
</template>

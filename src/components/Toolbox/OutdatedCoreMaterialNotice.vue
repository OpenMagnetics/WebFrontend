<script setup>
import { useMasStore } from '../../stores/mas'
import { useCoreMaterialNoticeStore } from '../../stores/coreMaterialNotice'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { describeFailure } from 'WebSharedComponents/assets/js/noticeText.js'
</script>

<script>
// The loaded design's core material is an older copy than the library's and gives other core
// losses (services/coreMaterialFreshness.js). Says so with MKF's numbers for both, and lets the
// user switch to the library's copy or keep the file's (Alf, 2026-10-14: warn, keep the file's copy;
// 2026-10-16: keep the rule, and offer one option that updates to the latest library data).
// When MKF refuses the file's copy outright (one of MATERIAL_REFUSAL_CODES in
// services/coreMaterialFreshness.js), the notice gives MKF's reason and offers the same update (2026-10-26). MKF's error code and full text are tooltips.
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
            masStore: useMasStore(),
            noticeStore: useCoreMaterialNoticeStore(),
        };
    },
    computed: {
        finding() {
            return this.noticeStore.outdatedCoreMaterial;
        },
        refusal() {
            return this.finding?.invalid == null ? null : describeFailure(this.finding.invalid);
        },
    },
    methods: {
        describeFailure,
        // The refusal itself is said once, above; a point that fails for another reason says which.
        describe(side) {
            if (side.error == null) return `${side.losses.toPrecision(3)} W`;
            if (side.error === this.finding.invalid) return 'not computable';
            return `not computable (${describeFailure(side.error).message.replace(/[.\s]+$/, '')})`;
        },
        useLibraryMaterial() {
            if (this.finding.libraryMaterial == null) {
                throw new Error(`The library has no core material '${this.finding.name}' to replace the design's copy with: ${this.finding.libraryError}`);
            }
            this.masStore.mas.magnetic.core.functionalDescription.material = deepCopy(this.finding.libraryMaterial);
            this.noticeStore.clear();
            this.$stateStore.resimulate();
        },
        keepFileMaterial() {
            this.noticeStore.clear();
        },
    },
}
</script>

<template>
    <div
        v-if="finding != null"
        class="alert alert-warning py-2 px-3 mb-2"
        role="alert"
        :data-cy="dataTestLabel + '-OutdatedCoreMaterial'"
    >
        <div
            v-if="finding.invalid != null"
            :data-cy="dataTestLabel + '-OutdatedCoreMaterial-invalid'"
        >
            <i class="pi pi-exclamation-triangle me-2"></i>
            This design's own copy of the core material <strong>{{finding.name}}</strong> has data the engine refuses, so the design cannot be computed with it:
            <span
                v-tooltip.bottom="refusal.detail ?? refusal.message"
                :data-code="refusal.code"
                :data-cy="dataTestLabel + '-OutdatedCoreMaterial-reason'"
            >{{refusal.message.replace(/[.\s]+$/, '') + '. '}}</span>
            <template v-if="finding.libraryMaterial != null">The library's copy of {{finding.name}} can replace it; the file's copy is kept until you choose.</template>
            <template v-else>The library has no core material {{finding.name}} to replace it with ({{describeFailure(finding.libraryError).message.replace(/[.\s]+$/, '')}}); choose another material in the builder.</template>
        </div>
        <div v-else>
            <i class="pi pi-exclamation-triangle me-2"></i>
            This design carries its own copy of the core material <strong>{{finding.name}}</strong>,
            older than the library's, and the two give different core losses:
        </div>
        <ul v-if="finding.operatingPoints.length > 0" class="mb-2 ps-4">
            <li v-for="point in finding.operatingPoints" :key="point.name">
                {{point.name}}: {{describe(point.fromFile)}} with the file's copy, {{describe(point.fromLibrary)}} with the library's.
            </li>
        </ul>
        <button
            v-if="finding.libraryMaterial != null"
            type="button"
            class="btn btn-sm btn-primary me-2"
            :data-cy="dataTestLabel + '-OutdatedCoreMaterial-useLibrary'"
            @click="useLibraryMaterial"
        >
            Update {{finding.name}} to the latest library data
        </button>
        <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :data-cy="dataTestLabel + '-OutdatedCoreMaterial-keepFile'"
            @click="keepFileMaterial"
        >
            Keep the file's copy
        </button>
    </div>
</template>

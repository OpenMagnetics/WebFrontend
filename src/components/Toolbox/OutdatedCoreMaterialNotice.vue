<script setup>
import { useMasStore } from '../../stores/mas'
import { useCoreMaterialNoticeStore } from '../../stores/coreMaterialNotice'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
</script>

<script>
// The loaded design's core material is an older copy than the library's and gives other core
// losses (services/coreMaterialFreshness.js). Says so with MKF's numbers for both, and lets the
// user switch to the library's copy or keep the file's (Alf, 2026-10-14: warn, keep the file's copy;
// 2026-10-16: keep the rule, and offer one option that updates to the latest library data).
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
    },
    methods: {
        describe(side) {
            return side.error != null ? `not computable (${side.error})` : `${side.losses.toPrecision(3)} W`;
        },
        useLibraryMaterial() {
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
        <div>
            <i class="pi pi-exclamation-triangle me-2"></i>
            This design carries its own copy of the core material <strong>{{finding.name}}</strong>,
            older than the library's, and the two give different core losses:
        </div>
        <ul class="mb-2 ps-4">
            <li v-for="point in finding.operatingPoints" :key="point.name">
                {{point.name}}: {{describe(point.fromFile)}} with the file's copy, {{describe(point.fromLibrary)}} with the library's.
            </li>
        </ul>
        <button
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

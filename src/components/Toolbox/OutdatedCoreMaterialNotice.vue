<script setup>
import { useMasStore } from '../../stores/mas'
import { useCoreMaterialNoticeStore } from '../../stores/coreMaterialNotice'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { describeFailure } from 'WebSharedComponents/assets/js/noticeText.js'
import { invalidLossDataTemperatures } from '../../services/coreMaterialFreshness.js'
</script>

<script>
// The loaded design's core material is a copy MKF finds fault with, or one that gives other core
// losses than the library's (services/coreMaterialFreshness.js, MKF's check_core_material and
// compare_core_material_volumetric_losses). Says so with MKF's numbers, and lets the user switch to
// the library's copy or keep the file's (Alf, 2026-10-14: warn, keep the file's copy; 2026-10-16:
// one option that updates to the latest library data).
// - A copy MKF refuses (MATERIAL_INVALID_PROPERTY) is named with MKF's reason; nothing is computed
//   with it until it is replaced (2026-10-26).
// - A copy whose loss data MKF cannot use over part of its temperatures (INVALID_LOSS_DATA) differs
//   from the library's; those temperatures are also a warning in the Engine log (2026-10-28).
// MKF's error code and full text are tooltips.
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
        invalidTemperatures() {
            return this.finding == null ? '' : invalidLossDataTemperatures(this.finding.invalidLossData);
        },
        // The point where the copies differ most, as MKF priced it.
        largest() {
            return this.finding?.comparison?.largest ?? null;
        },
        hasDetails() {
            const comparison = this.finding?.comparison;
            return this.finding.invalidLossData.length > 0
                || (this.largest != null && Math.abs(this.largest.relativeDifference) > 0)
                || (comparison != null && (comparison.refusedByFile > 0 || comparison.refusedByLibrary > 0));
        },
    },
    methods: {
        describeFailure,
        volumetricLosses(value) {
            return `${value.toPrecision(3)} W/m³`;
        },
        condition(point) {
            return `${Number((point.frequency / 1000).toPrecision(3))} kHz, ${Number((point.magneticFluxDensityPeak * 1000).toPrecision(3))} mT peak, ${Number(point.temperature.toPrecision(3))} °C`;
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
                v-tooltip.bottom="finding.invalidDetail ?? refusal.detail ?? refusal.message"
                :data-code="refusal.code"
                :data-cy="dataTestLabel + '-OutdatedCoreMaterial-reason'"
            >{{refusal.message.replace(/[.\s]+$/, '') + '. '}}</span>
            <template v-if="finding.libraryMaterial != null">The library's copy of {{finding.name}} can replace it; the file's copy is kept until you choose.</template>
            <template v-else>The library has no core material {{finding.name}} to replace it with ({{describeFailure(finding.libraryError).message.replace(/[.\s]+$/, '')}}); choose another material in the builder.</template>
        </div>
        <div v-else :data-cy="dataTestLabel + '-OutdatedCoreMaterial-differs'">
            <i class="pi pi-exclamation-triangle me-2"></i>
            This design carries its own copy of the core material <strong>{{finding.name}}</strong>, which differs from the library's.
        </div>
        <ul v-if="hasDetails" class="mb-2 ps-4">
            <li
                v-if="finding.invalidLossData.length > 0"
                v-tooltip.bottom="finding.invalidLossData.map((problem) => problem.message).join(' ')"
                data-code="INVALID_LOSS_DATA"
                :data-cy="dataTestLabel + '-OutdatedCoreMaterial-invalidLossData'"
            >
                The engine cannot use the file's copy's core-loss data{{invalidTemperatures === '' ? '' : ' ' + invalidTemperatures}}, so core losses at those temperatures cannot be computed with it.
            </li>
            <li v-if="largest != null && Math.abs(largest.relativeDifference) > 0" :data-cy="dataTestLabel + '-OutdatedCoreMaterial-largestDifference'">
                At {{condition(largest)}}: {{volumetricLosses(largest.fromFile)}} with the file's copy, {{volumetricLosses(largest.fromLibrary)}} with the library's.
            </li>
            <li
                v-if="finding.comparison != null && finding.comparison.refusedByFile > 0"
                v-tooltip.bottom="finding.comparison.refusedByFileReason"
                :data-cy="dataTestLabel + '-OutdatedCoreMaterial-refusedByFile'"
            >
                The file's copy gives no core losses at {{finding.comparison.refusedByFile}} of the {{finding.comparison.pointCount}} points of the library's data they were compared at.
            </li>
            <li v-if="finding.comparison != null && finding.comparison.refusedByLibrary > 0" :data-cy="dataTestLabel + '-OutdatedCoreMaterial-refusedByLibrary'">
                The library's copy gives no core losses at {{finding.comparison.refusedByLibrary}} of the {{finding.comparison.pointCount}} points, where the file's copy does.
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

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { deepCopy } from 'WebSharedComponents/assets/js/utils.js'

export const useHistoryStore = defineStore("history", () => {
    const masHistory = ref([]);
    const historyPointer = ref(-1);
    let blockingRebounds = false;
    let blockingAdditions = false;
    let reboundsTimer = null;
    let additionsTimer = null;

    function blockAdditions(durationMs) {
        blockingAdditions = true;
        if (additionsTimer) clearTimeout(additionsTimer);
        if (durationMs != null && durationMs > 0) {
            additionsTimer = setTimeout(() => {
                blockingAdditions = false;
                additionsTimer = null;
            }, durationMs);
        }
    }

    function unblockAdditions() {
        blockingAdditions = false;
        if (additionsTimer) {
            clearTimeout(additionsTimer);
            additionsTimer = null;
        }
    }

    function addToHistory(mas) {
        if (blockingRebounds) {
            return
        }
        if (blockingAdditions) {
            return
        }
        // A state identical to the current entry is a rebound echo (e.g. the
        // mas watcher firing after back()/forward() restored it), not an edit.
        // Comparing content makes the suppression deterministic instead of
        // relying solely on the 100ms timer window below.
        if (this.historyPointer >= 0 &&
            JSON.stringify(this.masHistory[this.historyPointer]) === JSON.stringify(mas)) {
            return
        }
        // Discard any redo entries beyond the current pointer
        if (this.historyPointer < this.masHistory.length - 1) {
            this.masHistory.length = this.historyPointer + 1;
        }
        this.masHistory.push(deepCopy(mas));
        this.historyPointer = this.masHistory.length - 1;
        blockingRebounds = true;
        if (reboundsTimer) clearTimeout(reboundsTimer);
        reboundsTimer = setTimeout(() => {
            blockingRebounds = false;
            reboundsTimer = null;
        }, 100);
    }

    function reset() {
        this.historyPointer = -1;
        this.masHistory = [];
        blockingRebounds = false;
        blockingAdditions = false;
        if (reboundsTimer) clearTimeout(reboundsTimer);
        if (additionsTimer) clearTimeout(additionsTimer);
        reboundsTimer = null;
        additionsTimer = null;
    }

    function back() {
        if (this.historyPointer > 0) {
            this.historyPointer -= 1;
        }
        blockingRebounds = true;
        if (reboundsTimer) clearTimeout(reboundsTimer);
        reboundsTimer = setTimeout(() => {
            blockingRebounds = false;
            reboundsTimer = null;
        }, 100);
        return deepCopy(this.masHistory[this.historyPointer]);
    }

    function forward() {
        if (this.historyPointer < this.masHistory.length - 1) {
            this.historyPointer += 1;
        }
        blockingRebounds = true;
        if (reboundsTimer) clearTimeout(reboundsTimer);
        reboundsTimer = setTimeout(() => {
            blockingRebounds = false;
            reboundsTimer = null;
        }, 100);
        return deepCopy(this.masHistory[this.historyPointer]);
    }

    function isBackPossible() {
        return this.historyPointer > 0;
    }

    function isForwardPossible() {
        return this.historyPointer < this.masHistory.length - 1;
    }

    function getCurrent() {
        if (this.masHistory.length == 0) {
            return null;
        }
        else {
            return deepCopy(this.masHistory[this.historyPointer]);
        }
    }

    function historyPointerUpdated() {
    }

    return {
        masHistory,
        historyPointer,
        addToHistory,
        reset,
        back,
        forward,
        isBackPossible,
        isForwardPossible,
        getCurrent,
        historyPointerUpdated,
        blockAdditions,
        unblockAdditions,
    }
},
{
    persist: false,
})

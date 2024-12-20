import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import { deepCopy  } from '/WebSharedComponents/assets/js/utils.js'

export const useHistoryStore = defineStore("history", () => {
    var masHistory = ref([]);
    var historyPointer = ref(-1);
    var blockingRebounds = false;
    var blockingAdditions = false;

    function blockAdditions() {
        blockingAdditions = true;
    }

    function unblockAdditions() {
        blockingAdditions = false;
    }

    function addToHistory(mas) {
        if (blockingRebounds) {
            console.log("blockingRebounds");
            return
        }
        if (blockingAdditions) {
            console.log("blockingAdditions");
            return
        }
        for (var i = this.masHistory.length - 1; i >= 0; i--) {
            if (i > this.historyPointer) {
                this.masHistory.pop();
            }
        }
        this.masHistory.push(deepCopy(mas));
        this.historyPointer = this.masHistory.length - 1;
        blockingRebounds = true;
        setTimeout(() => blockingRebounds = false, 100);
    }

    function reset() {
        this.historyPointer = -1;
        this.masHistory = [];
    }

    function back() {
        console.log("back");
        if (this.historyPointer > 0) {
            this.historyPointer -= 1;
        }
        blockingRebounds = true;
        setTimeout(() => blockingRebounds = false, 100);
        return deepCopy(this.masHistory[this.historyPointer]);
    }

    function forward() {
        if (this.historyPointer < this.masHistory.length - 1) {
            this.historyPointer += 1;
        }
        blockingRebounds = true;
        setTimeout(() => blockingRebounds = false, 100);
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

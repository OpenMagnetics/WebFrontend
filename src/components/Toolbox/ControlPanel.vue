<script setup>
import { useMasStore } from '/src/stores/mas'
import { useHistoryStore } from '/src/stores/history'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        return {
            masStore,
            historyStore,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        undo() {
            console.log("undo");
            const newMas = this.historyStore.back();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        redo() {
            console.log("redo");
            const newMas = this.historyStore.forward();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        load() {
            console.log("load");
        },
        export() {
            console.log("export");
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row ">
            <button :disabled="!historyStore.isBackPossible()" class="btn btn-primary offset-1 col-1" @click="undo">
                <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
            <button :disabled="!historyStore.isForwardPossible()" class="btn btn-primary offset-1 col-1" @click="redo">
                <i class="fa-solid fa-arrow-rotate-right"></i>
            </button>
            <button class="btn btn-primary offset-1 col-3" @click="load">
                {{'Load MAS'}}
            </button>
            <button class="btn btn-primary offset-1 col-3" @click="export">
                {{'Export MAS'}}
            </button>
        </div>
    </div>
</template>

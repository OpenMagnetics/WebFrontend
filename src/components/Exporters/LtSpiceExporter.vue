<script setup>
import { clean, download } from '/WebSharedComponents/assets/js/utils.js'

</script>
<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        magnetic: {
            type: Object,
            required: true,
        },
        isSymbol: {
            type: Boolean,
            default: false,
        },
        classProp: {
            type: String,
            default: "btn-primary m-0 p-0",
        },
    },
    data() {
        const exported = false;

        return {
            exported,
        }
    },
    computed: {
    },
    methods: {
        onClick() {
            this.exported = true
            if (this.isSymbol) {
                setTimeout(() => this.createLtSpiceSymbol(), 20);
            }
            else {
                setTimeout(() => this.createLtSpiceSubcircuit(), 20);
            }
            setTimeout(() => this.exported = false, 2000);
        },
        createLtSpiceSubcircuit() {
            this.$mkf.ready.then(_ => {
                var subcircuit = this.$mkf.export_magnetic_as_subcircuit(JSON.stringify(this.magnetic), "LtSpice", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
                download(blob, this.magnetic.manufacturerInfo.reference + ".cir", "text/csv; charset=utf-8");

            }).catch(error => {
                console.error(error);
            });
        },
        createLtSpiceSymbol() {
            this.$mkf.ready.then(_ => {
                var subcircuit = this.$mkf.export_magnetic_as_symbol(JSON.stringify(this.magnetic), "LtSpice", "");
                var blob = new Blob([subcircuit], {
                    type: 'text/csv; charset=utf-8'
                });
                download(blob, this.magnetic.manufacturerInfo.reference + ".asy", "text/csv; charset=utf-8");

            }).catch(error => {
                console.error(error);
            });
        },
    }
}
</script>

<template>
    <div class="container">
        <button :disabled="exported" :data-cy="dataTestLabel + '-download-button'" class="btn" :class="classProp" @click="onClick"> {{isSymbol? 'Download magnetic symbol for LtSpice' : 'Download magnetic subcircuit for LtSpice'}} </button>
    </div>
</template>
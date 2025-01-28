<script setup>
import { useCatalogStore } from '/src/stores/catalog'
import { useMasStore } from '/src/stores/mas'
import { toDashCase, toPascalCase, toTitleCase } from '/WebSharedComponents/assets/js/utils.js'
import AdviserSettings from '/src/components/Toolbox/Settings/AdviserSettings.vue'
import CatalogSettings from '/src/components/Toolbox/Settings/CatalogSettings.vue'

</script>

<script>
export default {
    emits: ["editMagnetic", "viewMagnetic"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        showAdviserSettingsOption: {
            type: Boolean,
            default: false
        },
        showCatalogAdviserSettingsOption: {
            type: Boolean,
            default: false
        },
        showEditOption: {
            type: Boolean,
            default: false
        },
        showOrderOption: {
            type: Boolean,
            default: false
        },
        showConfirmOption: {
            type: Boolean,
            default: false
        },
    },
    data() {
        const catalogStore = useCatalogStore();
        const masStore = useMasStore();
        return {
            catalogStore,
            masStore,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    width: '150px',
                    "text-align": "end",
                },
            }
        },
    },
    watch: {
    },
    mounted () {
    },
    methods: {
        onAdviserSettingsUpdated() {
        },
        onCatalogSettingsUpdated() {
            setTimeout(() => {this.$router.go();}, 100);
            
        },
    }
}
</script>

<template>
    <div class="pb-2 p-0 container" v-tooltip="styleTooltip">
        <AdviserSettings 
            v-if="showAdviserSettingsOption"
            :modalName="'AdviserSettingsModal'"
            @onSettingsUpdated="onAdviserSettingsUpdated"
        />
        <CatalogSettings 
            v-if="showCatalogAdviserSettingsOption"
            :modalName="'CatalogAdviserSettingsModal'"
            @onSettingsUpdated="onCatalogSettingsUpdated"
        />
        <div class="row px-3">
            <button
                v-if="showAdviserSettingsOption || showCatalogAdviserSettingsOption"  
                :data-cy="dataTestLabel + 'settings-modal-button'"
                class="btn btn-info mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                data-bs-toggle="modal"
                :data-bs-target="showAdviserSettingsOption? '#AdviserSettingsModal' : '#CatalogAdviserSettingsModal'"
            >Settings</button>
            <button
                v-if="showEditOption"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn btn-info mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('editMagnetic')"
            >Edit</button>
            <button
                v-if="showConfirmOption"  
                :data-cy="dataTestLabel + 'edit-from-viewer-button'"
                class="btn btn-success mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="$emit('viewMagnetic')"
            >Confirm</button>
            <button
                v-if="showOrderOption"  
                :data-cy="dataTestLabel + '-order-button'"
                class="btn btn-success mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                @click="catalogStore.orderSample(masStore.mas)">Order a sample</button>
        </div>
    </div>
</template>


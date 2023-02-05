<script setup >
import UserInventory from '/src/components/User/UserInventory.vue'

</script>

<script>
export default {
}


</script>

<template>
    <div class="modal fade" id="loadOperationPointModal" tabindex="-1" aria-labelledby="loadOperationPointModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p class="modal-title fs-5" id="loadOperationPointModalLabel">Load a predefined operation point</p>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="loadOperationPointModalClose"></button>
                </div>
                <UserInventory :specificElement="'operationPoints'" :showTitle="false" :showMenu="false" :showLegend="false" @onLoadOperationPoint="$emit('onLoadOperationPoint')"/>
            </div>
        </div>
    </div>
</template>

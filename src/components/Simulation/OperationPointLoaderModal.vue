<script setup >
import UserInventory from '/src/components/User/UserInventory.vue'

</script>

<script>
export default {
}


</script>

<template>
    <div class="modal fade" id="loadOperationPointModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="modalLabel">Load a predefined operation point</h1>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <UserInventory :specificElement="'operationPoints'" :showTitle="false" :showMenu="false" :showLegend="false" @onLoadOperationPoint="$emit('onLoadOperationPoint')"/>
            </div>
        </div>
    </div>
</template>

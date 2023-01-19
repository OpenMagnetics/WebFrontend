<script setup >
import { useUserStore } from '/src/stores/user'
import { useDataCacheStore } from '/src/stores/dataCache'
import axios from "axios";
import { Modal } from "bootstrap";

</script>

<script>

export default {
    data() {
        const userStore = useUserStore()
        const dataCacheStore = useDataCacheStore()
        const currentNotification = {}
        return {
            currentNotification,
            userStore,
            dataCacheStore,
        }
    },
    methods: {
    },
    computed: {
    },
    mounted() {
        const notifications = this.dataCacheStore.notifications
        for (let i = 0; i < notifications.length; i++) {
            if (!(this.userStore.readNotifications.includes(notifications[i]["name"]))) {
                this.currentNotification = notifications[i]
                this.uniqueModal = new Modal(document.getElementById("notificationsModal"),{ keyboard: false });
                this.uniqueModal.show();
                this.$refs.notificationContent.innerHTML = this.currentNotification["content"]
                this.userStore.readNotifications.push(this.currentNotification["name"])
                break
            }
        }
    },
    created() {
    }
}
</script>


<template>
    <div class="modal fade" id="notificationsModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="modalLabel">{{currentNotification["name"]}}</h1>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body row mt-4">
                    <p ref="notificationContent" class="modal-title fs-5 col-12 text-center" >miweqda <br/> asdas</p>
                    <button class="btn btn-primary mx-auto d-block mt-5 offset-1 col-5" data-bs-dismiss="modal" >Understood</button>
                </div>
            </div>
        </div>
    </div>
</template>
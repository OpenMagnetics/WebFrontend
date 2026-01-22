<script setup >
import { Modal } from "bootstrap";
</script>

<script>

export default {
    data() {
        const currentNotification = {}
        return {
            currentNotification,
        }
    },
    created() {
        var host = window.location.hostname;
        if(host != "localhost"){
            const url = import.meta.env.VITE_API_ENDPOINT + '/get_notifications'
            this.$axios.post(url, {})
            .then(response => {
                const notifications = response.data['notifications']
                for (let i = 0; i < notifications.length; i++) {
                    if (!(this.$userStore.readNotifications.includes(notifications[i]["name"]))) {
                        this.currentNotification = notifications[i]
                        this.uniqueModal = new Modal(document.getElementById("notificationsModal"),{ keyboard: false });
                        this.uniqueModal.show();
                        this.$refs.notificationContent.innerHTML = this.currentNotification["content"]
                        this.$userStore.readNotifications.push(this.currentNotification["name"])
                        break
                    }
                }
            })
            .catch(error => {
                console.error("Error getting")
                console.error(error.data)
            });
        }
    }
}
</script>


<template>
    <div class="modal fade" id="notificationsModal" tabindex="-1" aria-labelledby="notificationsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p data-cy="NotificationsModal-notification-text" class="modal-title fs-5" id="notificationsModalLabel">{{currentNotification["name"]}}</p>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="notificationsModalClose"></button>
                </div>
                <div class="modal-body row mt-4">
                    <p ref="notificationContent" class="modal-title fs-5 text-center col-12" ></p>
                    <button data-cy="NotificationsModal-accept-button" class="btn btn-primary mx-auto d-block mt-5 offset-1 col-5" data-bs-dismiss="modal" >Understood</button>
                </div>
            </div>
        </div>
    </div>
</template>
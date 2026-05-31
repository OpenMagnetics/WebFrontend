<script setup>
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
</script>

<script>
export default {
    components: { Dialog, Button },
    data() {
        return {
            currentNotification: {},
            visible: false,
        }
    },
    created() {
        const host = window.location.hostname
        if (host === 'localhost') return
        const url = import.meta.env.VITE_API_ENDPOINT + '/get_notifications'
        this.$axios.post(url, {})
            .then(response => {
                const notifications = response.data['notifications']
                for (let i = 0; i < notifications.length; i++) {
                    if (!this.$userStore.readNotifications.includes(notifications[i]['name'])) {
                        this.currentNotification = notifications[i]
                        this.visible = true
                        this.$userStore.readNotifications.push(this.currentNotification['name'])
                        break
                    }
                }
            })
            .catch(error => {
                console.error('Error getting notifications', error?.data)
            })
    },
    watch: {
        visible(open) {
            if (open) {
                this.$nextTick(() => {
                    if (this.$refs.notificationContent) {
                        this.$refs.notificationContent.innerHTML = this.currentNotification['content']
                    }
                })
            }
        },
    },
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        :header="currentNotification['name']"
        :style="{ width: 'min(90vw, 720px)' }"
        :modal="true"
        :closable="true"
        :draggable="false">
        <div class="notifications-modal-body">
            <p ref="notificationContent" data-cy="NotificationsModal-notification-text" class="notifications-content"></p>
            <Button
                data-cy="NotificationsModal-accept-button"
                label="Understood"
                @click="visible = false"
                class="notifications-accept" />
        </div>
    </Dialog>
</template>

<style scoped>
.notifications-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding-top: 0.5rem;
}
.notifications-content {
    width: 100%;
    text-align: center;
    margin: 0;
}
.notifications-accept {
    min-width: 8rem;
    margin-top: 0.75rem;
}
</style>

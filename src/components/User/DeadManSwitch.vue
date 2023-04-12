<script setup>
</script>

<script>

export default {
    data() {
        return {
            isArmed: false,
        }
    },
    methods: {
        arm() {
            this.isArmed = true
            console.warn("Arming")
            setTimeout(() => this.trigger(), 20000);
        },
        trigger() {
            if (this.isArmed) {
                console.error("Resetting")
                this.$userStore.reset()
                this.$dataCacheStore.reset()
            }
        },
        disarm() {
            console.warn("Disarming")
            this.isArmed = false
        }
    },
    mounted() {
        console.warn("Mounted")
        this.$userStore.$onAction((action) => {
            if (action.name == "armDeadManSwitch") {
                this.arm()
            }
            if (action.name == "disarmDeadManSwitch") {
                this.disarm()
            }
        })
    }
}
</script>
<template>
</template>
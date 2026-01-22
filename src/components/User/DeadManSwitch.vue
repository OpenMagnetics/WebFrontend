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
            setTimeout(() => this.trigger(), 20000);
        },
        trigger() {
            if (this.isArmed) {
                this.$userStore.reset()
                // this.$dataCacheStore.reset()
            }
        },
        disarm() {
            this.isArmed = false
        }
    },
    mounted() {
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
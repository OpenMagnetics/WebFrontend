<script setup>
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
        const textsToAppear = [
            {
                text: "Welcome to OpenMagnetics design tool.",
                enabled: false,
                delay: 1000,
            },
            {
                text: "Since this is the first time you use it, allow me to explain how it works.",
                enabled: false,
                delay: 2000,
            },
            {
                text: "In this tool you don't need to specify if you want an inductor, a transformer, or a flyback. It will be defined by the requirements.",
                enabled: false,
                delay: 2000,
            },
            {
                text: "In the first step you will be asked for the requirements of your magnetic component. This usually implies the magnetizing inductance, the number of windings, and their turns ratio; but more things, like the insulation or the maximum dimensions can be added.",
                enabled: false,
                delay: 5000,
            },
            {
                text: "In the second step, you need to define the excitation of your component. This implies specifying the voltage and current of each of the ports (primary, secondary, etc.) of the device. You can do this by manually defining them, or by uploading a simulation from your favorite circuit simulator.",
                enabled: false,
                delay: 5000,
            },
            {
                text: "In the third step, you will be able to choose what you want to achieve with this specifications: getting a report of your specification, finding a COTS core, getting advise for designing a full magnetic, or even doing it yourself manually.",
                enabled: false,
                delay: 5000,
            },
            {
                text: "You can advance or move between the different step using the menu of the left. Press continue now to start your first design.",
                enabled: false,
                delay: 5000,
            }
        ]
        const currentText = 0;
        return {
            textsToAppear,
            currentText,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        this.enabledNext();
    },
    methods: {
        enabledNext() {
            if (this.currentText < this.textsToAppear.length) {
                setTimeout(() => {
                        this.textsToAppear[this.currentText].enabled = true;
                        this.currentText += 1;
                        this.enabledNext();
                }, this.textsToAppear[this.currentText].delay);
            }
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="offset-sm-0 offset-lg-1 col-lg-10 text-center" v-for="textToAppear, index in textsToAppear">
                <Transition>
                    <h3 v-if="textToAppear.enabled" class=my-2>{{textToAppear.text}}</h3>
                </Transition>
            </div>
        </div>
    </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

</style>
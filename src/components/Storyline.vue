<script setup>
import { toDashCase } from '/src/assets/js/utils.js'
</script>

<script>
export default {
    props: {
        activeVerticalIndex: {
            type: Number,
            required: true
        },
        storyline: {
            type: Array,
            required: true
        },
    },
    data() {
        return {
        }
    },
    computed: {
        shortenedLabels() {
            const shortenedLabels = []
            this.storyline.forEach((item, index) => {
                var label = item.title;
                if (window.innerWidth < 1200) {
                    var slice = 8
                    if (window.innerWidth < 1100)
                        slice = 7
                    if (window.innerWidth < 1000)
                        slice = 6
                    if (window.innerWidth < 900)
                        slice = 4
                    if (window.innerWidth < 700)
                        slice = 3
                    if (window.innerWidth < 600)
                        slice = 2
                    if (window.innerWidth < 500)
                        slice = 1
                    label = label.split(' ')
                        .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                        .join('')
                }
                shortenedLabels.push(label)
            })
            return shortenedLabels
        }
    },
    watch: { 
        activeVerticalIndex: function(newVal, oldVal) { // watch it
            console.log('activeVerticalIndex changed: ', newVal, ' | was: ', oldVal)
        }
    },
    mounted () {
    },
    methods: {
        btn_class(index) {
            var btn_class = "";
            if (index == 0 || index == this.storyline.length - 1) {
                btn_class += "rounded-4 "
            }
            else {
                btn_class += "rounded-0 "
            }
            if (index == this.activeVerticalIndex) {
                btn_class += "bg-primary text-dark"
            }
            else {
                btn_class += "bg-dark text-primary"
            }
            return btn_class
        }
    }
}
</script>

<template>
    <div class="py-2 p-0 m-0" role="group" aria-label="Storyline button group ">
        <div v-for="adventure, index in storyline" class=""> 
            <button :data-test-id="'storyline-' + toDashCase(adventure.title) + '-button'" v-resize-text="{ratio:1, minFontSize: '14px', maxFontSize: '100px', delay: 20}" class="border border-primary btn-outline-primary col-12 m-0 px-1 py-2" :class="btn_class(index)" disabled> 
                {{shortenedLabels[index]}}
            </button>
            <div v-if="index != storyline.length-1" class="vr m-0 p-0"></div>
        </div>
    </div>
</template>


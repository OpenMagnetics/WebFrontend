<script setup>
import { toDashCase, toPascalCase, toTitleCase } from '/src/assets/js/utils.js'
</script>

<script>
export default {
    props: {
        selectedTool: {
            type: String,
            required: true
        },
        storyline: {
            type: Object,
            required: true
        },
        canContinue: {
            type: Object,
            required: false
        },
    },
    data() {
        return {
        }
    },
    computed: {
        basicStoryline() {
            const basicStoryline = {}

            for (var key in this.storyline) {
                var label = toTitleCase(this.storyline[key].title);
                if (this.storyline[key].basicTool == null){
                    basicStoryline[key] = this.storyline[key];
                }
            }
            return basicStoryline
        },
        shortenedLabels() {
            const shortenedLabels = {}

            for (var key in this.storyline) {
                var label = toTitleCase(this.storyline[key].title);
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
                        .join('');
                }
                shortenedLabels[key] =label;
            }
            // console.log(shortenedLabels);

            return shortenedLabels
        }
    },
    watch: { 
        selectedTool: function(newVal, oldVal) { // watch it
            // console.log('selectedTool changed: ', newVal, ' | was: ', oldVal)
        }
    },
    mounted () {
    },
    methods: {
        btn_class(index) {
            var btn_class = "";
            if (this.storyline[index].nextTool == null || this.storyline[index].prevTool == null) {
                btn_class += "rounded-4 "
            }
            else {
                btn_class += "rounded-0 "
            }
            var children = [index]
            while (this.storyline[children[children.length - 1]].advancedTool != null) {
                children.push(this.storyline[children[children.length - 1]].advancedTool);
            }

            if (children.includes(this.selectedTool)) {
                btn_class += "bg-primary text-dark"
            }
            // else if (this.canContinue[index]) {
            //     btn_class += "bg-secondary text-white"
            // }
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
        <div v-for="adventure, index in basicStoryline" class=""> 
            <button :data-cy="'storyline-' + toPascalCase(adventure.title) + '-button'" v-resize-text="{ratio:1, minFontSize: '14px', maxFontSize: '100px', delay: 20}" class="border border-primary btn-outline-primary col-12 m-0 px-1 py-2" :class="btn_class(index)" :disabled="!canContinue[index]" @click="$emit('changeTool', index)"> 
                {{shortenedLabels[index]}}
            </button>
            <div v-if="adventure.nextTool != null" class="vr m-0 p-0"></div>
        </div>
    </div>
</template>


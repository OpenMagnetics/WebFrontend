<script setup>
import { toDashCase, toPascalCase, toTitleCase } from '/WebSharedComponents/assets/js/utils.js'
</script>

<script>
export default {
    emits: ["changeTool", "nextTool"],
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
        forceUpdate: {
            type: Number,
            default: 0
        },
        showAvoidOption: {
            type: Boolean,
            default: false
        },
    },
    data() {

        var enabledAdventures = {};
        return {
            enabledAdventures,
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
                if (window.innerWidth < 1450) {
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

            return shortenedLabels
        },
    },
    watch: { 
        forceUpdate: function(newVal, oldVal) { // watch it
            this.calculateDisabled();
        },
        selectedTool: function(newVal, oldVal) { // watch it
            this.calculateDisabled();
        },
        'storyline': {
            handler(newValue, oldValue) {
                this.calculateDisabled();
            },
          deep: true
        },
    },
    mounted () {
        this.calculateDisabled();
    },
    methods: {
        calculateDisabled() {
            this.enabledAdventures = {}
            var enabled = true;
            const lastKey = Object.keys(this.storyline)[Object.keys(this.storyline).length - 1];
            const firstKey = Object.keys(this.storyline)[0];
            for (var key in this.storyline) {
                if (key == firstKey) {
                    this.enabledAdventures[key] = true
                    continue;
                }
                if (this.storyline[key].prevTool in this.canContinue) {
                    enabled &= this.canContinue[this.storyline[key].prevTool]
                }
                this.enabledAdventures[key] = Boolean(enabled)
            }

        },
        btn_class(index) {
            var btn_class = "";
            if (this.storyline[index].nextTool == null || this.storyline[index].prevTool == null) {
                btn_class += "rounded-4 "
            }
            else {
                btn_class += "rounded-0 "
            }
            var children = [index]

            if (this.storyline[index].nextTool != null) {
                btn_class += "col-9 col-sm-9 col-md-12"
            }
            else {
                btn_class += "col-12"
            }

            return btn_class
        },
        nextTool(hideForever) {
            this.$emit("nextTool");
        },
        getInnerWidth() {
            return window.innerWidth;
        },
    }
}
</script>

<template>
    <div class="py-2 p-0 container" :style="$styleStore.storyline.main">
        <h4 class="text-center py-2" :style="$styleStore.storyline.title" >Steps</h4>
        <div class="row px-1">
            <div v-for="(adventure, index) in basicStoryline" :key="index" class="col-3 col-sm-3 col-md-12 px-0"> 
                <button
                    :style="index == selectedTool? $styleStore.storyline.activeButton : enabledAdventures[index]? $styleStore.storyline.availableButton : $styleStore.storyline.pendingButton"
                    v-if="adventure.enabled == null || adventure.enabled"
                    v-tooltip="toPascalCase(adventure.title)"
                    :data-cy="'storyline-' + toPascalCase(adventure.title) + '-button'"
                    class="border px-0 py-2"
                    :class="btn_class(index)"
                    :disabled="!enabledAdventures[index]"
                    @click="$emit('changeTool', index)"> 
                    {{shortenedLabels[index]}}
                </button>
                <i
                    :style="$styleStore.storyline.arrow"
                    v-if="adventure.nextTool != null && getInnerWidth() > 768"
                    class="fa-solid fa-arrow-down col-3 col-sm-3 col-md-12"
                ></i>
                <i
                    :style="$styleStore.storyline.arrow"
                    v-if="adventure.nextTool != null && getInnerWidth() < 768"
                    class="fa-solid fa-left-right col-3 col-sm-3 col-md-12"
                ></i>
            </div>
        </div>



        <div class="row px-3">
            <button 
                :style="$styleStore.storyline.continueButton"
                v-if="storyline[selectedTool] != null && storyline[selectedTool].nextTool != null"  
                :disabled="!canContinue[selectedTool]" 
                data-cy="magnetic-synthesis-next-tool-button" 
                class="btn px-0 mt-4 col-6 col-sm-6 col-md-12"
                :class="canContinue[selectedTool]? 'btn-success' : 'btn-outline-primary'"
                @click="nextTool">
                {{canContinue[selectedTool]? 'Continue' : 'Errors must be fixed'}}
            </button>
<!--             <button
                :data-cy="'settings-modal-button'"
                class="btn btn-info mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
                data-bs-toggle="modal"
                data-bs-target="#StorylineSettingsModal"
            >Settings</button>
            <button
                v-if="showEditOption"  
                :data-cy="'edit-from-viewer-button'"
                class="btn btn-success mx-auto d-block mt-4 col-6 col-sm-6 col-md-12"
            >Edit magnetic!</button> -->
        </div>
    </div>
</template>


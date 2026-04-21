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
        isCompleted(index) {
            const keys = Object.keys(this.basicStoryline);
            const selectedIndex = keys.indexOf(this.selectedTool);
            const currentIndex = keys.indexOf(index);
            return currentIndex < selectedIndex;
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
    <div class="storyline-panel">
        <div class="storyline-header">
            <div class="storyline-header-left">
                <i class="bi bi-signpost"></i>
                <span>Steps</span>
            </div>
        </div>
        <div class="storyline-body">
            <div class="storyline-steps" :class="getInnerWidth() > 768 ? 'storyline-steps-vertical' : 'storyline-steps-horizontal'">
                <template v-for="(adventure, index) in basicStoryline" :key="index">
                    <button
                        v-if="adventure.enabled == null || adventure.enabled"
                        :data-cy="'storyline-' + toPascalCase(adventure.title) + '-button'"
                        class="storyline-step"
                        :class="{
                            'storyline-step-active': index == selectedTool,
                            'storyline-step-completed': index != selectedTool && enabledAdventures[index] && isCompleted(index),
                            'storyline-step-upcoming': index != selectedTool && enabledAdventures[index] && !isCompleted(index),
                            'storyline-step-pending': index != selectedTool && !enabledAdventures[index]
                        }"
                        :disabled="!enabledAdventures[index]"
                        @click="$emit('changeTool', index)"
                    >
                        {{shortenedLabels[index]}}
                    </button>
                    <div
                        v-if="adventure.nextTool != null"
                        class="storyline-connector"
                        :class="getInnerWidth() > 768 ? 'storyline-connector-vertical' : 'storyline-connector-horizontal'"
                    >
                        <i class="bi" :class="getInnerWidth() > 768 ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
                    </div>
                </template>
            </div>
            <button
                v-if="storyline[selectedTool] != null && storyline[selectedTool].nextTool != null"
                :disabled="!canContinue[selectedTool]"
                data-cy="magnetic-synthesis-next-tool-button"
                class="storyline-continue-btn storyline-continue-btn-bottom"
                :class="canContinue[selectedTool]? 'storyline-continue-btn-primary' : 'storyline-continue-btn-outline'"
                @click="nextTool"
            >
                {{canContinue[selectedTool]? 'Continue' : 'Fix Errors'}}
            </button>
        </div>
    </div>
</template>

<style scoped>
.storyline-panel {
    background: rgba(var(--bs-dark-rgb), 0.55);
    border: 1px solid rgba(var(--bs-light-rgb), 0.08);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.8);
    border-radius: 14px;
    padding: 0;
    margin: 0.15rem 0 0.5rem 0;
    box-shadow: 0 6px 24px rgba(var(--bs-dark-rgb), 0.45), inset 0 1px 0 rgba(var(--bs-light-rgb), 0.04);
    overflow: hidden;
}

.storyline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--bs-primary);
    letter-spacing: 0.02em;
}

.storyline-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.storyline-header-left i {
    font-size: 0.95rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.45));
}

.storyline-continue-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: nowrap;
}

.storyline-continue-btn:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
}

.storyline-continue-btn-primary {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-success) 115%, transparent 0%) 0%,
        var(--bs-success) 55%,
        rgb(var(--bs-success-rgb) / 0.85) 100%);
    color: var(--bs-white);
    border: 1px solid color-mix(in srgb, var(--bs-success) 70%, var(--bs-white) 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-success-rgb) / 0.35),
        0 2px 8px rgb(var(--bs-success-rgb) / 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.storyline-continue-btn-outline {
    background: rgb(var(--bs-danger-rgb) / 0.2);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.55);
    color: var(--bs-danger);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.storyline-continue-btn-outline:hover:not(:disabled) {
    background: rgb(var(--bs-danger-rgb) / 0.3);
    border-color: rgb(var(--bs-danger-rgb) / 0.75);
    box-shadow: 0 2px 6px rgb(var(--bs-danger-rgb) / 0.25);
}

.storyline-body {
    padding: 0.6rem 0.5rem;
}

.storyline-steps {
    display: flex;
    gap: 0.35rem;
}

.storyline-steps-vertical {
    flex-direction: column;
}

.storyline-steps-horizontal {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
}

.storyline-step {
    appearance: none;
    border: 1px solid transparent;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: normal;
    word-break: normal;
    overflow-wrap: break-word;
    line-height: 1.15;
    text-align: center;
    min-width: 0;
}

.storyline-step-active {
    background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.9) 0%, rgba(var(--bs-primary-rgb), 0.7) 100%);
    color: var(--bs-white);
    border-color: rgba(var(--bs-primary-rgb), 0.6);
    box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.35);
}

.storyline-step-completed {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    color: var(--bs-white);
}

.storyline-step-completed:hover {
    background: rgba(255, 255, 255, 0.4);
    border-color: rgba(255, 255, 255, 0.65);
    color: var(--bs-white);
}

.storyline-step-upcoming {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.65);
}

.storyline-step-upcoming:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    color: var(--bs-white);
}

.storyline-step-pending {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.4);
    cursor: not-allowed;
}

.storyline-connector {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(var(--bs-primary-rgb), 0.55);
    font-size: 0.7rem;
}

.storyline-connector-vertical {
    height: 0.9rem;
}

.storyline-connector-horizontal {
    width: 0.6rem;
}

.storyline-continue-btn-bottom {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 0.75rem;
}
</style>


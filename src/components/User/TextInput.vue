<script setup>
import { toRef } from 'vue';
import { useField } from 'vee-validate';

const props = defineProps({
    type: {
        type: String,
        default: 'text',
    },
    value: {
        type: String,
        default: '',
    },
    name: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    successMessage: {
        type: String,
        default: '',
    },
    placeholder: {
        type: String,
        default: '',
    },
    dataTestLabel: {
        type: String,
        default: '',
    },
});

const name = toRef(props, 'name');

const {
    value: inputValue,
    errorMessage,
    handleBlur,
    handleChange,
    meta,
} = useField(name, undefined, {
    initialValue: props.value,
});
</script>

<template>
    <div
        class="TextInput "
        :class="{ 'has-error': !!errorMessage, success: meta.valid }"
    >
        <label :for="name">{{ label }}</label>
        <input
            class="bg-light"
            :data-cy="dataTestLabel"
            :name="name"
            :id="name"
            :type="type"
            :autocomplete="type == 'password'? 'on' : ''"
            :value="inputValue"
            :placeholder="placeholder"
            @input="handleChange"
            @blur="handleBlur"
        />

        <p class="help-message" v-show="errorMessage || meta.valid">
            {{ errorMessage || successMessage }}
        </p>
    </div>
</template>

<style scoped>
.TextInput {
    position: relative;
    margin-bottom: calc(1em * 1.5);
    width: 100%;
}

label {
    display: block;
    margin-bottom: 4px;
    width: 100%;
}

input {
    border-radius: 5px;
    border: 2px solid transparent;
    padding: 15px 10px;
    outline: none;
    width: 100%;
    transition: border-color 0.3s ease-in-out, color 0.3s ease-in-out,
        background-color 0.3s ease-in-out;
}

input:focus {
    border-color: var(--bs-primary);
}

.help-message {
    position: absolute;
    bottom: calc(-1.5 * 1em);
    left: 0;
    margin: 0;
    font-size: 14px;
}

.TextInput.has-error input {
    background-color: var(--bs-danger);
    color: var(--bs-danger);
}

.TextInput.has-error input:focus {
    border-color: var(--bs-danger);
}

.TextInput.has-error .help-message {
    color: var(--bs-danger);
}

.TextInput.success input {
    background-color: var(--bs-success);
    color: var(--bs-success);
}

.TextInput.success input:focus {
    border-color: var(--bs-success);
}

.TextInput.success .help-message {
    color: var(--bs-success);
}
</style>

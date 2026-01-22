<script setup>
import CrossReferencerSelection from './CrossReferencerSelection.vue'
import '../../assets/css/micrometals.css'
</script>

<script>
export default {
    data() {
        const suffix = '_micrometals';
        return {
            suffix
        }
    },
}
</script>

<template>
    <CrossReferencerSelection :suffix="suffix"/>
</template>

<style>
    .wrap {
      position: relative;
    }

    .wrap:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, rgba(179, 10, 32, 0.666), var(--bs-dark)),
    url('/images/background_cross_reference_micrometals.png');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }
    body:before {
      background-image: linear-gradient(to bottom, var(--bs-primary), var(--bs-dark) 100px);
    }


    .content {
      position: relative;
    }
</style>
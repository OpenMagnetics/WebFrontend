<script setup>
import CrossReferencerSelection from './CrossReferencerSelection.vue'
import '../../assets/css/ferroxcube.css'
</script>

<script>
export default {
    data() {
        const suffix = '_ferroxcube';
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
      background-image: linear-gradient(to bottom, rgba(0, 132, 197, 0.666), var(--bs-dark)),
    url('/images/background_cross_reference_ferroxcube.png');
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


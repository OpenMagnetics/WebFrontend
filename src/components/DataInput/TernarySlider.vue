<script setup>
import Joystick from 'vue-joystick-component'
</script>

<script>        
const start = () => console.log('start')
const stop = () => console.log('stop')
const move = ({ x, y, direction, distance }) => {
  console.log('move', { x, y, direction, distance })
}
export default {
    props: {
        scoring: {
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const style = getComputedStyle(document.body);
        const theme = {
          primary: style.getPropertyValue('--bs-primary'),
          secondary: style.getPropertyValue('--bs-secondary'),
          success: style.getPropertyValue('--bs-success'),
          info: style.getPropertyValue('--bs-info'),
          warning: style.getPropertyValue('--bs-warning'),
          danger: style.getPropertyValue('--bs-danger'),
          light: style.getPropertyValue('--bs-light'),
          dark: style.getPropertyValue('--bs-dark'),
          white: style.getPropertyValue('--bs-white'),
        };
        const baseImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cpolygon fill='%23cc3f47' points='957 450 539 900 1396 900'/%3E%3Cpolygon fill='%23b3373e' points='957 450 872.9 900 1396 900'/%3E%3Cpolygon fill='%23c8364e' points='-60 900 398 662 816 900'/%3E%3Cpolygon fill='%23b02f44' points='337 900 398 662 816 900'/%3E%3Cpolygon fill='%23c22f55' points='1203 546 1552 900 876 900'/%3E%3Cpolygon fill='%23ab294b' points='1203 546 1552 900 1162 900'/%3E%3Cpolygon fill='%23bb285c' points='641 695 886 900 367 900'/%3E%3Cpolygon fill='%23a52351' points='587 900 641 695 886 900'/%3E%3Cpolygon fill='%23b32362' points='1710 900 1401 632 1096 900'/%3E%3Cpolygon fill='%239f1f57' points='1710 900 1401 632 1365 900'/%3E%3Cpolygon fill='%23aa2068' points='1210 900 971 687 725 900'/%3E%3Cpolygon fill='%23971c5d' points='943 900 1210 900 971 687'/%3E%3C/svg%3E"
        return {
            theme,
            baseImage,
        }
    },
    computed: {
    },
    watch: {
    },
    mounted () {
    },
    methods: {
    }
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">

      <Joystick
        :size="200"
        :stickSize="30"
        :base-color="theme['primary']"
        :stick-color="theme['info']"
        :sticky="true"
        :throttle="100"
        @start="start"
        @stop="stop"
        @move="move"
      />
    </div>
</template>

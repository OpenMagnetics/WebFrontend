<template>
  <div>
    <component :is="componentFile" />
  </div>
</template>
<script>
import { defineComponent, defineAsyncComponent } from "vue";

export default defineComponent({
  name: "MusingLoader",
  data() {
    return {
      componentPath: "",
      address: "",
    };
  },
  methods: {},
  computed: {
    componentFile() {
      return defineAsyncComponent(() =>
        import(`../views/musings/${this.componentPath}.vue`)
      );
    },
  },
  created() {
    const index = this.$route.params.index;
    this.componentPath = "Musing" + index;
  },
});
</script>
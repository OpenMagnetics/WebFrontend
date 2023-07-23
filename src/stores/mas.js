import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import * as Defaults from '/src/assets/js/defaults.js'

export const useMasStore = defineStore("mas", () => {

    const mas = ref(MAS.Convert.toMas(JSON. stringify(Defaults.mas)));

    function updatedTurnsRatios() {
    }
    return {
        mas,
        updatedTurnsRatios,
    }
},
{
    persist: true,
}
)

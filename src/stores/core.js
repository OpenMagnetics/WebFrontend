import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCoreStore = defineStore("core", () => {
    const customizedShape = ref(false)
    const customizedMaterial = ref(false)
    const customizedGapping = ref(false)
    const distributedGapAlreadyInUse = ref(false)
    const core = ref(null)
    const dataReadOnly = ref(false)
    const fullCoreModel = ref(true)
    const isCustomizedShape = computed(() => {
        return customizedShape
    })
    const isCustomizedMaterial = computed(() => {
        return customizedMaterial
    })
    const isCustomizedGapping = computed(() => {
        return customizedGapping
    })
    const isDataReadOnly = computed(() => {
        return dataReadOnly
    })
    const getCore = computed(() => {
        return core
    })
    function setCustomizedShape(value) {
        this.customizedShape = value
    }
    function setCustomizedMaterial(value) {
        this.customizedMaterial = value
    }
    function setCustomizedGapping(value) {
        this.customizedGapping = value
    }
    function setCore(core) {
        this.core = core
    }
    function setFullCoreModel(fullCoreModel) {
        this.fullCoreModel = fullCoreModel
    }
    function setDataReadOnly(dataReadOnly) {
        this.dataReadOnly = dataReadOnly
    }
    function setDistributedGapAlreadyInUse(distributedGapAlreadyInUse) {
        this.distributedGapAlreadyInUse = distributedGapAlreadyInUse
    }
    function setStreamedObj(object) {
    }
    function setTechnicalDrawing(object) {
    }
    function requestingNewShape(object) {
    }
    function updateAllLengths(newValue) {
    }
    function gapReluctanceModelChanged(newValue) {
    }
    return {
        customizedShape,
        customizedMaterial,
        customizedGapping,
        core,
        isCustomizedShape,
        isCustomizedMaterial,
        isCustomizedGapping,
        getCore,
        setCustomizedShape,
        setCustomizedMaterial,
        setCustomizedGapping,
        setCore,
        dataReadOnly,
        isDataReadOnly,
        setDataReadOnly,
        setStreamedObj,
        setTechnicalDrawing,
        requestingNewShape,
        distributedGapAlreadyInUse,
        setDistributedGapAlreadyInUse,
        updateAllLengths,
        gapReluctanceModelChanged,
        setFullCoreModel,
        fullCoreModel,
    }
})

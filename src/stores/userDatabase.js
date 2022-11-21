import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Utils from '/src/assets/js/utils.js'

export const useUserDatabaseStore = defineStore("userDatabase", () => {
    const operationPoints = ref(null)
    const cores = ref(null)
    const bobbins = ref(null)
    const wires = ref(null)
    const magnetics = ref(null)

    function setOperationPoints(operationPoints) {
        this.operationPoints = operationPoints
    }
    function setCores(cores) {
        this.cores = cores
    }
    function setBobbins(bobbins) {
        this.bobbins = bobbins
    }
    function setWires(wires) {
        this.wires = wires
    }
    function setMagnetics(magnetics) {
        this.magnetics = magnetics
    }

    function getOperationPointsById(id) {
        var foundItem = null
        this.operationPoints.forEach((item) => {
            if (item["_id"] == id) 
                foundItem = Utils.deepCopy(item)
        })
        return foundItem
    }

    return {
        operationPoints,
        cores,
        bobbins,
        wires,
        magnetics,
        setOperationPoints,
        setCores,
        setBobbins,
        setWires,
        setMagnetics,
        getOperationPointsById,
    }
})

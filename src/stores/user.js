import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

export const useUserStore = defineStore("user", () => {
    const loggedIn = ref(false)
    const ipAddress = ref(0)
    const username = ref(null)
    const readNotifications = ref([])
    const globalOperationPoint = ref(Utils.deepCopy(Defaults.defaultOperationPointExcitation))
    const globalCore = ref(Utils.deepCopy(Defaults.defaultCore))
    const globalSimulation = ref(Utils.deepCopy(Defaults.defaultSimulation))
    const idToDelete = ref(null)
    const userSubsection = ref("operationPoints")
    const coreSubsection = ref("shapeArtisan")
    const coreSimulationSubsection = ref("coreCalculator")
    const simulationCoreCalculatorSubsection = ref("inductanceCalculator")
    const selectedModels = ref({
        gapReluctance: "Zhang",
    })
    const isLoggedIn = computed(() => {
        return loggedIn
    })
    const getUsername = computed(() => {
        return username
    })
    const getUserSubsection = computed(() => {
        return userSubsection
    })
    const getCoreSubsection = computed(() => {
        return coreSubsection
    })
    const getCoreSimulationSubsection = computed(() => {
        return coreSimulationSubsection
    })
    const getGlobalOperationPoint = computed(() => {
        return globalOperationPoint
    })
    const getGlobalCore = computed(() => {
        return globalCore
    })
    const getIdToDelete = computed(() => {
        return idToDelete
    })

    const dump = computed(() => {
        return {
            "loggedIn": loggedIn.value,
            "ipAddress": ipAddress.value,
            "username": username.value,
            "readNotifications": readNotifications.value,
            "globalOperationPoint": globalOperationPoint.value,
            "globalCore": globalCore.value,
            "userSubsection": userSubsection.value,
            "coreSubsection": coreSubsection.value,
            "coreSimulationSubsection": coreSimulationSubsection.value,
            "simulationCoreCalculatorSubsection": simulationCoreCalculatorSubsection.value,
            "selectedModels": selectedModels.value,
        }
    })

    function resetGlobalOperationPoint() {
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPointExcitation)
    }

    function resetGlobalCore() {
        this.globalCore = Utils.deepCopy(Defaults.defaultCore)
    }

    function reset() {
        this.loggedIn = false
        this.username = null
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPointExcitation)
        this.globalCore = Utils.deepCopy(Defaults.defaultCore)
        this.idToDelete = null
        this.userSubsection = "operationPoints"
        this.coreSubsection = "shapeArtisan"
    }

    function setUsername(username) {
        this.username = username
    }
    function setUserSubsection(userSubsection) {
        this.userSubsection = userSubsection
    }
    function setCoreSubsection(coreSubsection) {
        this.coreSubsection = coreSubsection
    }
    function setCoreSimulationSubsection(coreSimulationSubsection) {
        this.coreSimulationSubsection = coreSimulationSubsection
    }
    function login() {
        this.loggedIn = true
    }
    function logout() {
        this.loggedIn = false
    }
    function setGlobalOperationPoint(globalOperationPoint) {
        this.globalOperationPoint = globalOperationPoint
    }
    function setGlobalCore(globalCore) {
        this.globalCore = globalCore
    }
    function setGlobalSimulation(globalSimulation) {
        this.globalSimulation = globalSimulation
    }
    function setGlobalCoreAlt(globalCore) {
        this.globalCore = globalCore
    }
    function setGlobalCoreShapeName(name) {
        if (typeof(this.globalCore['functionalDescription']['shape']) == 'string') {
            this.globalCore['functionalDescription']['shape'] = name
        }
        else {
            this.globalCore['functionalDescription']['shape']['name'] = name
            this.globalCore['functionalDescription']['shape']['type'] = name == "Custom"? 'custom' : 'standard'
        }
    }
    function setGlobalCoreShape(shape) {
        this.globalCore['functionalDescription']['shape'] = shape
    }
    function setGlobalCoreMaterial(material) {
        this.globalCore['functionalDescription']['material'] = material
    }
    function setGlobalCoreGapping(gapping) {
        this.globalCore['functionalDescription']['gapping'] = gapping
    }
    function setGlobalSimulationCoreMaterial(material) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['material'] = material
    }
    function setGlobalSimulationCoreShape(shape) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['shape'] = shape
    }
    function setGlobalSimulationCoreGapping(gapping) {
        console.log("gapping")
        console.log("gapping")
        console.log("gapping")
        console.log(gapping)
        this.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = gapping
    }
    function setGlobalSimulationCoreNumberStacks(numberStacks) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['numberStacks'] = numberStacks
    }
    function setGlobalSimulationOperationPointByIndex(index, operationPoint) {
        this.globalSimulation['inputs']['operationPoints'][0] = operationPoint
    }
    function loadGlobalOperationPointIntoSimulation(index, operationPoint) {
        this.globalSimulation['inputs']['operationPoints'][0]['excitationsPerWinding'][0] = Utils.deepCopy(this.globalOperationPoint)
        console.log(this.globalSimulation['inputs']['operationPoints'][0]['excitationsPerWinding'][0])
        console.log(this.globalOperationPoint)
    }
    function setIdToDelete(idToDelete) {
        this.idToDelete = idToDelete
    }
    function setSelectedModels(variable, model) {
        this.selectedModels[variable] = model
    }
    function setSimulationCoreCalculatorSubsection(simulationCoreCalculatorSubsection) {
        this.simulationCoreCalculatorSubsection = simulationCoreCalculatorSubsection
    }
    return {
        dump,
        loggedIn,
        ipAddress,
        username,
        readNotifications,
        isLoggedIn,
        getUsername,
        setUsername,
        login,
        logout,
        userSubsection,
        getUserSubsection,
        setUserSubsection,
        coreSubsection,
        getCoreSubsection,
        setCoreSubsection,
        simulationCoreCalculatorSubsection,
        setSimulationCoreCalculatorSubsection,
        coreSimulationSubsection,
        getCoreSimulationSubsection,
        setCoreSimulationSubsection,
        globalOperationPoint,
        getGlobalOperationPoint,
        setGlobalOperationPoint,
        globalCore,
        getGlobalCore,
        setGlobalCore,
        setGlobalCoreAlt,
        setGlobalCoreShapeName,
        setGlobalCoreShape,
        setGlobalCoreMaterial,
        setGlobalCoreGapping,
        globalSimulation,
        setGlobalSimulation,
        setGlobalSimulationCoreMaterial,
        setGlobalSimulationCoreShape,
        setGlobalSimulationCoreGapping,
        setGlobalSimulationCoreNumberStacks,
        setGlobalSimulationOperationPointByIndex,
        loadGlobalOperationPointIntoSimulation,
        idToDelete,
        getIdToDelete,
        setIdToDelete,
        resetGlobalOperationPoint,
        resetGlobalCore,
        setSelectedModels,
        selectedModels,
        reset,
    }
},
{
    persist: true,
})

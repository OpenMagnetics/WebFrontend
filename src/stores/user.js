import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

export const useUserStore = defineStore("user", () => {
    const loggedIn = ref(false)
    const username = ref(null)
    const globalOperationPoint = ref(Utils.deepCopy(Defaults.defaultOperationPoint))
    const globalCore = ref(Utils.deepCopy(Defaults.defaultCore))
    const idToDelete = ref(null)
    const userSubsection = ref("operationPoints")
    const coreSubsection = ref("shapeArtisan")
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
    const getGlobalOperationPoint = computed(() => {
        return globalOperationPoint
    })
    const getGlobalCore = computed(() => {
        return globalCore
    })
    const getIdToDelete = computed(() => {
        return idToDelete
    })

    function resetGlobalOperationPoint() {
        this.globalOperationPoint = Defaults.defaultOperationPoint
    }
    function reset() {
        this.loggedIn = false
        this.username = null
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPoint)
        this.globalCore = null
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
    function setIdToDelete(idToDelete) {
        this.idToDelete = idToDelete
    }
    return {
        loggedIn,
        username,
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
        globalOperationPoint,
        getGlobalOperationPoint,
        setGlobalOperationPoint,
        globalCore,
        getGlobalCore,
        setGlobalCore,
        idToDelete,
        getIdToDelete,
        setIdToDelete,
        resetGlobalOperationPoint,
        reset,
    }
},
{
    persist: true,
})

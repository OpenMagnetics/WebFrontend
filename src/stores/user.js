import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useUserStore = defineStore("user", () => {
    const loggedIn = ref(false)
    const username = ref(null)
    const currentOperationPoint = ref(null)
    const idToDelete = ref(null)
    const userSubsection = ref("operationPoints")
    const numberOperationPoints = ref(null)
    const numberCores = ref(null)
    const numberBobbins = ref(null)
    const numberWires = ref(null)
    const numberMagnetics = ref(null)
    const isLoggedIn = computed(() => {
        return loggedIn
    })
    const getUsername = computed(() => {
        return username
    })
    const getUserSubsection = computed(() => {
        return userSubsection
    })
    const getCurrentOperationPoint = computed(() => {
        return currentOperationPoint
    })
    const getIdToDelete = computed(() => {
        return idToDelete
    })

    function setUsername(username) {
        this.username = username
    }
    function setUserSubsection(userSubsection) {
        this.userSubsection = userSubsection
    }
    function login() {
        this.loggedIn = true
    }
    function logout() {
        this.loggedIn = false
    }
    function setCurrentOperationPoint(currentOperationPoint) {
        this.currentOperationPoint = currentOperationPoint
    }
    function setIdToDelete(idToDelete) {
        this.idToDelete = idToDelete
    }
    function setNumberOperationPoints(numberOperationPoints) {
        this.numberOperationPoints = numberOperationPoints
    }
    function setNumberCores(numberCores) {
        this.numberCores = numberCores
    }
    function setNumberBobbins(numberBobbins) {
        this.numberBobbins = numberBobbins
    }
    function setNumberWires(numberWires) {
        this.numberWires = numberWires
    }
    function setNumberMagnetics(numberMagnetics) {
        this.numberMagnetics = numberMagnetics
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
        currentOperationPoint,
        getCurrentOperationPoint,
        setCurrentOperationPoint,
        idToDelete,
        getIdToDelete,
        setIdToDelete,
        numberOperationPoints,
        numberCores,
        numberBobbins,
        numberWires,
        numberMagnetics,
        setNumberOperationPoints,
        setNumberCores,
        setNumberBobbins,
        setNumberWires,
        setNumberMagnetics,
    }
})

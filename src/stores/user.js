import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useUserStore = defineStore("user", () => {
    const loggedIn = ref(false)
    const username = ref(null)
    const isLoggedIn = computed(() => {
        return loggedIn
    })
    const getUsername = computed(() => {
        return username
    })

    function setUsername(username) {
        this.username = username
    }
    function login() {
        this.loggedIn = true
    }
    function logout() {
        this.loggedIn = false
    }
    return {
        loggedIn,
        username,
        isLoggedIn,
        getUsername,
        setUsername,
        login,
        logout,
    }
})

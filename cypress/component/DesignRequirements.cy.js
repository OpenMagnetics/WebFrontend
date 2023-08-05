import DesignRequirements from '/src/components/Synthesis/DesignRequirements.vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createPinia } from 'pinia'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

describe('DesignRequirements.cy.js', {
    viewportWidth: 2024,
    viewportHeight: 700}, () => {
  it('playground', () => {
    cy.mount(DesignRequirements)
  })
})

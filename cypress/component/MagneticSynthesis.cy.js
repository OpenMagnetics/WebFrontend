import MagneticSynthesis from '/src/views/MagneticSynthesis.vue'

describe('MagneticSynthesis.cy.js', {
    viewportWidth: 2024,
    viewportHeight: 700}, () => {
  it('playground', () => {
    cy.mount(MagneticSynthesis)
  })
})


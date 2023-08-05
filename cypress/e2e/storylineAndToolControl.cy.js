import '/cypress/support/toolsCommands'
import '/cypress/support/storylineCommands'


describe('Storyline', () => {
  it('initial state', () => {
    cy.visit('http://localhost:5173/magnetic_synthesis')
    cy.checkStorylineAdventureVisible('designRequirements')
    cy.checkTitle("Design Requirements")
  })

  // it('Go up and down in storyline', () => {
  //   cy.visit('http://localhost:5173/magnetic_synthesis')
  //   cy.checkStorylineAdventureVisible('designRequirements')
  // })
})
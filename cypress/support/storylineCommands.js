import { hexToRgb, colors } from '/cypress/support/utils.js'

const storylineAdventures = {
    designRequirements: 'DesignRequirements',
    operatingPoints: 'OperatingPoints',
    coreAdviser: 'CoreAdviser',
    wireAdviser: 'WireAdviser',
    coilAdviser: 'CoilAdviser',
    summary: 'Summary',
}

Cypress.Commands.add('checkStorylineAdventureVisible', (adventure) => {
    cy.get(`[data-cy=storyline-${storylineAdventures[adventure]}-button]`).should('be.visible')
    // cy.get(`[data-cy=storyline-${storylineAdventures[adventure]}-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.primary))
    for (var [key, value] of Object.entries(storylineAdventures)) {
        if (key != adventure) {
            cy.get(`[data-cy=storyline-${value}-button]`).should('be.visible', { timeout: 10000 })
            // cy.get(`[data-cy=storyline-${value}-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.dark))
        }
    }
})


Cypress.Commands.add('selectStorylineAdventure', (adventure) => {
    cy.get(`[data-cy=storyline-${storylineAdventures[adventure]}-button]`).click({ timeout: 10000 })
})

import { hexToRgb, colors } from '/cypress/support/utils.js'

const storylineAdventures = {
    designRequirements: 'storyline-design-requirements-button',
    operationPoints: 'storyline-operation-points-button',
    coreSelection: 'storyline-core-selection-button',
    wireSelection: 'storyline-wire-selection-button',
    coilSelection: 'storyline-coil-selection-button',
    magneticFinalizer: 'storyline-magnetic-finalizer-button',
}

Cypress.Commands.add('checkStorylineAdventureVisible', (adventure) => {
    cy.get(`[data-cy=${storylineAdventures[adventure]}]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.primary)).should('be.disabled')
    for (var [key, value] of Object.entries(storylineAdventures)) {
        if (key != adventure) {
            cy.get(`[data-cy=${value}]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.dark)).should('be.disabled')
        }
    }
})

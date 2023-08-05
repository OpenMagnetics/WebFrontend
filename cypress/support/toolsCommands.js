const toolControl = {
    previousToolButton: 'magnetic-synthesis-previous-tool-button',
    nextToolButton: 'magnetic-synthesis-next-tool-button',
    customizationToolButton: 'magnetic-synthesis-customize-tool-button',
    mainToolButton: 'magnetic-synthesis-main-tool-button',
    title: 'magnetic-synthesis-title-text',
}

Cypress.Commands.add('nextTool', () => {
    cy.get(`[data-cy=${toolControl.nextToolButton}]`).click()
})

Cypress.Commands.add('previousTool', () => {
    cy.get(`[data-cy=${toolControl.previousToolButton}]`).click()
})

Cypress.Commands.add('customizationTool', () => {
    cy.get(`[data-cy=${toolControl.customizationToolButton}]`).click()
})

Cypress.Commands.add('mainTool', () => {
    cy.get(`[data-cy=${toolControl.mainToolButton}]`).click()
})

Cypress.Commands.add('checkTitle', (expectedValue) => {
    cy.get(`[data-cy=${toolControl.title}]`).should('have.text', expectedValue)
})



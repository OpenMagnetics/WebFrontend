
Cypress.Commands.add('addField', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-add-button]`).click()
})

Cypress.Commands.add('setField', (dataTestLabel, field, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-text-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('selectUnit', (dataTestLabel, field, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-DimensionUnit-input]`).select(value)
})

Cypress.Commands.add('checkUnit', (dataTestLabel, field, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-DimensionUnit-input] option:selected`).should('have.text', value)
})

Cypress.Commands.add('removeField', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-remove-button]`).click()
})

Cypress.Commands.add('checkIfRemoved', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-add-button]`).should('be.visible')
    cy.get(`[data-cy=${dataTestLabel}-${field}-remove-button]`).should('not.exist')
    cy.get(`[data-cy=${dataTestLabel}-${field}-text-input]`).should('not.exist')
})

Cypress.Commands.add('checkValue', (dataTestLabel, field, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-text-input]`).should('have.value', value)
})

Cypress.Commands.add('checkError', (dataTestLabel, text) => {
    cy.get(`[data-cy=${dataTestLabel}-error-text]`).should('have.text', text)
})

Cypress.Commands.add('selectElement', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-select]`).select(value)
})

Cypress.Commands.add('checkElement', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-select] option:selected`).should('have.text', value)
})

Cypress.Commands.add('selectCheckbox', (dataTestLabel, key, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${key}-checkbox-input]`).check()
})

Cypress.Commands.add('selectCheckboxUnchecked', (dataTestLabel, key, value) => {
    cy.get(`[data-cy=${dataTestLabel}-${key}-checkbox-input]`).uncheck()
})

Cypress.Commands.add('checkCheckbox', (dataTestLabel, key) => {
    cy.get(`[data-cy=${dataTestLabel}-${key}-checkbox-input]`).should('be.checked')
})

Cypress.Commands.add('checkCheckboxUnchecked', (dataTestLabel, key) => {
    cy.get(`[data-cy=${dataTestLabel}-${key}-checkbox-input]`).should('not.be.checked')
})

Cypress.Commands.add('enableDesignRequirement', (requirementName) => {
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).should('have.text', 'Add Req.')
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).click()
})

Cypress.Commands.add('checkDesignRequirementEnabled', (requirementName) => {
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).should('have.text', 'Add Req.')
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).click()
})

Cypress.Commands.add('disableDesignRequirement', (requirementName) => {
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).should('have.text', 'Remove')
    cy.get(`[data-cy=MagneticSynthesis-DesignRequirements-${requirementName}-add-remove-button]`).click()
})
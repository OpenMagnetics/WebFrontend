
Cypress.Commands.add('addField', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-add-button]`).click()
})

Cypress.Commands.add('setField', (dataTestLabel, field, value) => {
    if (field == null)
        cy.get(`[data-cy=${dataTestLabel}-number-input]`).clear().type(value).type("{enter}")
    else
        cy.get(`[data-cy=${dataTestLabel}-${field}-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('selectUnit', (dataTestLabel, field, value) => {
    if (field == null)
        cy.get(`[data-cy=${dataTestLabel}-DimensionUnit-input]`).select(value)
    else
        cy.get(`[data-cy=${dataTestLabel}-${field}-DimensionUnit-input]`).select(value)
})

Cypress.Commands.add('checkUnit', (dataTestLabel, field, value) => {
    if (field == null)
        cy.get(`[data-cy=${dataTestLabel}-DimensionUnit-input] option:selected`).should('have.text', value)
    else
        cy.get(`[data-cy=${dataTestLabel}-${field}-DimensionUnit-input] option:selected`).should('have.text', value)
})

Cypress.Commands.add('removeField', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-remove-button]`).click()
})

Cypress.Commands.add('checkIfRemoved', (dataTestLabel, field) => {
    cy.get(`[data-cy=${dataTestLabel}-${field}-add-button]`).should('be.visible')
    cy.get(`[data-cy=${dataTestLabel}-${field}-remove-button]`).should('not.exist')
    cy.get(`[data-cy=${dataTestLabel}-${field}-number-input]`).should('not.exist')
})

Cypress.Commands.add('checkValue', (dataTestLabel, field, value) => {
    if (field == null)
        cy.get(`[data-cy=${dataTestLabel}-number-input]`).should('have.value', value)
    else
        cy.get(`[data-cy=${dataTestLabel}-${field}-number-input]`).should('have.value', value)
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

Cypress.Commands.add('enableDesignRequirement', (dataTestLabel, requirementName) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-add-remove-button]`).should('have.text', 'Add Req.')
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-add-remove-button]`).click()
})

Cypress.Commands.add('checkDesignRequirementEnabled', (dataTestLabel, requirementName, value) => {
    if (value)
        cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-title]`).should('exist')
    else
        cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-title]`).should('not.exist')
})

Cypress.Commands.add('disableDesignRequirement', (dataTestLabel, requirementName) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-add-remove-button]`).should('have.text', 'Remove')
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-add-remove-button]`).click()
})

Cypress.Commands.add('setNumberWindings', (dataTestLabel, numberWindings, force) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-NumberWindings-select]`).select(numberWindings - 1, { force: force })
})

Cypress.Commands.add('checkArrayRequirementLength', (dataTestLabel, requirementName, length) => {
    for (var i = 0; i < length; i++) {
        cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-${requirementName}-${i}-container]`).should('exist')
    }
})

Cypress.Commands.add('setMaximumWeight', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-MaximumWeight-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkMaximumWeight', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-MaximumWeight-number-input]`).should('have.value', value)
})

Cypress.Commands.add('setName', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Name-text-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkName', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Name-text-input]`).should('have.value', value)
})

Cypress.Commands.add('setTopology', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Topology-select]`).select(value)
})

Cypress.Commands.add('checkTopology', (dataTestLabel, text) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Topology-select] option:selected`).should('have.text', text)
})

Cypress.Commands.add('setTerminalType', (dataTestLabel, windingIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-TerminalType-${windingIndex}-select]`).select(value)
})

Cypress.Commands.add('checkTerminalType', (dataTestLabel, windingIndex, text) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-TerminalType-${windingIndex}-select] option:selected`).should('have.text', text)
})

Cypress.Commands.add('setInsulation', (dataTestLabel, field, value) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Insulation-${field}-select]`).select(value)
})

Cypress.Commands.add('checkInsulation', (dataTestLabel, field, text) => {
    cy.get(`[data-cy=${dataTestLabel}-DesignRequirements-Insulation-${field}-select] option:selected`).should('have.text', text)
})

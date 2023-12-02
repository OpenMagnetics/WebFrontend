Cypress.Commands.add('addOperatingPoint', (dataTestLabel, ) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-add-operating-point-button]`).click()
})

Cypress.Commands.add('modifyNumberWindings', (dataTestLabel, ) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-modify-number-windings-button]`).click()
})

Cypress.Commands.add('selectOperatingPoint', (dataTestLabel, operationPointIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-select-operating-point-${operationPointIndex}-button]`).click()
})

Cypress.Commands.add('removeOperatingPoint', (dataTestLabel, operationPointIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-remove-operating-point-${operationPointIndex}-button]`).click()
})

Cypress.Commands.add('setOperatingPointName', (dataTestLabel, operationPointIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-name-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkOperatingPointName', (dataTestLabel, operationPointIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-name-input]`).should('have.value', value)
})

Cypress.Commands.add('checkErrorMessages', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-error-text]`).should('have.text', value)
})

Cypress.Commands.add('checkOperatingPointIsSelected', (dataTestLabel, operationPointIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-0-select-button]`).should('be.visible')
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-remove-operating-point-${operationPointIndex}-button]`).should('not.exist')
})

Cypress.Commands.add('selectWinding', (dataTestLabel, operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).click()
})

Cypress.Commands.add('reflectWinding', (dataTestLabel, operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-reflect-button]`).click()
})

Cypress.Commands.add('checkWindingIsSelected', (dataTestLabel, operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.success))
})

Cypress.Commands.add('checkWindingIsNotSelected', (dataTestLabel, operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.danger))
})

Cypress.Commands.add('setWindingName', (dataTestLabel, operationPointIndex, windingIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-name-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkWindingName', (dataTestLabel, operationPointIndex, windingIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-name-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedFrequency', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-Frequency-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('selectSelectedFrequencyUnit', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-Frequency-DimensionUnit-input]`).select(value)
})

Cypress.Commands.add('checkSelectedFrequencyUnit', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-Frequency-DimensionUnit-input] option:selected`).should('have.text', value)
})

Cypress.Commands.add('checkSelectedFrequency', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-Frequency-number-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedDutyCycle', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-DutyCycle-number-input]`).clear().type(value).type("{enter}")
})
Cypress.Commands.add('checkSelectedDutyCycle', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-DutyCycle-number-input]`).should('have.value', value)
})

Cypress.Commands.add('induceCurrent', (dataTestLabel, ) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-current-induce-button]`).click()
})

Cypress.Commands.add('induceVoltage', (dataTestLabel, ) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-voltage-induce-button]`).click()
})

Cypress.Commands.add('setCurrentCustomData', (dataTestLabel, signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-value-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkCurrentCustomData', (dataTestLabel, signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-value-input]`).should('have.value', value)
})

Cypress.Commands.add('setCurrentCustomTime', (dataTestLabel, signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-time-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkCurrentCustomTime', (dataTestLabel, signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-time-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedPeakToPeak', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-PeakToPeak-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkSelectedPeakToPeak', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-PeakToPeak-number-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedOffset', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkSelectedOffset', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).should('have.value', value)
})

Cypress.Commands.add('checkSelectedOffsetDisabled', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).should('not.exist')
})

Cypress.Commands.add('setSelectedLabel', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-Label-select]`).select(value)
})

Cypress.Commands.add('checkSelectedLabel', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-selected-${signalDescriptor}-Label-select] option:selected`).should('have.text', value)
})

Cypress.Commands.add('checkSelectedOutputDutyCycle', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-DutyCycle-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputPeakToPeak', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-PeakToPeak-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputOffset', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-Offset-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputEffectiveFrequency', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-EffectiveFrequency-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputPeak', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-Peak-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputRms', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-Rms-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputThd', (dataTestLabel, signalDescriptor, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformOutput-${signalDescriptor}-Thd-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})


Cypress.Commands.add('checkSelectedCombinetOutputInstantaneousPower', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformCombinedOutput-InstantaneousPower-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedCombinetOutputInstantaneousPower', (dataTestLabel, value) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-WaveformCombinedOutput-rmsPower-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('resetSelectedExcitation', (dataTestLabel, ) => {
    cy.get(`[data-cy=${dataTestLabel}-OperatingPoints-reset-button]`).click()
})

Cypress.Commands.add('addOperatingPoint', () => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-add-operating-point-button]`).click()
})

Cypress.Commands.add('modifyNumberWindings', () => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-modify-number-windings-button]`).click()
})

Cypress.Commands.add('selectOperatingPoint', (operationPointIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-select-operating-point-${operationPointIndex}-button]`).click()
})

Cypress.Commands.add('removeOperatingPoint', (operationPointIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-remove-operating-point-${operationPointIndex}-button]`).click()
})

Cypress.Commands.add('setOperatingPointName', (operationPointIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-name-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkOperatingPointName', (operationPointIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-name-input]`).should('have.value', value)
})

Cypress.Commands.add('checkErrorMessages', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-error-text]`).should('have.text', value)
})

Cypress.Commands.add('checkOperatingPointIsSelected', (operationPointIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-0-select-button]`).should('be.visible')
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-remove-operating-point-${operationPointIndex}-button]`).should('not.exist')
})

Cypress.Commands.add('selectWinding', (operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).click()
})

Cypress.Commands.add('reflectWinding', (operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-reflect-button]`).click()
})

Cypress.Commands.add('checkWindingIsSelected', (operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.success))
})

Cypress.Commands.add('checkWindingIsNotSelected', (operationPointIndex, windingIndex) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-select-button]`).should('be.visible').should('have.css', 'background-color', hexToRgb(colors.danger))
})

Cypress.Commands.add('setWindingName', (operationPointIndex, windingIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-name-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkWindingName', (operationPointIndex, windingIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-operating-point-${operationPointIndex}-winding-${windingIndex}-name-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedFrequency', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-Frequency-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('selectSelectedFrequencyUnit', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-Frequency-DimensionUnit-input]`).select(value)
})

Cypress.Commands.add('checkSelectedFrequencyUnit', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-Frequency-DimensionUnit-input] option:selected`).should('have.text', value)
})

Cypress.Commands.add('checkSelectedFrequency', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-Frequency-number-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedDutyCycle', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-DutyCycle-number-input]`).clear().type(value).type("{enter}")
})
Cypress.Commands.add('checkSelectedDutyCycle', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-DutyCycle-number-input]`).should('have.value', value)
})

Cypress.Commands.add('induceCurrent', () => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-current-induce-button]`).click()
})

Cypress.Commands.add('induceVoltage', () => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-voltage-induce-button]`).click()
})

Cypress.Commands.add('setCurrentCustomData', (signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-value-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkCurrentCustomData', (signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-value-input]`).should('have.value', value)
})

Cypress.Commands.add('setCurrentCustomTime', (signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-time-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkCurrentCustomTime', (signalDescriptor, dataIndex, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-WaveformInputCustomPoint-${dataIndex}-time-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedPeakToPeak', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-PeakToPeak-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkSelectedPeakToPeak', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-PeakToPeak-number-input]`).should('have.value', value)
})

Cypress.Commands.add('setSelectedOffset', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).clear().type(value).type("{enter}")
})

Cypress.Commands.add('checkSelectedOffset', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).should('have.value', value)
})

Cypress.Commands.add('checkSelectedOffsetDisabled', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-Offset-number-input]`).should('not.exist')
})

Cypress.Commands.add('setSelectedLabel', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-Label-select]`).select(value)
})

Cypress.Commands.add('checkSelectedLabel', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-selected-${signalDescriptor}-Label-select] option:selected`).should('have.text', value)
})

Cypress.Commands.add('checkSelectedOutputDutyCycle', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-DutyCycle-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputPeakToPeak', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-PeakToPeak-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputOffset', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-Offset-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputEffectiveFrequency', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-EffectiveFrequency-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputPeak', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-Peak-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputRms', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-Rms-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedOutputThd', (signalDescriptor, value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformOutput-${signalDescriptor}-Thd-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})


Cypress.Commands.add('checkSelectedCombinetOutputInstantaneousPower', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformCombinedOutput-InstantaneousPower-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('checkSelectedCombinetOutputInstantaneousPower', (value) => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-WaveformCombinedOutput-rmsPower-number-label]`).invoke('val').then(parseFloat).should('be.closeTo', value, value * 0.01)
})

Cypress.Commands.add('resetSelectedExcitation', () => {
    cy.get(`[data-cy=MagneticSynthesis-OperatingPoints-reset-button]`).click()
})

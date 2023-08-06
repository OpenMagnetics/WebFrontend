import '/cypress/support/designRequirementsCommands'

describe('DesignRequirements', {
    viewportWidth: 1800,
    viewportHeight: 1200}, () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173/magnetic_synthesis')
    })

    it('enable and disable all requiremetns', () => {
        cy.enableDesignRequirement('insulation')
        cy.enableDesignRequirement('leakageInductance')
        cy.enableDesignRequirement('strayCapacitance')
        cy.enableDesignRequirement('operatingTemperature')
        cy.enableDesignRequirement('maximumWeight')
        cy.enableDesignRequirement('maximumDimensions')
        cy.enableDesignRequirement('terminalType')
        cy.enableDesignRequirement('topology')
        cy.enableDesignRequirement('market')
    })


})
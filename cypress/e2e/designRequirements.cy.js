import '/cypress/support/designRequirementsCommands'
import '/cypress/support/storylineCommands'

describe('DesignRequirements', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_synthesis')
        cy.selectStorylineAdventure('designRequirements')
    })

    it('enable and disable all requirements', () => {
        cy.checkDesignRequirementEnabled('Name', true)
        cy.checkDesignRequirementEnabled('MagnetizingInductance', true)
        cy.checkDesignRequirementEnabled('TurnsRatios', true)

        cy.enableDesignRequirement('Insulation')
        cy.enableDesignRequirement('LeakageInductance')
        cy.enableDesignRequirement('StrayCapacitance')
        cy.enableDesignRequirement('OperatingTemperature')
        cy.enableDesignRequirement('MaximumWeight')
        cy.enableDesignRequirement('MaximumDimensions')
        cy.enableDesignRequirement('TerminalType')
        cy.enableDesignRequirement('Topology')
        cy.enableDesignRequirement('Market')

        cy.checkDesignRequirementEnabled('Insulation', true)
        cy.checkDesignRequirementEnabled('LeakageInductance', true)
        cy.checkDesignRequirementEnabled('StrayCapacitance', true)
        cy.checkDesignRequirementEnabled('OperatingTemperature', true)
        cy.checkDesignRequirementEnabled('MaximumWeight', true)
        cy.checkDesignRequirementEnabled('MaximumDimensions', true)
        cy.checkDesignRequirementEnabled('TerminalType', true)
        cy.checkDesignRequirementEnabled('Topology', true)
        cy.checkDesignRequirementEnabled('Market', true)

        cy.disableDesignRequirement('Insulation')
        cy.disableDesignRequirement('LeakageInductance')
        cy.disableDesignRequirement('StrayCapacitance')
        cy.disableDesignRequirement('OperatingTemperature')
        cy.disableDesignRequirement('MaximumWeight')
        cy.disableDesignRequirement('MaximumDimensions')
        cy.disableDesignRequirement('TerminalType')
        cy.disableDesignRequirement('Topology')
        cy.disableDesignRequirement('Market')

        cy.checkDesignRequirementEnabled('Insulation', false)
        cy.checkDesignRequirementEnabled('LeakageInductance', false)
        cy.checkDesignRequirementEnabled('StrayCapacitance', false)
        cy.checkDesignRequirementEnabled('OperatingTemperature', false)
        cy.checkDesignRequirementEnabled('MaximumWeight', false)
        cy.checkDesignRequirementEnabled('MaximumDimensions', false)
        cy.checkDesignRequirementEnabled('TerminalType', false)
        cy.checkDesignRequirementEnabled('Topology', false)
        cy.checkDesignRequirementEnabled('Market', false)
    })


    it('play around with the number of windings while reloading', () => {

        cy.enableDesignRequirement('LeakageInductance')
        cy.enableDesignRequirement('StrayCapacitance')
        cy.enableDesignRequirement('TerminalType')

        for (var i = 0; i < 10; i++) {
            var numberWindingsLimit = Array.from({length: 12}, (_, i) => i + 1)

            const numberWindings = numberWindingsLimit[Math.floor(Math.random() * numberWindingsLimit.length)]
            cy.setNumberWindings(numberWindings, true)
            cy.reload()
            cy.checkArrayRequirementLength("TurnsRatios", numberWindings - 1)
            cy.checkArrayRequirementLength("LeakageInductance", numberWindings - 1)
            cy.checkArrayRequirementLength("StrayCapacitance", numberWindings - 1)
            cy.checkArrayRequirementLength("TerminalType", numberWindings)
        }
    })

    it('set name and reload', () => {
        cy.setName("So long and thanks for the fish")
        cy.reload()
        cy.checkName("So long and thanks for the fish")
    })

    it('set maximum weight and reload', () => {
        cy.enableDesignRequirement('MaximumWeight')
        cy.setMaximumWeight(42)
        cy.reload()
        cy.checkMaximumWeight(42)
    })

    it('set topology and reload', () => {
        cy.enableDesignRequirement('Topology')
        cy.setTopology("Zeta Converter")
        cy.reload()
        cy.checkTopology("Zeta Converter")
    })

    it('set terminal type and reload', () => {
        cy.enableDesignRequirement('TerminalType')
        cy.setTerminalType(0, "Screw")
        cy.reload()
        cy.checkTerminalType(0, "Screw")
    })

    it('set insulation and reload', () => {
        cy.enableDesignRequirement('Insulation')
        cy.setInsulation("OvervoltageCategory", "OVC-IV")
        cy.reload()
        cy.checkInsulation("OvervoltageCategory", "OVC-IV")
    })


})
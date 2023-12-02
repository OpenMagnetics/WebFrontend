import '/cypress/support/designRequirementsCommands'
import '/cypress/support/storylineCommands'

describe('DesignRequirements', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_specification')
        cy.selectStorylineAdventure('designRequirements')
    })

    it('enable and disable all requirements', () => {
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Name', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'MagnetizingInductance', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'TurnsRatios', true)

        cy.enableDesignRequirement('MagneticSpecification', 'Insulation')
        cy.enableDesignRequirement('MagneticSpecification', 'LeakageInductance')
        cy.enableDesignRequirement('MagneticSpecification', 'StrayCapacitance')
        cy.enableDesignRequirement('MagneticSpecification', 'OperatingTemperature')
        cy.enableDesignRequirement('MagneticSpecification', 'MaximumWeight')
        cy.enableDesignRequirement('MagneticSpecification', 'MaximumDimensions')
        cy.enableDesignRequirement('MagneticSpecification', 'TerminalType')
        cy.enableDesignRequirement('MagneticSpecification', 'Topology')
        cy.enableDesignRequirement('MagneticSpecification', 'Market')

        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Insulation', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'LeakageInductance', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'StrayCapacitance', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'OperatingTemperature', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'MaximumWeight', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'MaximumDimensions', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'TerminalType', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Topology', true)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Market', true)

        cy.disableDesignRequirement('MagneticSpecification', 'Insulation')
        cy.disableDesignRequirement('MagneticSpecification', 'LeakageInductance')
        cy.disableDesignRequirement('MagneticSpecification', 'StrayCapacitance')
        cy.disableDesignRequirement('MagneticSpecification', 'OperatingTemperature')
        cy.disableDesignRequirement('MagneticSpecification', 'MaximumWeight')
        cy.disableDesignRequirement('MagneticSpecification', 'MaximumDimensions')
        cy.disableDesignRequirement('MagneticSpecification', 'TerminalType')
        cy.disableDesignRequirement('MagneticSpecification', 'Topology')
        cy.disableDesignRequirement('MagneticSpecification', 'Market')

        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Insulation', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'LeakageInductance', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'StrayCapacitance', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'OperatingTemperature', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'MaximumWeight', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'MaximumDimensions', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'TerminalType', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Topology', false)
        cy.checkDesignRequirementEnabled('MagneticSpecification', 'Market', false)
    })


    it('play around with the number of windings while reloading', () => {

        cy.enableDesignRequirement('MagneticSpecification', 'LeakageInductance')
        cy.enableDesignRequirement('MagneticSpecification', 'StrayCapacitance')
        cy.enableDesignRequirement('MagneticSpecification', 'TerminalType')

        for (var i = 0; i < 10; i++) {
            var numberWindingsLimit = Array.from({length: 12}, (_, i) => i + 1)

            const numberWindings = numberWindingsLimit[Math.floor(Math.random() * numberWindingsLimit.length)]
            cy.setNumberWindings('MagneticSpecification', numberWindings, true)
            cy.reload()
            cy.checkArrayRequirementLength('MagneticSpecification', "TurnsRatios", numberWindings - 1)
            cy.checkArrayRequirementLength('MagneticSpecification', "LeakageInductance", numberWindings - 1)
            cy.checkArrayRequirementLength('MagneticSpecification', "StrayCapacitance", numberWindings - 1)
            cy.checkArrayRequirementLength('MagneticSpecification', "TerminalType", numberWindings)
        }
    })

    it('set name and reload', () => {
        cy.setName('MagneticSpecification', "So long and thanks for the fish")
        cy.reload()
        cy.checkName('MagneticSpecification', "So long and thanks for the fish")
    })

    it('set maximum weight and reload', () => {
        cy.enableDesignRequirement('MagneticSpecification', 'MaximumWeight')
        cy.setMaximumWeight('MagneticSpecification', 42)
        cy.reload()
        cy.checkMaximumWeight('MagneticSpecification', 42)
    })

    it('set topology and reload', () => {
        cy.enableDesignRequirement('MagneticSpecification', 'Topology')
        cy.setTopology('MagneticSpecification', "Zeta Converter")
        cy.reload()
        cy.checkTopology('MagneticSpecification', "Zeta Converter")
    })

    it('set terminal type and reload', () => {
        cy.enableDesignRequirement('MagneticSpecification', 'TerminalType')
        cy.setTerminalType('MagneticSpecification', 0, "Screw")
        cy.reload()
        cy.checkTerminalType('MagneticSpecification', 0, "Screw")
    })

    it('set insulation and reload', () => {
        cy.enableDesignRequirement('MagneticSpecification', 'Insulation')
        cy.setInsulation('MagneticSpecification', "OvervoltageCategory", "OVC-IV")
        cy.reload()
        cy.checkInsulation('MagneticSpecification', "OvervoltageCategory", "OVC-IV")
    })


})
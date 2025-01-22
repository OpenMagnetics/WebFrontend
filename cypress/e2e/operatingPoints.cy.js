import '/cypress/support/operatingPointsCommands'
import '/cypress/support/designRequirementsCommands'
import '/cypress/support/storylineCommands'
import '/cypress/support/toolsCommands'

describe('OperatingPoints', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_specification')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('set operating point name', () => {
        cy.setOperatingPointName('MagneticSpecification', 0, "So long and thanks for the fish")
        cy.reload()
        cy.checkOperatingPointName('MagneticSpecification', 0, "So long and thanks for the fish")
    })

    it('add and remove operating point', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.reload()
        cy.removeOperatingPoint('MagneticSpecification', 1)
    })

    it('add operating point and select', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.reload()
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.checkOperatingPointIsSelected('MagneticSpecification', 1)
    })

    it('add operating point, modify, and delete', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Flyback Primary')
        cy.addOperatingPoint('MagneticSpecification')
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Custom')
        cy.setCurrentCustomData('MagneticSpecification', 'current', 0, 55)
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 2, 2)
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.removeOperatingPoint('MagneticSpecification', 1)
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.checkCurrentCustomData('MagneticSpecification', 'current', 0, 55)
        cy.checkCurrentCustomTime('MagneticSpecification', 'current', 2, 2)
    })

    it('add windings', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.modifyNumberWindings('MagneticSpecification')
        cy.setNumberWindings('MagneticSpecification', 3, false)
        cy.selectStorylineAdventure('operatingPoints')
        cy.checkWindingName('MagneticSpecification', 0, 0, "Primary")
        cy.checkWindingName('MagneticSpecification', 0, 1, "Secondary")
        cy.checkWindingName('MagneticSpecification', 0, 2, "Tertiary")
        cy.setWindingName('MagneticSpecification', 0, 0, "Chachi")
        cy.checkWindingName('MagneticSpecification', 0, 0, "Chachi")
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.checkWindingName('MagneticSpecification', 1, 0, "Chachi")
    })

    it('check error and canContinue', () => {
        cy.checkErrorMessages('MagneticSpecification', "")
        cy.addOperatingPoint('MagneticSpecification')
        cy.checkErrorMessages('MagneticSpecification', "")
        cy.modifyNumberWindings('MagneticSpecification')
        cy.setNumberWindings('MagneticSpecification', 2, false)
        cy.selectStorylineAdventure('operatingPoints')
        cy.checkErrorMessages('MagneticSpecification', "Missing waveforms for winding Secondary in operating point Op. Point No. 1.\nMissing waveforms for winding Secondary in operating point Op. Point No. 2.\n")
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.reflectWinding('MagneticSpecification', 1, 1)
        cy.checkErrorMessages('MagneticSpecification', "Missing waveforms for winding Secondary in operating point Op. Point No. 1.\n")
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.selectWinding('MagneticSpecification', 0, 1)
        cy.checkErrorMessages('MagneticSpecification', "")
        cy.nextTool('MagneticSpecification')
    })
})

describe('Data persistence', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_specification')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('check data stays after reloading', () => {
        cy.selectSelectedFrequencyUnit('MagneticSpecification', 'Hz')
        cy.setSelectedFrequency('MagneticSpecification', 123456)
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Sinusoidal')
        cy.setSelectedPeakToPeak('MagneticSpecification', 'current', 42)
        cy.setSelectedOffset('MagneticSpecification', 'current', 23)
        cy.setSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.setSelectedPeakToPeak('MagneticSpecification', 'voltage', 422)
        cy.setSelectedOffset('MagneticSpecification', 'voltage', 232)
        cy.reload()
        cy.checkSelectedFrequency('MagneticSpecification', 123.456)
        cy.checkSelectedFrequencyUnit('MagneticSpecification', 'kHz')
        cy.checkSelectedLabel('MagneticSpecification', 'current', 'Sinusoidal')
        cy.checkSelectedPeakToPeak('MagneticSpecification', 'current', 42)
        cy.checkSelectedOffset('MagneticSpecification', 'current', 23)
        cy.checkSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.checkSelectedPeakToPeak('MagneticSpecification', 'voltage', 422)
        cy.checkSelectedOffset('MagneticSpecification', 'voltage', 232)
    })

    it('add operating point and select, modify, and check persistence', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.reload()
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.setSelectedFrequency('MagneticSpecification', 123.456)
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.setSelectedFrequency('MagneticSpecification', 456.789)
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.checkSelectedFrequency('MagneticSpecification', 123.456)
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.checkSelectedFrequency('MagneticSpecification', 456.789)
    })

    it('add operating point and select, modify, and check persistence in custom', () => {
        cy.addOperatingPoint('MagneticSpecification')
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Flyback Primary')
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Custom')
        cy.setCurrentCustomData('MagneticSpecification', 'current', 0, 55)
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 1, 2)
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.setSelectedPeakToPeak('MagneticSpecification', 'current', 456.789)
        cy.selectOperatingPoint('MagneticSpecification', 1)
        cy.checkCurrentCustomData('MagneticSpecification', 'current', 0, 55)
        cy.checkCurrentCustomTime('MagneticSpecification', 'current', 1, 2)
        cy.selectOperatingPoint('MagneticSpecification', 0)
        cy.checkSelectedPeakToPeak('MagneticSpecification', 'current', 456.789)
    })
})


describe('Data change', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_specification')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('check duty cycle from field', () => {
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Triangular')
        cy.setSelectedDutyCycle('MagneticSpecification', 0.1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 0.1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 0.1)
        cy.checkSelectedOutputEffectiveFrequency('MagneticSpecification', 'current', 727)
        cy.setSelectedDutyCycle('MagneticSpecification', 10.1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 10.1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 10.1)
        cy.setSelectedDutyCycle('MagneticSpecification', 42)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 42)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 42)
        cy.setSelectedDutyCycle('MagneticSpecification', 50)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 50)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 50)
        cy.checkSelectedOutputEffectiveFrequency('MagneticSpecification', 'current', 111)
        cy.setSelectedDutyCycle('MagneticSpecification', 99.9)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 99.9)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 99.9)
        cy.checkSelectedOutputEffectiveFrequency('MagneticSpecification', 'current', 727)
    })

    it('check duty cycle from custom point', () => {
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Triangular')
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Custom')
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 1, 0.1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 1)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 1)
        cy.checkSelectedOutputEffectiveFrequency('MagneticSpecification', 'current', 565)
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 1, 1000)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 10)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 10)
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 1, 2.5)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 25)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 25)
        cy.setCurrentCustomTime('MagneticSpecification', 'current', 1, 9.99)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'current', 99)
        cy.checkSelectedOutputDutyCycle('MagneticSpecification', 'voltage', 99)
    })

    it('induce voltage', () => {
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Triangular')
        cy.induceVoltage('MagneticSpecification')
        cy.checkSelectedLabel('MagneticSpecification', 'voltage', "Rectangular")
        cy.checkSelectedOutputPeakToPeak('MagneticSpecification', 'voltage', 53.333)
        cy.checkSelectedPeakToPeak('MagneticSpecification', 'voltage', 53.333)
    })

    it('induce current', () => {
        cy.setSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.induceCurrent('MagneticSpecification')
        cy.checkSelectedLabel('MagneticSpecification', 'current', "Sinusoidal")
        cy.checkSelectedOutputPeakToPeak('MagneticSpecification', 'current', 1.6)
        cy.checkSelectedPeakToPeak('MagneticSpecification', 'current', 1.591)
    })

    it('check power', () => {
        cy.setSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.setSelectedPeakToPeak('MagneticSpecification', 'voltage', 50 * 2 * Math.sqrt(2))
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Sinusoidal')
        cy.setSelectedPeakToPeak('MagneticSpecification', 'current', 1 * 2 * Math.sqrt(2))
        cy.checkSelectedCombinetOutputInstantaneousPower('MagneticSpecification', 50)
        cy.checkSelectedCombinetOutputInstantaneousPower('MagneticSpecification', 50)
    })

    it('check reset', () => {
        cy.setSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Custom')
        cy.resetSelectedExcitation('MagneticSpecification')
        cy.checkSelectedLabel('MagneticSpecification', 'voltage', "Rectangular")
        cy.checkSelectedLabel('MagneticSpecification', 'current', "Triangular")
        cy.setSelectedLabel('MagneticSpecification', 'voltage', 'Sinusoidal')
        cy.setSelectedLabel('MagneticSpecification', 'current', 'Custom')
        cy.resetSelectedExcitation('MagneticSpecification')
        cy.checkSelectedLabel('MagneticSpecification', 'voltage', "Rectangular")
        cy.checkSelectedLabel('MagneticSpecification', 'current', "Triangular")
    })
})
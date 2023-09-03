import '/cypress/support/operatingPointsCommands'
import '/cypress/support/designRequirementsCommands'
import '/cypress/support/storylineCommands'
import '/cypress/support/toolsCommands'

describe('OperatingPoints', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_synthesis')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('set operating point name', () => {
        cy.setOperatingPointName(0, "So long and thanks for the fish")
        cy.reload()
        cy.checkOperatingPointName(0, "So long and thanks for the fish")
    })

    it('add and remove operating point', () => {
        cy.addOperatingPoint()
        cy.reload()
        cy.removeOperatingPoint(1)
    })

    it('add operating point and select', () => {
        cy.addOperatingPoint()
        cy.reload()
        cy.selectOperatingPoint(1)
        cy.checkOperatingPointIsSelected(1)
    })

    it('add operating point, modify, and delete', () => {
        cy.addOperatingPoint()
        cy.setSelectedLabel('current', 'Flyback Primary')
        cy.addOperatingPoint()
        cy.setSelectedLabel('current', 'Custom')
        cy.setCurrentCustomData('current', 0, 55)
        cy.setCurrentCustomTime('current', 2, 2)
        cy.selectOperatingPoint(0)
        cy.removeOperatingPoint(1)
        cy.selectOperatingPoint(1)
        cy.checkCurrentCustomData('current', 0, 55)
        cy.checkCurrentCustomTime('current', 2, 2)
    })

    it('add windings', () => {
        cy.addOperatingPoint()
        cy.modifyNumberWindings()
        cy.setNumberWindings(3, false)
        cy.selectStorylineAdventure('operatingPoints')
        cy.checkWindingName(0, 0, "Primary")
        cy.checkWindingName(0, 1, "Secondary")
        cy.checkWindingName(0, 2, "Tertiary")
        cy.setWindingName(0, 0, "Chachi")
        cy.checkWindingName(0, 0, "Chachi")
        cy.selectOperatingPoint(1)
        cy.checkWindingName(1, 0, "Chachi")
    })

    it('check error and canContinue', () => {
        cy.checkErrorMessages("")
        cy.addOperatingPoint()
        cy.checkErrorMessages("")
        cy.modifyNumberWindings()
        cy.setNumberWindings(2, false)
        cy.selectStorylineAdventure('operatingPoints')
        cy.checkErrorMessages("Missing waveforms for winding Secondary in operating point Operating Point No. 1.\nMissing waveforms for winding Secondary in operating point Operating Point No. 2.\n")
        cy.selectOperatingPoint(1)
        cy.reflectWinding(1, 1)
        cy.checkErrorMessages("Missing waveforms for winding Secondary in operating point Operating Point No. 1.\n")
        cy.selectOperatingPoint(0)
        cy.selectWinding(0, 1)
        cy.checkErrorMessages("")
        cy.nextTool()
    })
})

describe('Data persistence', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_synthesis')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('check data stays after reloading', () => {
        cy.selectSelectedFrequencyUnit('Hz')
        cy.setSelectedFrequency(123456)
        cy.setSelectedLabel('current', 'Sinusoidal')
        cy.setSelectedPeakToPeak('current', 42)
        cy.setSelectedOffset('current', 23)
        cy.setSelectedLabel('voltage', 'Sinusoidal')
        cy.setSelectedPeakToPeak('voltage', 422)
        cy.setSelectedOffset('voltage', 232)
        cy.reload()
        cy.checkSelectedFrequency(123.456)
        cy.checkSelectedFrequencyUnit('kHz')
        cy.checkSelectedLabel('current', 'Sinusoidal')
        cy.checkSelectedPeakToPeak('current', 42)
        cy.checkSelectedOffset('current', 23)
        cy.checkSelectedLabel('voltage', 'Sinusoidal')
        cy.checkSelectedPeakToPeak('voltage', 422)
        cy.checkSelectedOffset('voltage', 232)
    })

    it('add operating point and select, modify, and check persistence', () => {
        cy.addOperatingPoint()
        cy.reload()
        cy.selectOperatingPoint(1)
        cy.setSelectedFrequency(123.456)
        cy.selectOperatingPoint(0)
        cy.setSelectedFrequency(456.789)
        cy.selectOperatingPoint(1)
        cy.checkSelectedFrequency(123.456)
        cy.selectOperatingPoint(0)
        cy.checkSelectedFrequency(456.789)
    })

    it('add operating point and select, modify, and check persistence in custom', () => {
        cy.addOperatingPoint()
        cy.selectOperatingPoint(0)
        cy.setSelectedLabel('current', 'Flyback Primary')
        cy.selectOperatingPoint(1)
        cy.setSelectedLabel('current', 'Custom')
        cy.setCurrentCustomData('current', 0, 55)
        cy.setCurrentCustomTime('current', 1, 2)
        cy.selectOperatingPoint(0)
        cy.setSelectedPeakToPeak('current', 456.789)
        cy.selectOperatingPoint(1)
        cy.checkCurrentCustomData('current', 0, 55)
        cy.checkCurrentCustomTime('current', 1, 2)
        cy.selectOperatingPoint(0)
        cy.checkSelectedPeakToPeak('current', 456.789)
    })
})


describe('Data change', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_synthesis')
        cy.selectStorylineAdventure('operatingPoints')
    })

    it('check duty cycle from field', () => {
        cy.setSelectedLabel('current', 'Triangular')
        cy.setSelectedDutyCycle(0.1)
        cy.checkSelectedOutputDutyCycle('current', 0.1)
        cy.checkSelectedOutputDutyCycle('voltage', 0.1)
        cy.checkSelectedOutputEffectiveFrequency('current', 727)
        cy.setSelectedDutyCycle(10.1)
        cy.checkSelectedOutputDutyCycle('current', 10.1)
        cy.checkSelectedOutputDutyCycle('voltage', 10.1)
        cy.setSelectedDutyCycle(42)
        cy.checkSelectedOutputDutyCycle('current', 42)
        cy.checkSelectedOutputDutyCycle('voltage', 42)
        cy.setSelectedDutyCycle(50)
        cy.checkSelectedOutputDutyCycle('current', 50)
        cy.checkSelectedOutputDutyCycle('voltage', 50)
        cy.checkSelectedOutputEffectiveFrequency('current', 111)
        cy.setSelectedDutyCycle(99.9)
        cy.checkSelectedOutputDutyCycle('current', 99.9)
        cy.checkSelectedOutputDutyCycle('voltage', 99.9)
        cy.checkSelectedOutputEffectiveFrequency('current', 727)
    })

    it('check duty cycle from custom point', () => {
        cy.setSelectedLabel('current', 'Triangular')
        cy.setSelectedLabel('current', 'Custom')
        cy.setCurrentCustomTime('current', 1, 0.1)
        cy.checkSelectedOutputDutyCycle('current', 1)
        cy.checkSelectedOutputDutyCycle('voltage', 1)
        cy.checkSelectedOutputEffectiveFrequency('current', 565)
        cy.setCurrentCustomTime('current', 1, 1000)
        cy.checkSelectedOutputDutyCycle('current', 10)
        cy.checkSelectedOutputDutyCycle('voltage', 10)
        cy.setCurrentCustomTime('current', 1, 2.5)
        cy.checkSelectedOutputDutyCycle('current', 25)
        cy.checkSelectedOutputDutyCycle('voltage', 25)
        cy.setCurrentCustomTime('current', 1, 9.99)
        cy.checkSelectedOutputDutyCycle('current', 99)
        cy.checkSelectedOutputDutyCycle('voltage', 99)
    })

    it('induce voltage', () => {
        cy.setSelectedLabel('current', 'Triangular')
        cy.induceVoltage()
        cy.checkSelectedLabel('voltage', "Rectangular")
        cy.checkSelectedOutputPeakToPeak('voltage', 53.333)
        cy.checkSelectedPeakToPeak('voltage', 53.333)
    })

    it('induce current', () => {
        cy.setSelectedLabel('voltage', 'Sinusoidal')
        cy.induceCurrent()
        cy.checkSelectedLabel('current', "Sinusoidal")
        cy.checkSelectedOutputPeakToPeak('current', 1.6)
        cy.checkSelectedPeakToPeak('current', 1.591)
    })

    it('check power', () => {
        cy.setSelectedLabel('voltage', 'Sinusoidal')
        cy.setSelectedPeakToPeak('voltage', 50 * 2 * Math.sqrt(2))
        cy.setSelectedLabel('current', 'Sinusoidal')
        cy.setSelectedPeakToPeak('current', 1 * 2 * Math.sqrt(2))
        cy.checkSelectedCombinetOutputInstantaneousPower(50)
        cy.checkSelectedCombinetOutputInstantaneousPower(50)
    })

    it('check reset', () => {
        cy.setSelectedLabel('voltage', 'Sinusoidal')
        cy.setSelectedLabel('current', 'Custom')
        cy.resetSelectedExcitation()
        cy.checkSelectedLabel('voltage', "Rectangular")
        cy.checkSelectedLabel('current', "Triangular")
        cy.setSelectedLabel('voltage', 'Sinusoidal')
        cy.setSelectedLabel('current', 'Custom')
        cy.resetSelectedExcitation()
        cy.checkSelectedLabel('voltage', "Rectangular")
        cy.checkSelectedLabel('current', "Triangular")
    })
})
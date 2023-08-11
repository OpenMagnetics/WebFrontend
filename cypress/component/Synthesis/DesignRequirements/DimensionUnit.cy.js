import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'

const dimensionUnitValuesAll = [
    "pAlf",
    "nAlf",
    "uAlf",
    "mAlf",
    "Alf",
    "kAlf",
    "MAlf",
    "GAlf"
]

const dimensionUnitValuesReduced = [
    "Alf",
    "kAlf",
]

describe('DimensionUnit.cy.js', () => {
    it('reduced dropdown', () => {
        const unit = "Alf";
        const modelValue = 10;
        const min = 1;
        const max = 12000;
        cy.mount(DimensionUnit, {
            props: {
                unit: unit,
                modelValue: modelValue,
                min: min,
                max: max,
            },
        })

        cy.get('select').find('option').then(options => {
          const actual = [...options].map(o => o.text)
          expect(actual).to.deep.eq(dimensionUnitValuesReduced)
        })

        cy.get('select').select('kAlf')
        cy.get('select option:selected').should('have.text', 'kAlf')
    })

    it('Iterate dropdown and validate', function() {
        const unit = "Alf";
        cy.mount(DimensionUnit, {
            props: {
                unit: unit,
            },
        })

        cy.get('select').find('option').then(options => {
          const actual = [...options].map(o => o.text)
          expect(actual).to.deep.eq(dimensionUnitValuesAll)
        })
    })
})


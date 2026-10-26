<script setup>
import { ref } from 'vue'
import { useMasStore } from '../../stores/mas'
import { toTitleCase, toPascalCase, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { tooltipsMagneticSynthesisDesignRequirements } from 'WebSharedComponents/assets/js/texts.js'
import { defaultDesignRequirements, defaultOperatingPointExcitation, compulsoryRequirements, designRequirementsOrdered, isolationSideOrdered, IsolationSideOrdered, minimumMaximumScalePerParameter} from 'WebSharedComponents/assets/js/defaults.js'
import { Market, ConnectionType, Topology, WiringTechnology, IsolationSide } from 'WebSharedComponents/assets/ts/MAS.ts'
import Insulation from './DesignRequirements/Insulation.vue'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'
import MaximumDimensions from './DesignRequirements/MaximumDimensions.vue'
import Impedances from './DesignRequirements/Impedances.vue'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ElementFromListRadio from 'WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ArrayDimensionWithTolerance from './DesignRequirements/ArrayDimensionWithTolerance.vue'
import ElementFromList from 'WebSharedComponents/DataInput/ElementFromList.vue'
import ArrayElementFromList from './DesignRequirements/ArrayElementFromList.vue'
import Name from './DesignRequirements/Name.vue'
</script>
<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        var numberWindings = 1;
        if (masStore.mas.inputs.designRequirements.turnsRatios != null) {
            numberWindings = masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
        }
        const numberWindingsAux = {
            numberWindings: numberWindings
        }
        const wiringTechnologyOptions = {
            "Planar": WiringTechnology.Printed,
            "Wound": WiringTechnology.Wound,
        }

        return {
            numberWindingsAux,
            masStore,
            wiringTechnologyOptions,
        }
    },
    computed: {
        topologyLabels() {
            const out = {};
            Object.values(Topology).forEach(v => {
                // camelCase → "Camel Case"
                out[v] = v.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
            });
            return out;
        },
        marketLabels() {
            const out = {};
            Object.values(Market).forEach(v => { out[v] = v.charAt(0).toUpperCase() + v.slice(1); });
            return out;
        },
        connectionTypeLabels() {
            return {
                flyingLead: 'Flying Lead',
                pcbPad: 'PCB Pad',
                pin: 'Pin',
                smt: 'SMT',
                screw: 'Screw',
                tht: 'THT',
            };
        },
        isolationSideLabels() {
            const out = {};
            Object.values(IsolationSide).forEach(v => { out[v] = v.charAt(0).toUpperCase() + v.slice(1); });
            return out;
        },
        getNumberPossibleWindings() {
            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                return Array.from({length: 12}, (_, i) => i + 1);
            }
            else if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                return [2, 3];
            }
            return Array.from({length: 12}, (_, i) => i + 1);
        },
        // Full, untruncated names, for the title attribute. Web bug report #172, "For
        // inductor design, input for Temp is missing": it is not missing, it is called
        // "Operating Temperature" and the responsive shortener was rendering it as
        // "Opera. Tempe." -- at which point nobody scanning for "Temp" finds it. The
        // shortening below is still useful on a narrow window, but a truncated word must
        // always be recoverable by hovering, and it must stay recognisable.
        fullLabels() {
            const fullLabels = {"numberWindings": "Number of Windings"};
            designRequirementsOrdered[this.$stateStore.getCurrentApplication()].forEach((value) => {
                fullLabels[value] = toTitleCase(value);
            })
            return fullLabels
        },
        // The requirement index groups requirements by kind so the optional
        // ones can be found by what they constrain. The required ones come
        // first, in their own group. A requirement the application lists but
        // no kind claims still appears, under "Other": nothing is ever left
        // off the index.
        requirementGroups() {
            const application = this.$stateStore.getCurrentApplication();
            const ordered = designRequirementsOrdered[application];
            const compulsory = compulsoryRequirements[application];
            const kinds = [
                {key: 'electrical', title: 'Electrical', icon: 'pi pi-bolt',
                 members: ['magnetizingInductance', 'minimumImpedance', 'turnsRatios', 'leakageInductance', 'strayCapacitance']},
                {key: 'safety', title: 'Insulation and safety', icon: 'pi pi-shield',
                 members: ['insulation', 'isolationSides']},
                {key: 'construction', title: 'Construction', icon: 'pi pi-box',
                 members: ['numberWindings', 'wiringTechnology', 'terminalType', 'maximumDimensions', 'maximumWeight']},
                {key: 'application', title: 'Application', icon: 'pi pi-globe',
                 members: ['operatingTemperature', 'topology', 'market']},
            ];
            const groups = [{key: 'required', title: 'Required', icon: 'pi pi-lock',
                             members: ordered.filter((name) => compulsory.includes(name))}];
            const optional = ordered.filter((name) => !compulsory.includes(name));
            kinds.forEach((kind) => {
                const members = optional.filter((name) => kind.members.includes(name));
                if (members.length > 0) {
                    groups.push({...kind, members});
                }
            });
            const claimed = kinds.flatMap((kind) => kind.members);
            const unclaimed = optional.filter((name) => !claimed.includes(name));
            if (unclaimed.length > 0) {
                groups.push({key: 'other', title: 'Other', icon: 'pi pi-ellipsis-h', members: unclaimed});
            }
            return groups;
        },
        optionalRequirements() {
            const application = this.$stateStore.getCurrentApplication();
            return designRequirementsOrdered[application].filter((name) => !compulsoryRequirements[application].includes(name));
        },
        activeOptionalCount() {
            return this.optionalRequirements.filter((name) => this.isActive(name)).length;
        },

    },
    created () {
        for (var i = 0; i < this.masStore.mas.inputs.designRequirements.turnsRatios[i] + 1; i++) {
            if (i < this.masStore.mas.magnetic.coil.functionalDescription.length) {
                newElementsCoil.push(this.masStore.mas.magnetic.coil.functionalDescription[i]);
            }
            else {
                newElementsCoil.push({'name': toTitleCase(isolationSideOrdered[i])});
            }
        }
    },
    mounted () {
        this.masStore.$subscribe((mutation, state) => {
            this.emitCanContinue(state);
        })
        this.emitCanContinue(this.masStore);


    },
    methods: {
        emitCanContinue(store) {
            // The Continue button used to receive a bare boolean, so when it
            // flipped to "Fix Errors" the user had no way to find out WHICH
            // requirement was incomplete. Send the reasons along with the
            // verdict; the sidebar renders them under Actions.
            const errors = this.validationErrors(store);
            this.$emit("canContinue", errors.length == 0, errors);
        },
        // Every reason the Continue button is blocked, as user-facing text.
        // Derived from the store on each mutation, so it can never go stale.
        validationErrors(store) {
            const errors = [];
            const designRequirements = store.mas.inputs.designRequirements;

            if (designRequirements.name == '') {
                errors.push("The design has no name. Give it one at the top of the Configuration panel.");
            }

            if (designRequirements.magnetizingInductance == null) {
                errors.push("Magnetizing Inductance is required. Add it from the Requirements list on the left.");
            }
            else if (designRequirements.magnetizingInductance.minimum == null &&
                     designRequirements.magnetizingInductance.nominal == null &&
                     designRequirements.magnetizingInductance.maximum == null) {
                errors.push("Magnetizing Inductance has no value. Set a minimum, nominal or maximum.");
            }

            for (var index in designRequirements.turnsRatios) {
                const turnsRatio = designRequirements.turnsRatios[index];
                if (turnsRatio.minimum == null && turnsRatio.nominal == null && turnsRatio.maximum == null) {
                    errors.push("Turns ratio for " + this.windingLabel(store, Number(index) + 1) +
                                " has no value. Set a minimum, nominal or maximum.");
                }
            }

            return errors;
        },
        // Name the winding the way the turns-ratio rows label it, so the error
        // text points at a row the user can actually see.
        windingLabel(store, windingIndex) {
            const winding = store.mas.magnetic.coil.functionalDescription[windingIndex];
            if (winding != null && winding.name != null) {
                return winding.name;
            }
            return toTitleCase(isolationSideOrdered[windingIndex]);
        },
        isRequired(requirementName) {
            return compulsoryRequirements[this.$stateStore.getCurrentApplication()].includes(requirementName);
        },
        isActive(requirementName) {
            return this.masStore.mas.inputs.designRequirements[requirementName] != null;
        },
        // The index row's click: the same toggle as before, then, when a
        // requirement was added, bring its editor into view and mark it once.
        toggleRequirement(requirementName) {
            this.requirementButtonClicked(requirementName);
            if (!this.isActive(requirementName)) {
                return;
            }
            this.$nextTick(() => {
                const cell = this.$el.querySelector(`[data-requirement="${requirementName}"]`);
                if (cell == null) {
                    return;
                }
                const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                cell.scrollIntoView({block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth'});
                cell.classList.remove('dr-cell-arrived');
                void cell.offsetWidth;
                cell.classList.add('dr-cell-arrived');
            });
        },
        requirementButtonClicked(requirementName) {
            if (this.masStore.mas.inputs.designRequirements[requirementName] == null) {
                this.masStore.mas.inputs.designRequirements[requirementName] = defaultDesignRequirements[requirementName];
            }
            else {
                this.masStore.mas.inputs.designRequirements[requirementName] = null;
            }
        },
        updatedNumberElements(newLength, name) {
            if (name == 'numberWindings') {
                const newElementsCoil = [];
                const newElementsTurnsRatios = [];
                for (var i = 0; i < newLength - 1; i++) {
                    if (i < this.masStore.mas.inputs.designRequirements.turnsRatios.length) {
                        newElementsTurnsRatios.push(this.masStore.mas.inputs.designRequirements.turnsRatios[i]);
                    }
                    else {
                        newElementsTurnsRatios.push({'nominal': 1});
                    }
                }
                for (var i = 0; i < newLength; i++) {
                    if (i < this.masStore.mas.magnetic.coil.functionalDescription.length) {
                        newElementsCoil.push(this.masStore.mas.magnetic.coil.functionalDescription[i]);
                    }
                    else {
                        newElementsCoil.push({'name': toTitleCase(isolationSideOrdered[i])});
                    }
                }
                for (var operationPointIndex = 0; operationPointIndex < this.masStore.mas.inputs.operatingPoints.length; operationPointIndex++) {
                    const newExcitationsPerWinding = [];

                    for (var i = 0; i < newLength; i++) {
                        if (i < this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding.length) {
                            newExcitationsPerWinding.push(this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding[i]);
                        }
                        else {
                            // Seed the new winding in EVERY operating point, as initialization
                            // does. A null here made the Op. Points page crash when another
                            // operating point was selected, and the saved file would not load
                            // again (user report #181). The seed counts as 'not defined yet'
                            // until the user opens the winding, so nothing is designed from it.
                            newExcitationsPerWinding.push(deepCopy(defaultOperatingPointExcitation));
                        }
                    }
                    this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding = newExcitationsPerWinding;
                }

                this.masStore.mas.inputs.designRequirements.turnsRatios = newElementsTurnsRatios;
                this.masStore.mas.magnetic.coil.functionalDescription = newElementsCoil;
                this.masStore.updatedTurnsRatios();
            }
        },
        hasError() {
            // A child input rejected its own value (out of order, empty, <= 0).
            // The child renders the detail inline in red; the store never took
            // the bad value, so validationErrors() cannot see it. Say where to
            // look rather than blocking with a silent button.
            this.$emit("canContinue", false, ["A requirement has an invalid value. Check the fields marked in red in the Configuration panel."]);
        },
        updatedIsolationSides(value, index) {
            this.masStore.mas.magnetic.coil.functionalDescription[index].isolationSide = value;
        },
        updatedWiringTechnologies(value, index) {
            if (this.masStore.mas.magnetic.coil.turnsDescription != null) {
                if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                    this.masStore.resetMagnetic("power");
                }
                if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                    this.masStore.resetMagnetic("filter");
                }
            }
        },
    }
}
</script>


<template>
    <div class="dr-container">
        <div class="dr-layout">
            <!-- Left: the requirement index. Every requirement the application
                 knows is listed once, grouped by kind; each row IS the add /
                 remove control, so it carries the data-cy the tests use. The
                 pin glyphs sit on a vertical bus: a filled pin is a requirement
                 connected to the design, a hollow one is available. -->
            <aside class="dr-list-panel" aria-label="Requirements">
                <div class="dr-rail-head">
                    <h2 class="dr-rail-title">Requirements</h2>
                    <p class="dr-rail-count">
                        {{ activeOptionalCount }} of {{ optionalRequirements.length }} optional added
                    </p>
                </div>
                <div class="dr-group"
                     v-for="group in requirementGroups"
                     :key="group.key"
                     :class="{'dr-group-required': group.key == 'required'}">
                    <h3 class="dr-group-title">
                        <i :class="group.icon" aria-hidden="true"></i>
                        <span>{{ group.title }}</span>
                    </h3>
                    <ul class="dr-bus">
                        <li v-for="requirementName in group.members"
                            :key="requirementName"
                            v-tooltip="tooltipsMagneticSynthesisDesignRequirements[requirementName]">
                            <button
                                v-if="isRequired(requirementName)"
                                :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-required-button'"
                                class="dr-req dr-req-required"
                                :title="fullLabels[requirementName]"
                                disabled>
                                <span class="dr-pin" aria-hidden="true"><i class="pi pi-lock"></i></span>
                                <span class="dr-req-label">{{ fullLabels[requirementName] }}</span>
                                <span v-if="requirementName == 'turnsRatios' && masStore.mas.inputs.designRequirements.turnsRatios.length == 0" class="dr-req-state">Needs 2+ windings</span>
                            </button>
                            <button
                                v-else
                                :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-add-remove-button'"
                                :class="['dr-req', isActive(requirementName) ? 'dr-req-on' : 'dr-req-off']"
                                :title="fullLabels[requirementName]"
                                :aria-pressed="isActive(requirementName) ? 'true' : 'false'"
                                @click="toggleRequirement(requirementName)">
                                <span class="dr-pin" aria-hidden="true">
                                    <i v-if="isActive(requirementName)" class="pi pi-check"></i>
                                </span>
                                <span class="dr-req-label">{{ fullLabels[requirementName] }}</span>
                                <span class="dr-req-action">
                                    <i :class="isActive(requirementName) ? 'pi pi-times' : 'pi pi-plus'" aria-hidden="true"></i>
                                    <span>{{ isActive(requirementName) ? 'Remove' : 'Add' }}</span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>
            </aside>

            <!-- Right: the specification sheet. One panel, ruled into cells
                 like a datasheet's parameter table; each cell is one
                 requirement's editor. Required cells carry the teal marker. -->
            <div class="dr-detail-panel">
                <div class="dr-sheet">
<!--                 <Name class="border-top-1 border-bottom-1 border-solid border-300 py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    :name="'name'"
                    :dataTestLabel="dataTestLabel + '-Name'"
                    :defaultValue="defaultDesignRequirements.name"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                /> -->

                <section class="dr-cell dr-detail-body dr-cell-required" data-requirement="numberWindings">
                    <span class="dr-cell-flag"><i class="pi pi-lock" aria-hidden="true"></i>Required</span>
                    <ElementFromList class="border-top-1 border-bottom-1 border-solid border-300 py-2 pl-4"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'numberWindings'"
                        :dataTestLabel="dataTestLabel + '-NumberWindings'"
                        :options="getNumberPossibleWindings"
                        :titleSameRow="false"
                        :justifyContent="true"
                        :labelWidthProportionClass="'col-12 md:col-7'"
                        :selectStyleClass="'col-12 md:col-5'"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        v-model="numberWindingsAux"
                        @update="updatedNumberElements"
                    />

                    <ArrayDimensionWithTolerance class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        v-if="!masStore.hasMirroredWindings && masStore.mas.inputs.designRequirements.turnsRatios != null && masStore.mas.inputs.designRequirements.turnsRatios.length > 0"
                        :name="'turnsRatios'"
                        :dataTestLabel="dataTestLabel + '-TurnsRatios'"
                        :defaultField="'nominal'"
                        :defaultValue="{'nominal': 1}"
                        :disabledScaling="true"
                        :maximumNumberElements="12"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @hasError="hasError"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.magnetizingInductance != null"
                    :class="{'dr-cell-required': isRequired('magnetizingInductance')}"
                    data-requirement="magnetizingInductance">
                    <span v-if="isRequired('magnetizingInductance')" class="dr-cell-flag"><i class="pi pi-lock" aria-hidden="true"></i>Required</span>
                    <DimensionWithTolerance class="border-bottom-1 border-solid border-300 py-2 pl-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'magnetizingInductance'"
                        unit="H"
                        :dataTestLabel="dataTestLabel + '-MagnetizingInductance'"
                        :defaultValue="defaultDesignRequirements.magnetizingInductance"
                        :defaultField="'minimum'"
                        :min="minimumMaximumScalePerParameter['inductance']['min']"
                        :max="minimumMaximumScalePerParameter['inductance']['max']"
                        v-model="masStore.mas.inputs.designRequirements.magnetizingInductance"

                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @hasError="hasError"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.minimumImpedance != null"
                    :class="{'dr-cell-required': isRequired('minimumImpedance')}"
                    data-requirement="minimumImpedance">
                    <span v-if="isRequired('minimumImpedance')" class="dr-cell-flag"><i class="pi pi-lock" aria-hidden="true"></i>Required</span>
                    <Impedances class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :dataTestLabel="dataTestLabel + '-MinimumImpedance'"
                        :addElementButtonColor="$styleStore.designRequirements.addElementButtonColor"
                        :removeElementButtonColor="$styleStore.designRequirements.removeElementButtonColor"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"

                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="!masStore.hasMirroredWindings && masStore.mas.inputs.designRequirements.wiringTechnology != null"
                    data-requirement="wiringTechnology">
                    <ElementFromListRadio class="border-bottom-1 border-solid border-300 py-2 pl-4"
                        :name="'wiringTechnology'"
                        :dataTestLabel="dataTestLabel + '-WiringTechnology'"
                        :options="wiringTechnologyOptions"
                        :titleSameRow="false"
                        v-model="masStore.mas.inputs.designRequirements"
                        :labelWidthProportionClass="'col-5'"
                        :valueWidthProportionClass="'col-3'"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @update="updatedWiringTechnologies"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.leakageInductance != null"
                    data-requirement="leakageInductance">
                    <ArrayDimensionWithTolerance class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'leakageInductance'"
                        unit="H"
                        :dataTestLabel="dataTestLabel + '-LeakageInductance'"
                        :defaultField="'maximum'"
                        :defaultValue="defaultDesignRequirements.leakageInductance[0]"
                        :allowAllNull="true"
                        :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"
                        :min="minimumMaximumScalePerParameter['leakageInductance']['min']"
                        :max="minimumMaximumScalePerParameter['leakageInductance']['max']"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @hasError="hasError"
                    />
                    <p v-if="masStore.mas.inputs.designRequirements.turnsRatios.length == 0" class="dr-cell-note">
                        Leakage inductance is set per secondary winding. Raise Number of Windings to enter it.
                    </p>
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.strayCapacitance != null"
                    data-requirement="strayCapacitance">
                    <ArrayDimensionWithTolerance class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'strayCapacitance'"
                        unit="F"
                        :dataTestLabel="dataTestLabel + '-StrayCapacitance'"
                        :defaultField="'maximum'"
                        :defaultValue="defaultDesignRequirements.strayCapacitance[0]"
                        :allowAllNull="true"
                        :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"
                        :min="minimumMaximumScalePerParameter['strayCapacitance']['min']"
                        :max="minimumMaximumScalePerParameter['strayCapacitance']['max']"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @hasError="hasError"
                    />
                    <p v-if="masStore.mas.inputs.designRequirements.turnsRatios.length == 0" class="dr-cell-note">
                        Stray capacitance is set per secondary winding. Raise Number of Windings to enter it.
                    </p>
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.operatingTemperature != null"
                    data-requirement="operatingTemperature">
                    <DimensionWithTolerance class="border-bottom-1 border-solid border-300 py-2 pl-3"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'operatingTemperature'"
                        unit="°C"
                        :dataTestLabel="dataTestLabel + '-OperatingTemperature'"
                        :allowNegative="true"
                        :min="minimumMaximumScalePerParameter['temperature']['min']"
                        :max="minimumMaximumScalePerParameter['temperature']['max']"
                        :defaultValue="defaultDesignRequirements.operatingTemperature"
                        v-model="masStore.mas.inputs.designRequirements.operatingTemperature"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @hasError="hasError"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.maximumWeight != null"
                    data-requirement="maximumWeight">
                    <Dimension class="border-bottom-1 border-solid border-300 py-2 pl-4"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'maximumWeight'"
                        unit="g"
                        :dataTestLabel="dataTestLabel + '-MaximumWeight'"
                        :min="minimumMaximumScalePerParameter['weight']['min']"
                        :max="minimumMaximumScalePerParameter['weight']['max']"
                        :defaultValue="300"
                        :justifyContent="true"
                        :labelWidthProportionClass="'col-12 md:col-7'"
                        :valueWidthProportionClass="'col-12 md:col-5'"
                        v-model="masStore.mas.inputs.designRequirements"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.maximumDimensions != null"
                    data-requirement="maximumDimensions">
                    <MaximumDimensions class="border-bottom-1 border-solid border-300 py-2 pl-4"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        unit="m"
                        :dataTestLabel="dataTestLabel + '-MaximumDimensions'"
                        :min="minimumMaximumScalePerParameter['dimension']['min']"
                        :max="minimumMaximumScalePerParameter['dimension']['max']"
                        :defaultValue="defaultDesignRequirements.maximumDimensions"
                        v-model="masStore.mas.inputs.designRequirements.maximumDimensions"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.terminalType != null"
                    data-requirement="terminalType">
                    <ArrayElementFromList class="border-bottom-1 border-solid border-300 py-2 pl-0"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'terminalType'"
                        :dataTestLabel="dataTestLabel + '-TerminalType'"
                        :defaultValue="new Array(Object.keys(ConnectionType).length).fill(ConnectionType.FlyingLead)"
                        :options="Object.values(ConnectionType)"
                        :optionLabels="connectionTypeLabels"
                        :titleSameRow="false"
                        :justifyContent="false"
                        :labelWidthProportionClass="'col-12 md:col-3'"
                        :selectStyleClass="'col-12 md:col-4'"
                        :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"
                        v-model="masStore.mas.inputs.designRequirements"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.isolationSides != null"
                    data-requirement="isolationSides">
                    <ArrayElementFromList class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'isolationSides'"
                        :dataTestLabel="dataTestLabel + '-IsolationSides'"
                        :defaultValue="Object.keys(IsolationSideOrdered)"
                        :options="IsolationSideOrdered"
                        :optionLabels="isolationSideLabels"
                        :titleSameRow="false"
                        :justifyContent="false"
                        :labelWidthProportionClass="'col-12 md:col-3'"
                        :selectStyleClass="'col-12 md:col-4'"
                        :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"
                        v-model="masStore.mas.inputs.designRequirements"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                        @update="updatedIsolationSides"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.topology != null"
                    data-requirement="topology">
                    <ElementFromList class="border-bottom-1 border-solid border-300 py-2 pl-4"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'topology'"
                        :dataTestLabel="dataTestLabel + '-Topology'"
                        :options="Object.values(Topology)"
                        :optionLabels="topologyLabels"
                        :titleSameRow="false"
                        :justifyContent="true"
                        :labelWidthProportionClass="'col-12 md:col-7'"
                        :selectStyleClass="'col-12 md:col-5'"
                        v-model="masStore.mas.inputs.designRequirements"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <section class="dr-cell dr-detail-body"
                    v-if="masStore.mas.inputs.designRequirements.market != null"
                    data-requirement="market">
                    <ElementFromList class="border-bottom-1 border-solid border-300 py-2 pl-4"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :name="'market'"
                        :dataTestLabel="dataTestLabel + '-Market'"
                        :options="Object.values(Market)"
                        :optionLabels="marketLabels"
                        :titleSameRow="false"
                        :justifyContent="true"
                        :labelWidthProportionClass="'col-12 md:col-7'"
                        :selectStyleClass="'col-12 md:col-5'"
                        v-model="masStore.mas.inputs.designRequirements"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <section class="dr-cell dr-detail-body dr-cell-wide"
                    v-if="masStore.mas.inputs.designRequirements.insulation != null"
                    data-requirement="insulation">
                    <Insulation class="border-bottom-1 border-solid border-300 py-2"
                        :style = "$styleStore.designRequirements.inputBorderColor"
                        :dataTestLabel="dataTestLabel + '-Insulation'"
                        :defaultValue="defaultDesignRequirements.insulation"
                        v-model="masStore.mas.inputs.designRequirements"
                        :addButtonStyle="$styleStore.designRequirements.requirementButton"
                        :valueFontSize="$styleStore.designRequirements.inputFontSize"
                        :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                        :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                        :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                        :textColor="$styleStore.designRequirements.inputTextColor"
                    />
                </section>

                <p v-if="activeOptionalCount == 0" class="dr-cell dr-cell-wide dr-sheet-hint">
                    Only the required values are set. Add a requirement from the list to narrow the designs the advisers propose.
                </p>
                </div>
            </div>
        </div>
    </div>
</template>


<style scoped>
.dr-container {
    /* Panel and text tones are set for contrast: body text >= 4.5:1 on the
       lightest point of the panel gradient. */
    --dr-panel-1: color-mix(in srgb, var(--p-light) 45%, var(--p-dark) 55%);
    --dr-panel-2: var(--p-dark);
    /* Field outlines: >= 3:1 against the panel (WCAG non-text contrast), so the
       fields read as fields and not as a darker patch of the panel. */
    --dr-field-border: color-mix(in srgb, var(--p-white) 45%, var(--p-light));
    --dr-border: rgba(var(--p-white-rgb), 0.1);
    --dr-rule: rgba(var(--p-white-rgb), 0.08);
    --dr-text: var(--p-white);
    --dr-muted: rgba(var(--p-white-rgb), 0.76);
    --dr-faint: rgba(var(--p-white-rgb), 0.64);
    /* Teal for small text: the theme teal is for titles and marks; at 12 px it
       needs a lighter tone to stay legible. */
    --dr-accent-text: color-mix(in srgb, var(--p-primary) 70%, var(--p-white) 30%);
    --dr-bus-x: 1.05rem;

    padding: 0.5rem 0.75rem 1.5rem;
    color: var(--dr-text);
    /* GenericTool's column is text-center; a form reads from the left. */
    text-align: left;
}

.dr-layout {
    display: grid;
    grid-template-columns: 19.5rem minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
}

/* ============ Shared panel (the house look: MagneticAdviser .optim-panel) ============ */
.dr-list-panel,
.dr-detail-panel {
    background: linear-gradient(180deg, var(--dr-panel-1) 0%, var(--dr-panel-2) 100%);
    border: 1px solid var(--dr-border);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(var(--p-black-rgb), 0.5),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
}

/* ============ Requirement index ============ */
.dr-list-panel {
    padding: 1rem 0.75rem 0.75rem 0.85rem;
}

.dr-rail-head {
    padding: 0 0.25rem 0.85rem;
    margin-bottom: 0.35rem;
    border-bottom: 1px solid var(--dr-rule);
}

.dr-rail-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--p-primary);
}

.dr-rail-count {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--dr-muted);
    font-variant-numeric: tabular-nums;
}

.dr-group {
    padding-top: 0.7rem;
}

.dr-group-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.2rem;
    padding-left: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--dr-muted);
}

.dr-group-title i {
    font-size: 0.78rem;
    color: rgba(var(--p-primary-rgb), 0.85);
}

/* The bus: one vertical conductor per group; each requirement is a pin on it. */
.dr-bus {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 0;
}

.dr-bus::before {
    content: "";
    position: absolute;
    left: var(--dr-bus-x);
    top: 0.95rem;
    bottom: 0.95rem;
    width: 2px;
    margin-left: -1px;
    background: rgba(var(--p-primary-rgb), 0.42);
    border-radius: 1px;
    z-index: 1;
}

.dr-req {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    min-height: 2.1rem;
    padding: 0.3rem 0.5rem 0.3rem 0.4rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--dr-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.dr-req:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 1px;
}

.dr-pin {
    position: relative;
    z-index: 2;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3rem;
    height: 1.3rem;
    /* centre the pin on the bus line */
    margin-left: calc(var(--dr-bus-x) - 0.4rem - 0.65rem - 1px);
    border-radius: 50%;
    font-size: 0.62rem;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.dr-req-label {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.9rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
}

.dr-req-state,
.dr-req-action {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.76rem;
    font-weight: 600;
    white-space: nowrap;
}

.dr-req-action i {
    font-size: 0.68rem;
}

/* Required: a locked pin, always connected. */
.dr-req-required {
    cursor: default;
}
.dr-req-required .dr-pin {
    background: var(--p-primary);
    color: var(--p-dark);
    box-shadow: 0 0 0 3px rgba(var(--p-primary-rgb), 0.18);
}
.dr-req-required .dr-req-label {
    font-weight: 600;
}
.dr-req-required .dr-req-state {
    color: var(--dr-faint);
    font-weight: 500;
}

/* Available: a hollow pin; the action reads as an invitation. */
.dr-req-off .dr-pin {
    background: var(--p-light);
    border: 2px solid rgba(var(--p-white-rgb), 0.28);
}
.dr-req-off .dr-req-label {
    color: var(--dr-muted);
}
.dr-req-off .dr-req-action {
    color: var(--dr-accent-text);
}
.dr-req-off:hover,
.dr-req-off:focus-visible {
    background: rgba(var(--p-primary-rgb), 0.08);
    border-color: rgba(var(--p-primary-rgb), 0.3);
}
.dr-req-off:hover .dr-req-label,
.dr-req-off:focus-visible .dr-req-label {
    color: var(--dr-text);
}
.dr-req-off:hover .dr-pin {
    border-color: var(--p-primary);
}

/* Added: a filled pin, connected to the design. */
.dr-req-on {
    background: rgba(var(--p-primary-rgb), 0.1);
}
.dr-req-on .dr-pin {
    background: var(--p-primary);
    color: var(--p-dark);
}
.dr-req-on .dr-req-label {
    font-weight: 500;
}
.dr-req-on .dr-req-action {
    color: var(--dr-muted);
}
.dr-req-on:hover,
.dr-req-on:focus-visible {
    background: rgb(var(--p-danger-rgb) / 0.1);
    border-color: rgb(var(--p-danger-rgb) / 0.35);
}
.dr-req-on:hover .dr-req-action,
.dr-req-on:focus-visible .dr-req-action {
    color: var(--p-danger);
}

/* ============ Specification sheet ============ */
/* The sheet is the same panel language as the index, without the accent
   stripe: in the sheet, teal marks only what is required. */
.dr-detail-panel {
    min-width: 0;
    overflow: hidden;
    border-left: 1px solid var(--dr-border);
    --dr-gutter: 1.1rem;
}

/* Masonry flow: cells take the height of their editor and pack into two
   columns when there is room. Insulation, the one wide editor, spans the
   whole sheet and sits last. */
.dr-sheet {
    columns: 26rem 2;
    column-gap: 0;
    column-rule: 1px solid var(--dr-rule);
}

.dr-cell {
    position: relative;
    display: block;
    min-width: 0;
    margin: 0;
    padding: 0.7rem var(--dr-gutter) 0.8rem;
    break-inside: avoid;
    box-shadow: inset 0 -1px 0 var(--dr-rule);
    scroll-margin-top: 5rem;
}

.dr-cell-wide {
    column-span: all;
}

/* Required cells: a short teal marker in the gutter, level with the title. */
.dr-cell-required::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.8rem;
    width: 3px;
    height: 1.2rem;
    border-radius: 0 2px 2px 0;
    background: var(--p-primary);
}

.dr-cell-flag {
    position: absolute;
    top: 0.82rem;
    right: var(--dr-gutter);
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.74rem;
    font-weight: 500;
    color: var(--dr-faint);
    pointer-events: none;
}
.dr-cell-flag i {
    font-size: 0.66rem;
}

.dr-cell-note,
.dr-sheet-hint {
    margin: 0.15rem 0 0;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--dr-muted);
    max-width: 38rem;
}

.dr-sheet-hint {
    margin: 0;
    padding-top: 0.9rem;
    padding-bottom: 1rem;
    color: var(--dr-faint);
}

/* A requirement just added from the index flashes once so the eye finds it. */
.dr-cell-arrived {
    animation: dr-arrive 1.1s ease-out;
}
@keyframes dr-arrive {
    0% { background: rgba(var(--p-primary-rgb), 0.16); }
    100% { background: transparent; }
}
@media (prefers-reduced-motion: reduce) {
    .dr-cell-arrived { animation: none; }
    .dr-req, .dr-pin { transition: none; }
}

/* ---- The requirement editors inside each cell ----
   The editors come from shared components with their own paddings, grid
   gutters and centring. Inside the sheet every one of them is flattened to
   the cell's gutter, so all titles, sub-headings and fields share one left
   edge. */
.dr-detail-body :deep(> *) {
    border: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    text-align: left !important;
}

.dr-detail-body :deep(> *:not(.dr-cell-flag) + *:not(.dr-cell-note):not(.dr-cell-flag)) {
    margin-top: 0.65rem !important;
    padding-top: 0.65rem !important;
    border-top: 1px dashed var(--dr-rule) !important;
}

/* PrimeFlex .grid / .col-* gutters and the ml-* indents. */
.dr-detail-body :deep(.grid) {
    margin: 0 !important;
    padding: 0 !important;
}
.dr-detail-body :deep([class*="col-"]) {
    padding-left: 0 !important;
    padding-right: 0 !important;
}
.dr-detail-body :deep(.ml-2),
.dr-detail-body :deep(.ml-3),
.dr-detail-body :deep(.ml-5) {
    margin-left: 0 !important;
}

/* Section titles: one style, one left edge, no icon. */
.dr-detail-body > * :deep(> [data-cy$="-title"]),
.dr-detail-body > * :deep(> * > [data-cy$="-title"]),
.dr-detail-body > * :deep(> .ins-title) {
    display: block !important;
    width: 100% !important;
    margin: 0 0 0.4rem 0 !important;
    padding: 0 6rem 0 0 !important;
    font-size: 0.98rem !important;
    font-weight: 650 !important;
    line-height: 1.3 !important;
    letter-spacing: 0 !important;
    color: var(--p-primary) !important;
    text-align: left !important;
    background: transparent !important;
}
.dr-detail-body :deep(.ins-title > i) {
    display: none !important;
}
.dr-detail-body :deep(.efl-row),
.dr-detail-body :deep(.dim-row),
.dr-detail-body :deep(.efr-row),
.dr-detail-body :deep(.dwt-title-row) {
    margin: 0 !important;
    padding: 0 !important;
    justify-content: flex-start !important;
    text-align: left !important;
}

/* Stack title above input for the top-level editors. */
.dr-detail-body > .efl-container :deep(> .efl-row),
.dr-detail-body > .dim-container :deep(> .dim-row),
.dr-detail-body > .efr-container :deep(> .efr-row) {
    flex-direction: column !important;
    align-items: stretch !important;
}

/* Every nested label reads from the left. */
.dr-detail-body :deep(.dwt-title),
.dr-detail-body :deep(label) {
    text-align: left !important;
}

/* Single-choice selects: one comfortable width, never a sliver in a wide cell. */
.dr-detail-body :deep(.efl-select) {
    flex: 0 1 auto !important;
    width: 100% !important;
    max-width: 22rem !important;
}

/* Maximum weight: the value sits under its title, not centred in the cell. */
.dr-detail-body :deep(.dim-value-row) {
    justify-content: flex-start !important;
    max-width: 16rem;
    padding-left: 0 !important;
}

/* Wiring technology radios: options size to their labels and wrap. */
.dr-detail-body :deep(.efr-options-row) {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 0.35rem 1.5rem !important;
    padding-left: 0 !important;
}
.dr-detail-body :deep(.efr-option) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
    padding: 0 !important;
}

/* Minimum / nominal / maximum: the value is the field; the add-a-bound
   controls are quiet text buttons sized to their words. */
.dr-detail-body :deep(.dwt-fields-row),
.dr-detail-body :deep(.md-fields-row) {
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
    gap: 0.35rem 0.3rem !important;
    padding-left: 0 !important;
}
.dr-detail-body :deep(.dwt-field:has(> .dwt-add-btn)),
.dr-detail-body :deep(.md-field:has(> .md-add-btn)) {
    flex: 0 0 auto !important;
    min-width: 0 !important;
}
.dr-detail-body :deep(.dwt-field:has(.dwt-group)),
.dr-detail-body :deep(.md-field:has(.md-group)) {
    flex: 1 1 9rem !important;
    max-width: 17rem !important;
}
.dr-detail-body :deep(.dwt-field:has(.dwt-group)) {
    min-width: 0 !important;
}
.dr-detail-body :deep(.dwt-input) {
    min-width: 3.5rem !important;
}
.dr-detail-body :deep(.dwt-add-btn),
.dr-detail-body :deep(.md-add-btn) {
    width: auto !important;
    height: 1.75rem !important;
    padding: 0 0.4rem !important;
    background: transparent !important;
    border: 1px dashed rgba(var(--p-white-rgb), 0.18) !important;
    border-radius: 6px !important;
    box-shadow: none !important;
    color: var(--dr-muted) !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
}
.dr-detail-body :deep(.dwt-add-btn:hover),
.dr-detail-body :deep(.md-add-btn:hover),
.dr-detail-body :deep(.dwt-add-btn:focus-visible),
.dr-detail-body :deep(.md-add-btn:focus-visible) {
    color: var(--dr-accent-text) !important;
    border-color: rgba(var(--p-primary-rgb), 0.55) !important;
}
.dr-detail-body :deep(.dwt-add-btn .p-button-icon),
.dr-detail-body :deep(.md-add-btn .p-button-icon) {
    font-size: 0.65rem !important;
}
.dr-detail-body :deep(.md-add-btn:disabled) {
    opacity: 0.45 !important;
}
/* Field outlines (inputs, selects, their addons) at non-text contrast; the
   focus ring keeps the theme's own colour. */
.dr-detail-body :deep(.p-inputtext:not(:focus):not(.dwt-title-input)),
.dr-detail-body :deep(.p-select:not(.p-focus)),
.dr-detail-body :deep(.p-inputgroupaddon) {
    border-color: var(--dr-field-border) !important;
}
/* The bound's tag (Min. / Nom. / Max.) on its remove addon: muted, not dim. */
.dr-detail-body :deep(.dwt-remove-addon:not(:hover)) {
    color: var(--dr-muted) !important;
}

/* Maximum dimensions uses the same field height as every other value. */
.dr-detail-body :deep(.md-group),
.dr-detail-body :deep(.md-group .p-inputgroupaddon),
.dr-detail-body :deep(.md-group .p-inputnumber),
.dr-detail-body :deep(.md-input .p-inputnumber-input),
.dr-detail-body :deep(.md-remove-addon),
.dr-detail-body :deep(.md-unit-addon) {
    height: 1.75rem !important;
}

/* Per-winding rows (turns ratios, leakage inductance, stray capacitance):
   winding name on the left in a fixed column, the value on the right. */
.dr-detail-body :deep(.dwt-container.array-dwt-row) {
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.75rem !important;
    padding: 0.15rem 0 !important;
    margin: 0 !important;
}
.dr-detail-body :deep(.dwt-container.array-dwt-row > .dwt-title-row) {
    flex: 0 0 6.5rem !important;
    width: 6.5rem !important;
}
.dr-detail-body :deep(.dwt-container.array-dwt-row .dwt-title) {
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--dr-muted) !important;
}
.dr-detail-body :deep(.dwt-container.array-dwt-row > .dwt-fields-row) {
    flex: 1 1 auto !important;
    min-width: 0;
}

/* Per-winding selects (terminal type, isolation sides). */
.dr-detail-body :deep(.container-flex .efl-container) {
    padding: 0.15rem 0 !important;
}
.dr-detail-body :deep(.container-flex .efl-row) {
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.75rem !important;
}
.dr-detail-body :deep(.container-flex .efl-label) {
    flex: 0 0 6.5rem !important;
    width: 6.5rem !important;
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--dr-muted) !important;
}

/* Insulation: its sub-sections become plain sub-headings on the same edge,
   in the sheet's own language (no second panel style, sentence case). */
.dr-detail-body :deep(.ins-root) {
    gap: 0.25rem !important;
}
.dr-detail-body :deep(.ins-section) {
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    overflow: visible !important;
}
.dr-detail-body :deep(.ins-section + .ins-section) {
    border-top: 1px dashed var(--dr-rule) !important;
    margin-top: 0.3rem;
    padding-top: 0.3rem;
}
.dr-detail-body :deep(.ins-section-header) {
    padding: 0.2rem 0 0.25rem !important;
    background: transparent !important;
    border: 0 !important;
    color: var(--dr-text) !important;
    font-size: 0.86rem !important;
    font-weight: 600 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
}
.dr-detail-body :deep(.ins-section-header > i) {
    display: none !important;
}
.dr-detail-body :deep(.ins-grid-2),
.dr-detail-body :deep(.ins-standards) {
    padding: 0.2rem 0 0.35rem !important;
    column-gap: 2rem !important;
}

/* Minimum impedance rows: points stacked on the left edge, row controls after. */
.dr-detail-body :deep(.pod-container) {
    padding: 0.2rem 0 !important;
}

/* custom.scss indents every editor's content row under its title
   (1.5rem, with !important). In the sheet everything shares the cell's
   gutter instead, so that indent is cancelled here, at higher specificity. */
.dr-container .dr-sheet .dr-detail-body :deep(.efl-row),
.dr-container .dr-sheet .dr-detail-body :deep(.dim-value-row),
.dr-container .dr-sheet .dr-detail-body :deep(.dwt-fields-row),
.dr-container .dr-sheet .dr-detail-body :deep(.efr-options-row),
.dr-container .dr-sheet .dr-detail-body :deep(.grid),
.dr-container .dr-sheet .dr-detail-body :deep(.md-fields-row) {
    padding-left: 0 !important;
    margin-left: 0 !important;
}

/* Maximum weight: in a column flex the shared component's flex-basis turns
   into height, which made the cell ~300 px tall. Size to content. */
.dr-detail-body > .dim-container :deep(> .dim-row > *) {
    flex: 0 0 auto !important;
    height: auto !important;
}
.dr-detail-body > .dim-container :deep(.dim-value-row) {
    align-items: center !important;
}
.dr-detail-body > .dim-container :deep(.dim-input) {
    height: 1.75rem !important;
}

/* Field labels nested inside an editor (Frequency, Altitude, Cti, ...) are
   one step below the section title and one step below the sub-heading. */
.dr-detail-body :deep(label:not([data-cy$="-title"]):not(.efr-option-label):not(.efr-flame)),
.dr-detail-body :deep(.dwt-title:not([data-cy$="-title"])) {
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--dr-muted) !important;
}
.dr-detail-body :deep(.ins-section [data-cy$="-title"]),
.dr-detail-body :deep(.pod-container [data-cy$="-title"]) {
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--dr-muted) !important;
    padding: 0 !important;
}

/* The per-winding name is an editable field (the winding can be renamed):
   keep it quiet and the same height as the values beside it. */
.dr-detail-body :deep(.dwt-title-input) {
    width: 100% !important;
    height: 1.75rem !important;
    padding: 0 0.35rem !important;
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    color: var(--dr-muted) !important;
    background: transparent !important;
    border: 1px solid transparent !important;
    border-bottom: 1px dashed rgba(var(--p-white-rgb), 0.18) !important;
    border-radius: 4px 4px 0 0 !important;
    text-align: left !important;
}
.dr-detail-body :deep(.dwt-title-input:hover),
.dr-detail-body :deep(.dwt-title-input:focus) {
    color: var(--dr-text) !important;
    border-color: rgba(var(--p-primary-rgb), 0.45) !important;
}
.dr-detail-body :deep(.dwt-container.array-dwt-row > .dwt-title-row) {
    margin-left: -0.35rem !important;
}

/* Insulation classification: label and select side by side, the select
   right after its label rather than pushed to the far half of the cell. */
.dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-row) {
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.75rem !important;
}
.dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-label) {
    flex: 0 0 10.5rem !important;
    width: 10.5rem !important;
    max-width: 10.5rem !important;
}
.dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-select) {
    flex: 1 1 auto !important;
    max-width: 16rem !important;
}

/* Wiring technology: the title's wrapper carries a col-5 width; give the
   title the whole row so it is never clipped. */
.dr-detail-body > .efr-container :deep(> .efr-row > *) {
    width: 100% !important;
    max-width: none !important;
    flex: 0 0 auto !important;
}

/* Each cell is a size container: editors adapt to the cell, not the window. */
.dr-cell {
    container-type: inline-size;
}
.dr-detail-body :deep(.pod-row) {
    flex-wrap: wrap !important;
    gap: 0.35rem 0.75rem !important;
}
@container (max-width: 34rem) {
    /* Per-winding rows: the winding name above its values. */
    .dr-detail-body :deep(.dwt-container.array-dwt-row) {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.2rem !important;
    }
    .dr-detail-body :deep(.dwt-container.array-dwt-row > .dwt-title-row) {
        flex: 0 0 auto !important;
        width: 9rem !important;
        height: auto !important;
    }
    .dr-detail-body :deep(.dwt-container.array-dwt-row > .dwt-fields-row) {
        flex: 0 0 auto !important;
    }
    /* Minimum impedance: frequency and impedance each get a full row. */
    .dr-detail-body :deep(.pod-dim) {
        flex: 1 1 100% !important;
    }
    /* Insulation's two-up grids become one column. */
    .dr-detail-body :deep(.ins-grid-2) {
        grid-template-columns: minmax(0, 1fr) !important;
    }
}
@container (max-width: 24rem) {
    .dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-row) {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.2rem !important;
    }
    .dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-label) {
        flex-basis: auto !important;
        width: 100% !important;
        max-width: none !important;
    }
    .dr-container .dr-sheet .dr-detail-body :deep(.ins-cell .efl-select) {
        max-width: none !important;
    }
}

/* ============ Narrow screens: the index sits above the sheet ============ */
@media (max-width: 1100px) {
    .dr-layout {
        grid-template-columns: minmax(0, 1fr);
    }
    /* Groups side by side while there is room, so the index stays short. */
    .dr-list-panel {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
        column-gap: 1.25rem;
    }
    .dr-rail-head {
        grid-column: 1 / -1;
    }
}

@media (max-width: 600px) {
    .dr-container {
        padding: 0.5rem 0 1.25rem;
    }
    .dr-detail-panel {
        --dr-gutter: 0.85rem;
    }
    .dr-detail-body :deep(.container-flex .efl-label) {
        flex-basis: 5.5rem !important;
        width: 5.5rem !important;
    }
}
</style>
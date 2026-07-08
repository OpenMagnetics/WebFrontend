// Guided-tour step definitions, one tour per view/subsection, consumed by
// src/tours/engine.js (driver.js). Steps whose `element` is not on screen in
// the current state are skipped automatically, so a tour can describe
// optional UI (e.g. results that only exist after pressing a button).
//
// `element` accepts a CSS selector, an array of fallback selectors, or a
// function returning a DOM element (see resolveStepElement in engine.js).

const headerSteps = [
    {
        element: '[data-cy="Header-new-magnetic-link"]',
        title: 'Start a new design',
        description: 'This starts a new power magnetic design from scratch: you enter your requirements and operating conditions, and OpenMagnetics guides you step by step to a finished core, wire and coil.',
    },
    {
        element: 'a.dropdown-toggle.om-wizard-btn',
        title: 'Design Wizards',
        description: 'Already know your converter topology? Pick its wizard (Flyback, LLC, Buck, common-mode choke, …) and it will compute the waveforms and size the magnetic from a handful of electrical parameters. This is the fastest way to get a design.',
    },
    {
        element: 'a.dropdown-toggle.om-nav-btn',
        title: 'Extra tools',
        description: 'Standalone utilities, like the Insulation Coordinator for computing clearance and creepage requirements per IEC standards.',
    },
    {
        element: '.om-load-btn',
        title: 'Load a saved design',
        description: 'Designs are saved as MAS files (an open JSON format). Load one here to continue exactly where you left off.',
    },
    {
        element: '.om-bug-btn',
        title: 'Something wrong?',
        description: 'Report a bug directly from here — it reaches us with the context of what you were doing.',
    },
    {
        element: '[data-cy="Header-help-tour-button"]',
        title: 'Help is always here',
        description: 'Press this button on any screen to get an interactive tour of the page you are on.',
    },
];

export const TOURS = {

    header: {
        steps: [
            {
                title: 'Welcome to OpenMagnetics!',
                description: 'The free, open-source platform for designing magnetic components. Let me show you around the main controls.',
            },
            ...headerSteps,
        ],
    },

    home: {
        steps: [
            {
                title: 'Welcome to OpenMagnetics!',
                description: 'The free, open-source platform for designing power magnetics: transformers, inductors and chokes. Here is how to get started.',
            },
            ...headerSteps.slice(0, 1),
            {
                element: 'a.dropdown-toggle.om-wizard-btn',
                title: 'Pick your converter',
                description: 'The fastest way to a design: open this menu and pick the wizard for your converter topology (Flyback, LLC, Buck, common-mode choke, …) — it computes the waveforms and sizes the magnetic from a handful of electrical parameters. The same wizards are listed as cards further down this page.',
            },
            ...headerSteps.slice(2),
        ],
    },

    toolSelector: {
        steps: [
            {
                title: 'How do you want to design?',
                description: 'Choose how much help you want: let the adviser design everything for you, or build the magnetic yourself piece by piece. You can always switch tools later without losing your work.',
            },
            {
                element: '[data-cy$="-magnetic-adviser-button"]',
                title: 'Let OpenMagnetics design it',
                description: 'The Magnetic Adviser designs the complete magnetic — core, wire and coil — from your requirements, and ranks the candidates by the priorities you set (losses, size, cost, …).',
            },
            {
                element: '[data-cy$="-magnetic-core-adviser-button"]',
                title: 'Get core suggestions',
                description: 'The Core Adviser recommends suitable cores for your requirements, and you stay in control of the winding design.',
            },
            {
                element: '[data-cy$="-magnetic-builder-button"]',
                title: 'Build it yourself',
                description: 'The Magnetic Builder lets you pick the core, wire and coil yourself, with live simulation of losses, temperature and inductance as you go.',
            },
            {
                element: '[data-cy$="-magnetic-Report-button"]',
                title: 'Just need the datasheet?',
                description: 'Generate the full specifications report of the current design: all parameters, simulation results and export options in one document.',
            },
        ],
    },

    designRequirements: {
        steps: [
            {
                title: 'Step 1 — Design Requirements',
                description: 'Tell OpenMagnetics what your magnetic must achieve. Only a few fields are mandatory; everything else is optional and helps narrow down better designs.',
            },
            {
                element: '.dr-list-panel',
                title: 'The requirements list',
                description: 'The highlighted entries (number of windings, magnetizing inductance, turns ratios) are always required. Press + on any other requirement — insulation, operating temperature, dimensions, … — to add it to your spec.',
            },
            {
                element: '.dr-detail-panel',
                title: 'Fill in the values',
                description: 'Enter the values for each requirement here. Most fields accept a minimum, nominal and maximum, so you can specify tolerances instead of single numbers.',
            },
            {
                element: '.storyline-panel',
                title: 'Your design journey',
                description: 'This panel tracks your progress through the design flow. You can click any completed step to go back and change something — the rest of the design updates.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'Once the required fields are filled in, press here to move on to the Operating Points.',
            },
        ],
    },

    operatingPoints: {
        steps: [
            {
                title: 'Step 2 — Operating Points',
                description: 'Describe the electrical conditions your magnetic will actually see: the excitation of each winding at each condition you care about (nominal, worst case, …).',
            },
            {
                element: '.op-panel',
                title: 'Your operating points',
                description: 'Each operating point holds a switching frequency, an ambient temperature and one excitation per winding. Add one per operating condition you want the design verified against.',
            },
            {
                element: '[data-cy$="-add-operating-point-button"]',
                title: 'Add operating points',
                description: 'Add as many operating points as you need — the advisers check every design against all of them.',
            },
            {
                element: ['.op-container .md\\:col-10', '.op-container [class*="col-10"]'],
                title: 'Define the excitation',
                description: 'Pick how you want to define each winding: choose a waveform shape (sinusoidal, triangular, rectangular, or fully custom points), then set frequency and amplitudes. The other windings are reflected automatically through the turns ratios.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'When every winding of every operating point is defined, continue to choose your design tool.',
            },
        ],
    },

    magneticCoreAdviser: {
        steps: [
            {
                title: 'Core Adviser',
                description: 'OpenMagnetics will search its whole core database for the shapes, materials and gaps that best fit your requirements and operating points.',
            },
            {
                element: [
                    () => document.querySelector('[data-cy$="-calculate-mas-advises-button"]')?.closest('[class*="col-2"]'),
                    '[data-cy$="-calculate-mas-advises-button"]',
                ],
                title: 'Set your priorities',
                description: 'These weights tell the adviser what matters most to you — losses, size, cost, temperature… Move the sliders and the ranking adapts.',
            },
            {
                element: '[data-cy$="-calculate-mas-advises-button"]',
                title: 'Get advised cores',
                description: 'Press here and the adviser will evaluate thousands of cores against your spec and show the best candidates.',
            },
            {
                element: '.storyline-panel',
                title: 'Your design journey',
                description: 'You can always go back to a previous step from here — for example to tighten a requirement if you get too many candidates.',
            },
        ],
    },

    magneticAdviser: {
        steps: [
            {
                title: 'Magnetic Adviser',
                description: 'The full-auto mode: OpenMagnetics designs complete magnetics — core, wire, number of turns and coil arrangement — and ranks them by your priorities.',
            },
            {
                element: '.optim-panel',
                title: 'Set your priorities',
                description: 'Weigh what matters most: efficiency, size, cost… Candidates are scored and ranked accordingly.',
            },
            {
                element: '[data-cy$="-calculate-mas-advises-button"]',
                title: 'Get your designs',
                description: 'Press here to generate the designs. Each result card shows the key figures (losses, temperature, dimensions) so you can compare at a glance.',
            },
            {
                element: '[data-cy$="-load-and-go-to-builder-button"]',
                title: 'Refine a candidate',
                description: 'Like one of the designs? Open it in the Magnetic Builder to inspect and fine-tune every detail.',
            },
        ],
    },

    catalogAdviser: {
        steps: [
            {
                title: 'Catalog Adviser',
                description: 'Search real, commercially available off-the-shelf parts that meet your requirements, instead of designing a custom magnetic.',
            },
            {
                element: [
                    () => document.querySelector('[data-cy$="-search-button"]')?.closest('[class*="col-"]'),
                    '[data-cy$="-search-button"]',
                ],
                title: 'Filter the catalog',
                description: 'Set your electrical filters here, then search the catalog for matching parts.',
            },
            {
                element: '[data-cy$="-search-button"]',
                title: 'Search',
                description: 'Press here to find catalog parts that meet your spec.',
            },
        ],
    },

    magneticBuilder: {
        steps: [
            {
                title: 'Magnetic Builder',
                description: 'Assemble your magnetic from its three ingredients — core, wire and coil — and see losses, magnetizing inductance and temperature simulated live as you change things.',
            },
            {
                element: '.container .row.gx-0 > div:nth-child(1)',
                title: '1 — The core',
                description: 'Choose the core shape, material and gapping here. Use "Advise" to let OpenMagnetics pick one for your requirements, or go Advanced to browse shapes and materials in detail.',
            },
            {
                element: '.container .row.gx-0 > div:nth-child(2)',
                title: '2 — The wire',
                description: 'Pick the wire for each winding: round, litz, foil or planar, with standard gauges. "Advise" suggests a wire that handles your current density and skin effect.',
            },
            {
                element: '.container .row.gx-0 > div:nth-child(3)',
                title: '3 — The coil',
                description: 'Arrange the turns: sections, layers, interleaving and insulation. The 2D preview shows exactly how the winding window is filled.',
            },
            {
                element: ['.container .row.w-100', '.graph-info'],
                title: 'Simulation graphs',
                description: 'Once core, wire and coil are all chosen, the graphs down here show losses, inductance and impedance versus frequency, temperature and DC bias.',
            },
            {
                element: '.toolmenu-panel',
                title: 'Tool menu',
                description: 'Switch to another tool (adviser, report…) at any point — your magnetic comes along.',
            },
            {
                element: '[data-cy="magnetic-synthesis-title-control-panel"]',
                title: 'Actions & exports',
                description: 'Export your design from here: 3D model (STL), 2D drawing (SVG), datasheet (PDF), SPICE model, or the MAS file to reload later.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'Happy with the magnetic? Continue to the summary to get the full specifications report.',
            },
        ],
    },

    magneticSummary: {
        steps: [
            {
                title: 'Your magnetic, documented',
                description: 'This is the full datasheet of your design: requirements, operating points, core, wire, coil and all the simulated performance figures.',
            },
            {
                element: '.datasheet-toolbar',
                title: 'Download & export',
                description: 'Download the MAS design file, export the 3D core and coil models, the PDF datasheet, or a SPICE model for circuit simulation.',
            },
            {
                element: '.storyline-panel',
                title: 'Not quite right?',
                description: 'Jump back to any previous step from here and adjust — the datasheet regenerates.',
            },
        ],
    },

    wizardsLanding: {
        steps: [
            {
                title: 'Design Wizards',
                description: 'The fastest way to design a magnetic if you know your converter: each wizard asks only for the electrical parameters of that topology and derives everything else.',
            },
            {
                element: '.card',
                title: 'Pick your topology',
                description: 'Each card is a guided flow for one converter type. Inside, you can let OpenMagnetics design the magnetic for you, or verify a design you already have.',
            },
            {
                element: 'a.dropdown-toggle.om-wizard-btn',
                title: 'Also in the header',
                description: 'The full list of wizards is always available from this menu, grouped by converter family.',
            },
        ],
    },

    wizard: {
        steps: [
            {
                title: 'Converter Wizard',
                description: 'This wizard sizes the magnetic for your converter from its electrical spec. Fill in the parameters left to right — the simulated waveforms update as you type.',
            },
            {
                element: '.wizard-container .row.g-2 > div:nth-child(1)',
                title: 'Design mode & conditions',
                description: 'Choose "Help me with the design" to let OpenMagnetics compute the magnetic parameters from your converter spec, or "I know the design I want" to enter inductance and turns yourself. Below, set the operating conditions like switching frequency and temperature.',
            },
            {
                element: '.wizard-container .row.g-2 > div:nth-child(2)',
                title: 'Electrical specification',
                description: 'Enter your input voltage range and the output(s) of the converter. Tolerances are welcome — the design is checked across the whole range.',
            },
            {
                element: ['.simulation-card', '.wizard-container .row.g-2 > div:nth-child(3)'],
                title: 'Simulated waveforms',
                description: 'These are the converter waveforms computed from your spec — check they look right (shape, amplitude, duty cycle) before designing. You can switch between converter and magnetic views and change the number of periods shown.',
            },
            {
                element: '.wizard-container .action-btn-sm.primary',
                title: 'Design the magnetic',
                description: 'When the waveforms look right, press here: the wizard turns your spec into design requirements and operating points and takes you to the design tools. "Review Specs" lets you inspect them first.',
            },
        ],
    },

    crossReferencerSelection: {
        steps: [
            {
                title: 'Cross Referencer — pick your goal',
                description: 'Already have a core in mind but need an alternative? This tool finds substitute cores, shapes or materials that match your original as closely as possible. Pick what you want to substitute.',
            },
            {
                element: '[data-cy="ToolSelection-core_cross_referencer-button"]',
                title: 'Substitute the whole core',
                description: 'Explore alternative cores with different shapes AND materials — the broadest search, useful when you just need something equivalent that is available to you.',
            },
            {
                element: '[data-cy="ToolSelection-core_shape_cross_referencer-button"]',
                title: 'Keep the material, change the shape',
                description: 'Lock your current material and look only for a substitute shape — handy when you trust a material but need a different footprint.',
            },
            {
                element: '[data-cy="ToolSelection-core_material_cross_referencer-button"]',
                title: 'Keep the shape, change the material',
                description: 'Lock your current shape and compare alternative materials — for example to trade off losses against saturation at your operating point.',
            },
        ],
    },

    crossReferencerCore: {
        steps: [
            {
                title: 'Core Cross Referencer',
                description: 'Enter the core you have today and OpenMagnetics searches its whole database for the closest alternatives, scoring each on losses, size, permeance and saturation.',
            },
            {
                element: '[data-cy="CrossReferencer-inputs-panel"]',
                title: '1 — Your current core',
                description: 'Describe the core you are replacing: its shape, material, number of turns and the core types you will accept (toroids, two-piece sets, in-stock only). Results update automatically as you change these.',
            },
            {
                element: '[data-cy="CrossReferencer-results-panel"]',
                title: '2 — The alternatives',
                description: 'Every candidate core is plotted against your reference on the two metrics you choose. Points closer to the reference (and toward the better corner) are the best substitutes — click one to inspect it.',
            },
            {
                element: '[data-cy="CrossReferencer-analyze-panel"]',
                title: '3 — Analyze your pick',
                description: 'Once you select a candidate, its full details and how it compares to your original core appear here.',
            },
        ],
    },

    crossReferencerShape: {
        steps: [
            {
                title: 'Core Shape Cross Referencer',
                description: 'Keep your material and find a substitute core SHAPE. OpenMagnetics ranks alternative shapes in the same material by how closely they match your original.',
            },
            {
                element: '[data-cy="CrossReferencer-inputs-panel"]',
                title: '1 — Your current core',
                description: 'Describe the core you are replacing. The material is held constant here — only the shape varies among the candidates.',
            },
            {
                element: '[data-cy="CrossReferencer-results-panel"]',
                title: '2 — The alternative shapes',
                description: 'Candidate shapes are plotted against your reference on the two metrics you choose. Click a point to inspect that shape.',
            },
            {
                element: '[data-cy="CrossReferencer-analyze-panel"]',
                title: '3 — Analyze your pick',
                description: 'Select a candidate to see its full details and how it compares to your original core.',
            },
        ],
    },

    crossReferencerMaterial: {
        steps: [
            {
                title: 'Core Material Cross Referencer',
                description: 'Keep your core shape and compare alternative MATERIALS. OpenMagnetics scores each material against your reference at your operating temperature.',
            },
            {
                element: '[data-cy="CrossReferencer-inputs-panel"]',
                title: '1 — Your current material',
                description: 'Describe your current core material and operating temperature. The shape is held constant — only the material varies among the candidates.',
            },
            {
                element: '[data-cy="CrossReferencer-results-panel"]',
                title: '2 — The alternative materials',
                description: 'Candidate materials are plotted against your reference on the two metrics you choose (losses, permeance, saturation…). Click a point to inspect that material.',
            },
            {
                element: '[data-cy="CrossReferencer-analyze-panel"]',
                title: '3 — Analyze your pick',
                description: 'Select a candidate to see its full material characteristics and how it compares to your original.',
            },
        ],
    },

    insulationAdviser: {
        steps: [
            {
                title: 'Insulation Coordinator',
                description: 'Compute the insulation requirements of your design — clearance, creepage and distance through insulation — according to IEC standards.',
            },
            {
                element: '.ia-card:not(.ia-card-result)',
                title: 'Describe your application',
                description: 'Select the applicable standard, insulation type, overvoltage and pollution degree, and your voltages. Hover any field for a detailed explanation.',
            },
            {
                element: '.ia-card-result',
                title: 'The resulting requirements',
                description: 'Clearance, creepage and distance through insulation are computed live from the standard as you change the inputs.',
            },
            {
                element: '.storyline-panel',
                title: 'Your design journey',
                description: 'The insulation requirements become part of your design spec — the advisers only propose designs that satisfy them.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'Once the standards and ratings are set, continue with your design flow.',
            },
        ],
    },
};

// Map the current app context (route + state-store subsection) to a tour id.
// Inside /magnetic_tool (and its catalog siblings) the page is driven by the
// state store's per-tool `subsection`, not by the URL.
const SUBSECTION_TOURS = {
    toolSelector: 'toolSelector',
    designRequirements: 'designRequirements',
    operatingPoints: 'operatingPoints',
    magneticCoreAdviser: 'magneticCoreAdviser',
    magneticAdviser: 'magneticAdviser',
    catalogAdviser: 'catalogAdviser',
    magneticBuilder: 'magneticBuilder',
    magneticViewer: 'magneticBuilder',
    magneticSummary: 'magneticSummary',
    magneticCoreSummary: 'magneticSummary',
    magneticSpecificationsSummary: 'magneticSummary',
    insulationRequirements: 'insulationAdviser',
};

const ROUTE_TOURS = {
    Home: 'home',
    WizardsLanding: 'wizardsLanding',
    Wizards: 'wizard',
    InsulationAdviser: 'insulationAdviser',
    // Cross-referencer views render no Header; their Help affordance is the
    // FloatingHelpButton, which resolves the tour by route name just like the
    // Header button does. The Fair-Rite variants reuse the same tours since
    // they render the same components.
    CrossReferencerSelection: 'crossReferencerSelection',
    CoreCrossReferencer: 'crossReferencerCore',
    CoreCrossReferencerFairRite: 'crossReferencerCore',
    CoreShapeCrossReferencer: 'crossReferencerShape',
    CoreShapeCrossReferencerFairRite: 'crossReferencerShape',
    CoreMaterialCrossReferencer: 'crossReferencerMaterial',
    CoreMaterialCrossReferencerFairRite: 'crossReferencerMaterial',
};

export function resolveTourId(routeName, stateStore) {
    const subsection = stateStore?.getCurrentToolState?.()?.subsection;
    if (['MagneticTool', 'CatalogTool', 'Catalog', 'MagneticViewer'].includes(routeName)
        && subsection != null
        && SUBSECTION_TOURS[subsection] != null) {
        return SUBSECTION_TOURS[subsection];
    }
    if (ROUTE_TOURS[routeName] != null) {
        return ROUTE_TOURS[routeName];
    }
    // Views without a dedicated tour still get the generic header tour, so
    // the Help button always does something useful.
    return 'header';
}

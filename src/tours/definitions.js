// Guided-tour step definitions, one tour per view/subsection, consumed by
// src/tours/engine.js (driver.js). Steps whose `element` is not on screen in
// the current state are skipped automatically, so a tour can describe
// optional UI (e.g. results that only exist after pressing a button).
//
// `element` accepts a CSS selector, an array of fallback selectors, or a
// function returning a DOM element (see resolveStepElement in engine.js).

const headerSteps = [
    {
        element: '[data-cy="Header-new-magnetic-toggle"]',
        title: 'Start a new design',
        description: 'Start a new magnetic here. Know your converter? Under "From a converter topology", open its family and pick it (Flyback, LLC, Buck, PFC, …), or choose "See all topologies…" to browse them as tiles: the operating points are computed from a few electrical values. "Manual design" and "Manual common-mode choke" let you enter requirements and operating points yourself.',
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

// The footer's Engine log: where a step's blocking reasons and the engine's warnings go.
const engineLogStep = {
    element: '[data-cy="EngineLogPanel-toggle"]',
    title: 'Engine log',
    description: 'Why a step cannot continue, and the engine\'s warnings (for example core material data used outside its range), are listed here. The number counts the warnings and errors; the button turns yellow or red when there are any.',
};

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
            {
                element: '[data-cy="Header-new-magnetic-toggle"]',
                title: 'Pick your converter',
                description: 'The fastest way to a design: open New Magnetic and pick your converter under "From a converter topology" (Flyback, LLC, Buck, PFC, …), or "See all topologies…" for the full list. The operating points are computed from a few electrical values. Prefer to enter everything yourself? Choose "Manual design".',
            },
            ...headerSteps.slice(1),
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
                element: '[data-cy="MagneticTool-topology-hint"]',
                title: 'Know your converter?',
                description: 'Start from its topology instead: you enter the converter\'s specification and the operating points are computed for you. Close the banner to keep designing by hand.',
            },
            {
                element: '.dr-group-required',
                title: 'Required',
                description: 'Every design needs these. A lock pin marks them; Turns Ratios applies once there are two or more windings.',
            },
            {
                element: '.dr-req-off',
                title: 'Add a requirement',
                description: 'A hollow pin is available. Press Add to put it on the sheet: insulation, temperature, dimensions, … Each one narrows the designs the advisers propose.',
            },
            {
                element: '.dr-req-on',
                title: 'Added requirements',
                description: 'A filled pin is on the sheet. Remove takes it off again. The info icon by the list title counts how many you have added.',
            },
            {
                element: '.dr-detail-panel',
                title: 'The specification sheet',
                description: 'One cell per requirement. Most values take a minimum, nominal and maximum, so you can give a tolerance instead of a single number.',
            },
            {
                element: '.storyline-panel',
                title: 'Your design journey',
                description: 'This panel tracks your progress through the design flow. You can click any completed step to go back and change something — the rest of the design updates.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'Once the required values are set, move on to the operating points. While something is missing the button reads "Fix Errors".',
            },
            engineLogStep,
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
                description: 'Each card is one operating point: its name, ambient temperature and cooling. Add one per condition the design must meet (nominal, worst case, …).',
            },
            {
                element: '.op-card-pending',
                title: 'Choose a source first',
                description: 'A new operating point needs a source for its waveforms. Pick one on the right.',
            },
            {
                element: '.op-winding-row',
                title: 'Windings and their status',
                description: 'The dot is filled once a winding\'s waveforms are defined. The eye opens a winding in the editor; with two windings, the arrows copy the other winding\'s waveforms through the turns ratio.',
            },
            {
                element: '[data-cy$="-add-operating-point-button"]',
                title: 'Add operating points',
                description: 'Add as many operating points as you need — the advisers check every design against all of them.',
            },
            {
                element: '.op-issues',
                title: 'Things to finish',
                description: 'What still blocks Continue. Open it to read each reason; the same reasons are in the Engine log.',
            },
            {
                element: '.op-mode-buttons',
                title: 'Where the waveforms come from',
                description: 'Import a circuit simulator export or CSV file, set the waveforms by hand, or type a list of harmonics. Hover or focus an option for details.',
            },
            {
                element: '.opm-drive',
                title: 'Define the current or the voltage',
                description: 'An inductor\'s current and voltage are tied by v = L·di/dt: you set one and the other is derived, marked "Derived". Choose here which one you set.',
            },
            {
                element: '.opm-card-current',
                title: 'Shape and values',
                description: 'Pick a waveform shape and set its peak to peak and offset; frequency and duty cycle are in Common parameters. You can also drag the points on the chart.',
            },
            {
                element: '.oph-card-current',
                title: 'Harmonics',
                description: 'One row per harmonic, with its frequency and amplitude. The DC row and the fundamental are always there; add or remove rows below them.',
            },
            {
                element: '.opc-card',
                title: 'Map the file\'s columns',
                description: 'Pick which columns of the imported file hold this winding\'s time, current and voltage.',
            },
            {
                element: '.op-editor-results .op-chart',
                title: 'Waveforms and spectrum',
                description: 'Current and voltage over one period, with their harmonics below. Hover the chart for values.',
            },
            {
                element: ['.op-outputs-pair', '.wso-card'],
                title: 'The figures',
                description: 'Duty cycle, peak to peak, offset, effective frequency, peak, RMS and THD of each signal, with current and voltage row for row. In simple output mode (Settings) only the RMS values and power are shown.',
            },
            {
                element: '.wco-card',
                title: 'Power',
                description: 'Instantaneous and RMS power of this winding, from its current and voltage together.',
            },
            {
                element: '[data-cy="magnetic-synthesis-next-tool-button"]',
                title: 'Continue when ready',
                description: 'When every winding of every operating point is defined, continue to choose your design tool.',
            },
            engineLogStep,
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
                element: '[data-cy$="-score-bars"]',
                title: 'Score by criterion',
                description: 'Each bar is one criterion\'s score out of 100, so you can see where a candidate wins or loses. Hover a bar to see what it measures; the total in points is at the top of the card.',
            },
            {
                element: '[data-cy$="-load-and-go-to-builder-button"]',
                title: 'Refine a candidate',
                description: 'Like one of the designs? Open it in the Magnetic Builder to inspect and fine-tune every detail.',
            },
            engineLogStep,
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
            engineLogStep,
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
                title: 'Start from a converter topology',
                description: 'The fastest way to design a magnetic if you know your converter: each topology asks only for the electrical parameters of that converter and derives everything else.',
            },
            {
                element: '[data-cy="WizardsLanding-search"]',
                title: 'Find your converter',
                description: 'Type part of a name (flyback, LLC, PFC…) or of the magnetic (transformer, coupled inductor…) to filter the topologies.',
            },
            {
                element: '.tl-families',
                title: 'Filter by family',
                description: 'Show one converter family at a time; the number is how many converters it has. Press it again, or All, to see every family.',
            },
            {
                element: '.tl-tile',
                title: 'Pick your topology',
                description: 'Each tile is a guided flow for one converter. Its screen sketches the current in the converter\'s magnetic, and the badge names the magnetic you get. Hover or focus a tile for a one-line description; the info icon by each family name describes the family.',
            },
            {
                element: '[data-cy="WizardsLanding-manual-design"]',
                title: 'Not listed?',
                description: 'Design the magnetic by hand instead: enter its requirements and operating points yourself.',
            },
            {
                element: '[data-cy="Header-new-magnetic-toggle"]',
                title: 'Also in the header',
                description: 'New Magnetic > From a converter topology lists the same converters, grouped by family.',
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

    coreStudio: {
        steps: [
            {
                title: 'Core Studio',
                description: 'Author core shapes, materials and complete cores in the open MAS format — aimed at engineers and manufacturers who want their parts in the OpenMagnetics database. Everything you create is checked by the real simulation engine.',
            },
            {
                element: '[data-cy="CoreStudio-tab-shape"]',
                title: 'Shapes',
                description: 'Start from the closest standard size of any family (E, ETD, RM, PQ, toroids, …), rename it and adjust the IEC dimensions in millimeters.',
            },
            {
                element: '[data-cy="CoreStudio-tab-material"]',
                title: 'Materials',
                description: 'Duplicate an existing grade or start from zero: set the key properties, and give it a loss model — type Steinmetz coefficients directly or fit them from datasheet loss points.',
            },
            {
                element: '[data-cy="CoreStudio-tab-core"]',
                title: 'Cores',
                description: 'Combine any shape and material (including your custom ones), choose the gapping, and validate the finished core.',
            },
            {
                element: '[data-cy="CoreStudio-shape-validate-button"]',
                title: 'Validate with the engine',
                description: 'Every record is processed by the same WebAssembly engine the advisers use — if it validates here, it simulates everywhere.',
            },
            {
                element: '[data-cy="CoreStudio-shape-download-button"]',
                title: 'Contribute to the database',
                description: 'Download your part as one .ndjson line in the official MAS format, ready for a pull request to the OpenMagnetics database — or keep it saved in this browser for your own designs.',
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

    // ── Account pages (optional accounts: designs, inventory, orgs) ──────
    myDesigns: {
        steps: [
            {
                title: 'Your cloud designs',
                description: 'Designs saved to your free account live here — from any device. The tool itself never requires an account; this is purely optional persistence.',
            },
            {
                element: '[data-cy="MyDesigns-save-current-button"]',
                title: 'Save what you are working on',
                description: 'Stores the design currently open in the builder to your account. Saving again updates the same design, keeping a revision history.',
            },
            {
                element: '[data-cy="OrgSelector"]',
                title: 'Personal or company space',
                description: 'If you belong to an organization, switch here: designs created in a company space belong to the company and stay when people leave.',
            },
            {
                element: '[data-cy="MyDesigns-table"]',
                title: 'Open, share, download',
                description: 'Open a design back into the builder, rename it, download it as a MAS file, create a public share link, or delete it.',
            },
        ],
    },

    myInventory: {
        steps: [
            {
                title: 'Your parts inventory',
                description: 'Keep the cores, shapes, materials and wires you actually stock — and let the advisers design with them.',
            },
            {
                element: '[data-cy="MyInventory-scope-public"]',
                title: 'Adviser scope',
                description: 'Choose what the advisers search: the public catalog, the catalog plus your inventory, or exclusively your inventory.',
            },
            {
                element: '[data-cy="MyInventory-import-button"]',
                title: 'Import your parts',
                description: 'Upload MAS ndjson files — the exact format the Core Studio exports — or reference public catalog parts you keep in stock.',
            },
            {
                element: '[data-cy="MyInventory-share-button"]',
                title: 'Share your inventory',
                description: 'Create a public link so colleagues (or customers) can browse your parts and mount them into their own advisers.',
            },
        ],
    },

    organizations: {
        steps: [
            {
                title: 'Company spaces',
                description: 'An organization is a shared space: shared designs, a shared parts inventory with an approval workflow, and teammates with roles.',
            },
            {
                element: '[data-cy="Organizations-new-name"]',
                title: 'Create your company',
                description: 'You become the owner. Everything created inside the organization belongs to it — not to individual employees.',
            },
            {
                element: '[data-cy="Organizations-invite-email"]',
                title: 'Invite your team',
                description: 'Invitations go out by email with a role: viewers read, members design and propose draft parts, librarians approve parts for adviser use, admins manage people.',
            },
        ],
    },

    account: {
        steps: [
            {
                title: 'Your account',
                description: 'Manage your credentials and your data. Everything the account stores can be exported or deleted at any time — your data is yours.',
            },
            {
                element: '[data-cy="Account-export-button"]',
                title: 'Take your data with you',
                description: 'Downloads everything in your account (designs as MAS JSON) as a zip. No lock-in, ever.',
            },
            {
                element: '[data-cy="Account-delete-button"]',
                title: 'Delete forever',
                description: 'Removes the account and everything in it. Export first — there is no undo.',
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
    MyDesigns: 'myDesigns',
    MyInventory: 'myInventory',
    Organizations: 'organizations',
    Account: 'account',
    WizardsLanding: 'wizardsLanding',
    Wizards: 'wizard',
    InsulationAdviser: 'insulationAdviser',
    CoreStudio: 'coreStudio',
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

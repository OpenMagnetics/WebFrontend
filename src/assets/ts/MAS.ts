// To parse this data:
//
//   import { Convert, Mas } from "./file";
//
//   const mas = Convert.toMas(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

/**
 * All the data structure used in the Magnetic Agnostic Structure
 */
export interface Mas {
    /**
     * The description of the inputs that can be used to design a Magnetic
     */
    inputs: Inputs;
    /**
     * The description of a magnetic
     */
    magnetic: Magnetic;
    /**
     * The description of the outputs that are produced after designing a Magnetic
     */
    outputs: Outputs[];
    [property: string]: any;
}

/**
 * The description of the inputs that can be used to design a Magnetic
 */
export interface Inputs {
    /**
     * Data describing the design requirements
     */
    designRequirements: DesignRequirements;
    /**
     * Data describing the operating points
     */
    operatingPoints: OperatingPoint[];
    [property: string]: any;
}

/**
 * Data describing the design requirements
 *
 * The list of requirement that must comply a given magnetic
 */
export interface DesignRequirements {
    insulation?: InsulationRequirements;
    /**
     * Isolation side where each winding is connected to.
     */
    isolationSides?: IsolationSide[];
    /**
     * Required values for the leakage inductance
     */
    leakageInductance?: DimensionWithTolerance[];
    /**
     * Required values for the magnetizing inductance
     */
    magnetizingInductance: DimensionWithTolerance;
    /**
     * Market where the magnetic will end up being used
     */
    market?: Market;
    /**
     * Maximum dimensions, width, height, and depth, for the designed magnetic, in m
     */
    maximumDimensions?: MaximumDimensions;
    /**
     * Maximum weight for the designed magnetic, in Kg
     */
    maximumWeight?: number;
    /**
     * List of minimum impedance at given frequency in the primary
     */
    minimumImpedance?: ImpedanceAtFrequency[];
    /**
     * A label that identifies these Design Requirements
     */
    name?: string;
    /**
     * Required values for the temperature that the magnetic can reach under operating
     */
    operatingTemperature?: DimensionWithTolerance;
    /**
     * Required values for the stray capacitance
     */
    strayCapacitance?: DimensionWithTolerance[];
    /**
     * Type of the terminal that must be used, per winding
     */
    terminalType?: ConnectionType[];
    /**
     * Topology that will use the magnetic
     */
    topology?: Topology;
    /**
     * Required turns ratios between primary and the rest of windings
     */
    turnsRatios: DimensionWithTolerance[];
    /**
     * Technology that must be used to create the wiring
     */
    wiringTechnology?: WiringTechnology;
    [property: string]: any;
}

export interface InsulationRequirements {
    /**
     * Required values for the altitude
     */
    altitude?: DimensionWithTolerance;
    /**
     * Required CTI
     */
    cti?: Cti;
    /**
     * Required type of insulation
     */
    insulationType?: InsulationType;
    /**
     * Voltage RMS of the main supply to which this transformer is connected to.
     */
    mainSupplyVoltage?: DimensionWithTolerance;
    /**
     * Required overvoltage category
     */
    overvoltageCategory?: OvervoltageCategory;
    /**
     * Required pollution for the magnetic to work under
     */
    pollutionDegree?: PollutionDegree;
    /**
     * VList of standards that will be taken into account for insulation.
     */
    standards?: InsulationStandards[];
    [property: string]: any;
}

/**
 * Required values for the altitude
 *
 * Voltage RMS of the main supply to which this transformer is connected to.
 *
 * Required values for the magnetizing inductance
 *
 * Required values for the temperature that the magnetic can reach under operating
 *
 * The maximum thickness of the insulation around the wire, in m
 *
 * The conducting area of the wire, in m². Used for some rectangular shapes where the area
 * is smaller than expected due to rounded corners
 *
 * The conducting diameter of the wire, in m
 *
 * The outer diameter of the wire, in m
 *
 * The conducting height of the wire, in m
 *
 * The conducting width of the wire, in m
 *
 * The outer height of the wire, in m
 *
 * The outer width of the wire, in m
 *
 * The radius of the edge, in case of rectangular wire, in m
 *
 * Heat capacity value according to manufacturer, in J/Kg/K
 *
 * Heat conductivity value according to manufacturer, in W/m/K
 *
 * Data a two dimensional matrix, created as an array of array, where the first coordinate
 * in the X and the second the Y
 *
 * Value of the leakage inductance between the primary and a secondary winding given by the
 * position in the array
 *
 * Value of the magnetizing inductance
 *
 * A dimension of with minimum, nominal, and maximum values
 */
export interface DimensionWithTolerance {
    /**
     * True is the maximum value must be excluded from the range
     */
    excludeMaximum?: boolean;
    /**
     * True is the minimum value must be excluded from the range
     */
    excludeMinimum?: boolean;
    /**
     * The maximum value of the dimension
     */
    maximum?: number;
    /**
     * The minimum value of the dimension
     */
    minimum?: number;
    /**
     * The nominal value of the dimension
     */
    nominal?: number;
    [property: string]: any;
}

/**
 * Required CTI
 */
export enum Cti {
    GroupI = "Group I",
    GroupIi = "Group II",
    GroupIiia = "Group IIIA",
    GroupIiib = "Group IIIB",
}

/**
 * Required type of insulation
 */
export enum InsulationType {
    Basic = "Basic",
    Double = "Double",
    Functional = "Functional",
    Reinforced = "Reinforced",
    Supplementary = "Supplementary",
}

/**
 * Required overvoltage category
 */
export enum OvervoltageCategory {
    OvcI = "OVC-I",
    OvcIi = "OVC-II",
    OvcIii = "OVC-III",
    OvcIv = "OVC-IV",
}

/**
 * Required pollution for the magnetic to work under
 */
export enum PollutionDegree {
    P1 = "P1",
    P2 = "P2",
    P3 = "P3",
}

export enum InsulationStandards {
    Iec603351 = "IEC 60335-1",
    Iec606641 = "IEC 60664-1",
    Iec615581 = "IEC 61558-1",
    Iec623681 = "IEC 62368-1",
}

/**
 * Tag to identify windings that are sharing the same ground
 */
export enum IsolationSide {
    Denary = "denary",
    Duodenary = "duodenary",
    Nonary = "nonary",
    Octonary = "octonary",
    Primary = "primary",
    Quaternary = "quaternary",
    Quinary = "quinary",
    Secondary = "secondary",
    Senary = "senary",
    Septenary = "septenary",
    Tertiary = "tertiary",
    Undenary = "undenary",
}

/**
 * Market where the magnetic will end up being used
 */
export enum Market {
    Commercial = "Commercial",
    Industrial = "Industrial",
    Medical = "Medical",
    Military = "Military",
    Space = "Space",
}

/**
 * Maximum dimensions, width, height, and depth, for the designed magnetic, in m
 */
export interface MaximumDimensions {
    depth?:  number;
    height?: number;
    width?:  number;
    [property: string]: any;
}

export interface ImpedanceAtFrequency {
    frequency: number;
    impedance: ImpedancePoint;
    [property: string]: any;
}

/**
 * Data describing one impendance value
 */
export interface ImpedancePoint {
    imaginaryPart?: number;
    magnitude:      number;
    phase?:         number;
    realPart?:      number;
    [property: string]: any;
}

/**
 * Type of the terminal
 */
export enum ConnectionType {
    FlyingLead = "Flying Lead",
    Pin = "Pin",
    Screw = "Screw",
    Smt = "SMT",
}

/**
 * Topology that will use the magnetic
 */
export enum Topology {
    ActiveClampForwardConverter = "Active Clamp Forward Converter",
    BoostConverter = "Boost Converter",
    BuckConverter = "Buck Converter",
    CukConverter = "Cuk Converter",
    FlybackConverter = "Flyback Converter",
    FullBridgeConverter = "Full-Bridge Converter",
    HalfBridgeConverter = "Half-Bridge Converter",
    InvertingBuckBoostConverter = "Inverting Buck-Boost Converter",
    PhaseShiftedFullBridgeConverter = "Phase-Shifted Full-Bridge Converter",
    PushPullConverter = "Push-Pull Converter",
    Sepic = "SEPIC",
    SingleSwitchForwardConverter = "Single Switch Forward Converter",
    TwoSwitchFlybackConverter = "Two Switch Flyback Converter",
    TwoSwitchForwardConverter = "Two Switch Forward Converter",
    WeinbergConverter = "Weinberg Converter",
    ZetaConverter = "Zeta Converter",
}

/**
 * Technology that must be used to create the wiring
 */
export enum WiringTechnology {
    Deposition = "Deposition",
    Printed = "Printed",
    Wound = "Wound",
}

/**
 * Data describing one operating point, including the operating conditions and the
 * excitations for all ports
 *
 * Excitation of the current per winding that produced the winding losses
 */
export interface OperatingPoint {
    conditions:            OperatingConditions;
    excitationsPerWinding: OperatingPointExcitation[];
    /**
     * Name describing this operating point
     */
    name?: string;
    [property: string]: any;
}

/**
 * The description of a magnetic operating conditions
 */
export interface OperatingConditions {
    /**
     * Relative Humidity of the ambient where the magnetic will operate
     */
    ambientRelativeHumidity?: number;
    /**
     * Temperature of the ambient where the magnetic will operate
     */
    ambientTemperature: number;
    /**
     * Relative Humidity of the ambient where the magnetic will operate
     */
    cooling?: Cooling;
    /**
     * A label that identifies this Operating Conditions
     */
    name?: string;
    [property: string]: any;
}

/**
 * Relative Humidity of the ambient where the magnetic will operate
 *
 * Data describing a natural convection cooling
 *
 * Data describing a forced convection cooling
 *
 * Data describing a heatsink cooling
 *
 * Data describing a cold plate cooling
 */
export interface Cooling {
    /**
     * Name of the fluid used
     */
    fluid?: string;
    /**
     * Temperature of the fluid. To be used only if different from ambient temperature
     */
    temperature?: number;
    /**
     * Diameter of the fluid flow, normally defined as a fan diameter
     */
    flowDiameter?: number;
    velocity?:     number[];
    /**
     * Dimensions of the cube defining the heatsink
     *
     * Dimensions of the cube defining the cold plate
     */
    dimensions?: number[];
    /**
     * Bulk thermal resistance of the thermal interface used to connect the device to the
     * heatsink, in W/mK
     *
     * Bulk thermal resistance of the thermal interface used to connect the device to the cold
     * plate, in W/mK
     */
    interfaceThermalResistance?: number;
    /**
     * Thickness of the thermal interface used to connect the device to the heatsink, in m
     *
     * Thickness of the thermal interface used to connect the device to the cold plate, in m
     */
    interfaceThickness?: number;
    /**
     * Bulk thermal resistance of the heat sink, in W/K
     *
     * Bulk thermal resistance of the cold plate, in W/K
     */
    thermalResistance?: number;
    /**
     * Maximum temperature of the cold plate
     */
    maximumTemperature?: number;
    [property: string]: any;
}

/**
 * Data describing the excitation of the winding
 *
 * The description of a magnetic operating point
 */
export interface OperatingPointExcitation {
    current?: SignalDescriptor;
    /**
     * Frequency of the waveform, common for all electromagnetic parameters, in Hz
     */
    frequency:              number;
    magneticFieldStrength?: SignalDescriptor;
    magneticFluxDensity?:   SignalDescriptor;
    magnetizingCurrent?:    SignalDescriptor;
    /**
     * A label that identifies this Operating Point
     */
    name?:    string;
    voltage?: SignalDescriptor;
    [property: string]: any;
}

/**
 * Excitation of the B field that produced the core losses
 *
 * Structure definining one electromagnetic parameters: current, voltage, magnetic flux
 * density
 */
export interface SignalDescriptor {
    /**
     * Data containing the harmonics of the waveform, defined by a list of amplitudes and a list
     * of frequencies
     */
    harmonics?: Harmonics;
    processed?: Processed;
    waveform?:  Waveform;
    [property: string]: any;
}

/**
 * Data containing the harmonics of the waveform, defined by a list of amplitudes and a list
 * of frequencies
 */
export interface Harmonics {
    /**
     * List of amplitudes of the harmonics that compose the waveform
     */
    amplitudes: number[];
    /**
     * List of frequencies of the harmonics that compose the waveform
     */
    frequencies: number[];
    [property: string]: any;
}

export interface Processed {
    /**
     * The effective frequency value of the AC component of the waveform, according to
     * https://sci-hub.wf/https://ieeexplore.ieee.org/document/750181, Appendix C
     */
    acEffectiveFrequency?: number;
    /**
     * The average value of the waveform, referred to 0
     */
    average?: number;
    /**
     * The duty cycle of the waveform, if applicable
     */
    dutyCycle?: number;
    /**
     * The effective frequency value of the waveform, according to
     * https://sci-hub.wf/https://ieeexplore.ieee.org/document/750181, Appendix C
     */
    effectiveFrequency?: number;
    label:               WaveformLabel;
    /**
     * The offset value of the waveform, referred to 0
     */
    offset: number;
    /**
     * The maximum positive value of the waveform
     */
    peak?: number;
    /**
     * The peak to peak value of the waveform
     */
    peakToPeak?: number;
    /**
     * The phase of the waveform, in degrees
     */
    phase?: number;
    /**
     * The RMS value of the waveform
     */
    rms?: number;
    /**
     * The Total Harmonic Distortion of the waveform, according to
     * https://en.wikipedia.org/wiki/Total_harmonic_distortion
     */
    thd?: number;
    [property: string]: any;
}

/**
 * Label of the waveform, if applicable. Used for common waveforms
 */
export enum WaveformLabel {
    BipolarRectangular = "Bipolar Rectangular",
    BipolarTriangular = "Bipolar Triangular",
    Custom = "Custom",
    FlybackPrimary = "Flyback Primary",
    FlybackSecondary = "Flyback Secondary",
    FlybackSecondaryDcm = "FlybackSecondaryDCM",
    FlybackSecondaryWithDeadtime = "Flyback Secondary With Deadtime",
    Rectangular = "Rectangular",
    RectangularDcm = "RectangularDCM",
    RectangularWithDeadtime = "Rectangular With Deadtime",
    Sinusoidal = "Sinusoidal",
    Triangular = "Triangular",
    UnipolarRectangular = "Unipolar Rectangular",
    UnipolarTriangular = "Unipolar Triangular",
}

/**
 * Data containing the points that define an arbitrary waveform with equidistant points
 *
 * Data containing the points that define an arbitrary waveform with non-equidistant points
 * paired with their time in the period
 */
export interface Waveform {
    /**
     * List of values that compose the waveform, at equidistant times form each other
     */
    data: number[];
    /**
     * The number of periods covered by the data
     */
    numberPeriods?:  number;
    ancillaryLabel?: WaveformLabel;
    time?:           number[];
    [property: string]: any;
}

/**
 * The description of a magnetic
 */
export interface Magnetic {
    /**
     * Data describing the coil
     */
    coil: Coil;
    /**
     * Data describing the magnetic core.
     */
    core: MagneticCore;
    /**
     * The lists of distributors of the magnetic
     */
    distributorsInfo?: DistributorInfo[];
    manufacturerInfo?: MagneticManufacturerInfo;
    /**
     * The rotation of the magnetic, by default the winding column goes vertical
     */
    rotation?: number[];
    [property: string]: any;
}

/**
 * Data describing the coil
 *
 * The description of a magnetic coil
 */
export interface Coil {
    bobbin: Bobbin | string;
    /**
     * The data from the coil based on its function, in a way that can be used by analytical
     * models of only Magnetism.
     */
    functionalDescription: CoilFunctionalDescription[];
    /**
     * The data from the coil at the layer level, in a way that can be used by more advanced
     * analytical and finite element models
     */
    layersDescription?: Layer[];
    /**
     * The data from the coil at the section level, in a way that can be used by more advanced
     * analytical and finite element models
     */
    sectionsDescription?: Section[];
    /**
     * The data from the coil at the turn level, in a way that can be used by the most advanced
     * analytical and finite element models
     */
    turnsDescription?: Turn[];
    [property: string]: any;
}

/**
 * The description of a bobbin
 */
export interface Bobbin {
    /**
     * The lists of distributors of the magnetic bobbin
     */
    distributorsInfo?: DistributorInfo[];
    /**
     * The data from the bobbin based on its function, in a way that can be used by analytical
     * models.
     */
    functionalDescription?: BobbinFunctionalDescription;
    manufacturerInfo?:      ManufacturerInfo;
    /**
     * The name of bobbin
     */
    name?:                 string;
    processedDescription?: CoreBobbinProcessedDescription;
    [property: string]: any;
}

/**
 * Data from the distributor for a given part
 */
export interface DistributorInfo {
    /**
     * The distributor's price for this part
     */
    cost?: number;
    /**
     * The country of the distributor of the part
     */
    country?: string;
    /**
     * The area where the distributor doistributes
     */
    distributedArea?: string;
    /**
     * The distributor's email
     */
    email?: string;
    /**
     * The distributor's link
     */
    link?: string;
    /**
     * The name of the distributor of the part
     */
    name: string;
    /**
     * The distributor's phone
     */
    phone?: string;
    /**
     * The number of individual pieces available in the distributor
     */
    quantity: number;
    /**
     * The distributor's reference of this part
     */
    reference: string;
    /**
     * The date that this information was updated
     */
    updatedAt?: string;
    [property: string]: any;
}

/**
 * The data from the bobbin based on its function, in a way that can be used by analytical
 * models.
 */
export interface BobbinFunctionalDescription {
    /**
     * List of connections between windings and pins
     */
    connections?: PinWIndingConnection[];
    /**
     * The dimensions of a bobbin, keys must be as defined in EN 62317
     */
    dimensions: { [key: string]: number | DimensionWithTolerance };
    /**
     * The family of a bobbin
     */
    family: BobbinFamily;
    /**
     * The subtype of the shape, in case there are more than one
     */
    familySubtype?: string;
    pinout?:        Pinout;
    /**
     * The name of a bobbin that this bobbin belongs to
     */
    shape: string;
    /**
     * The type of a bobbin
     */
    type: FunctionalDescriptionType;
    [property: string]: any;
}

export interface PinWIndingConnection {
    /**
     * The name of the connected pin
     */
    pin?: string;
    /**
     * The name of the connected winding
     */
    winding?: string;
    [property: string]: any;
}

/**
 * The family of a bobbin
 */
export enum BobbinFamily {
    E = "e",
    Ec = "ec",
    Efd = "efd",
    El = "el",
    Ep = "ep",
    Er = "er",
    Etd = "etd",
    P = "p",
    Pm = "pm",
    Pq = "pq",
    Rm = "rm",
    U = "u",
}

/**
 * Data describing the pinout of a bobbin
 */
export interface Pinout {
    /**
     * The distance between central pins
     */
    centralPitch?: number;
    /**
     * The number of pins
     */
    numberPins: number;
    /**
     * List of pins per row
     */
    numberPinsPerRow?: number[];
    /**
     * The number of rows of a bobbin, typically 2
     */
    numberRows?:    number;
    pinDescription: Pin;
    /**
     * The distance between pins, per row, by pin order
     */
    pitch: number[];
    /**
     * The distance between a row of pins and the center of the bobbin
     */
    rowDistance: number;
    [property: string]: any;
}

/**
 * Data describing one pin in a bobbin
 */
export interface Pin {
    /**
     * The coordinates of the center of the pin, referred to the center of the main column
     */
    coordinates?: number[];
    /**
     * Dimensions of the rectangle defining the pin
     */
    dimensions: number[];
    /**
     * Name given to the pin
     */
    name?: string;
    /**
     * The rotation of the pin, default is vertical
     */
    rotation?: number[];
    /**
     * The shape of the pin
     */
    shape: PinShape;
    /**
     * Type of pin
     */
    type: PinDescriptionType;
    [property: string]: any;
}

/**
 * The shape of the pin
 */
export enum PinShape {
    Irregular = "irregular",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Type of pin
 */
export enum PinDescriptionType {
    Smd = "smd",
    Tht = "tht",
}

/**
 * The type of a bobbin
 *
 * The type of a magnetic shape
 */
export enum FunctionalDescriptionType {
    Custom = "custom",
    Standard = "standard",
}

/**
 * Data from the manufacturer for a given part
 */
export interface ManufacturerInfo {
    /**
     * The manufacturer's price for this part
     */
    cost?: string;
    /**
     * The manufacturer's URL to the datasheet of the product
     */
    datasheetUrl?: string;
    /**
     * The family of a magnetic, as defined by the manufacturer
     */
    family?: string;
    /**
     * The name of the manufacturer of the part
     */
    name: string;
    /**
     * The manufacturer's order code of this part
     */
    orderCode?: string;
    /**
     * The manufacturer's reference of this part
     */
    reference?: string;
    /**
     * The production status of a part according to its manufacturer
     */
    status?: Status;
    [property: string]: any;
}

/**
 * The production status of a part according to its manufacturer
 */
export enum Status {
    Obsolete = "obsolete",
    Production = "production",
    Prototype = "prototype",
}

export interface CoreBobbinProcessedDescription {
    /**
     * The depth of the central column wall, including thickness, in the z axis
     */
    columnDepth: number;
    columnShape: ColumnShape;
    /**
     * The thicknes of the central column wall, where the wire is wound, in the X axis
     */
    columnThickness: number;
    /**
     * The width of the central column wall, including thickness, in the x axis
     */
    columnWidth?: number;
    /**
     * The coordinates of the center of the bobbin central wall, whre the wires are wound,
     * referred to the center of the main column.
     */
    coordinates?: number[];
    /**
     * List of pins, geometrically defining how and where it is
     */
    pins?: Pin[];
    /**
     * The thicknes of the walls that hold the wire on both sides of the column
     */
    wallThickness: number;
    /**
     * List of winding windows, all elements in the list must be of the same type
     */
    windingWindows: WindingWindowElement[];
    [property: string]: any;
}

/**
 * Shape of the column, also used for gaps
 */
export enum ColumnShape {
    Irregular = "irregular",
    Oblong = "oblong",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * List of rectangular winding windows
 *
 * It is the area between the winding column and the closest lateral column, and it
 * represents the area where all the wires of the magnetic will have to fit, and
 * equivalently, where all the current must circulate once, in the case of inductors, or
 * twice, in the case of transformers
 *
 * List of radial winding windows
 *
 * It is the area between the delimited between a height from the surface of the toroidal
 * core at a given angle, and it represents the area where all the wires of the magnetic
 * will have to fit, and equivalently, where all the current must circulate once, in the
 * case of inductors, or twice, in the case of transformers
 */
export interface WindingWindowElement {
    /**
     * Area of the winding window
     */
    area?: number;
    /**
     * The coordinates of the center of the winding window, referred to the center of the main
     * column. In the case of half-sets, the center will be in the top point, where it would
     * join another half-set
     *
     * The coordinates of the point of the winding window where the middle height touches the
     * main column, referred to the center of the main column. In the case of half-sets, the
     * center will be in the top point, where it would join another half-set
     */
    coordinates?: number[];
    /**
     * Vertical height of the winding window
     */
    height?: number;
    /**
     * Way in which the sections are aligned inside the winding window
     */
    sectionsAlignment?: CoilAlignment;
    /**
     * Way in which the sections are oriented inside the winding window
     */
    sectionsOrientation?: WindingOrientation;
    /**
     * Shape of the winding window
     */
    shape?: WindingWindowShape;
    /**
     * Horizontal width of the winding window
     */
    width?: number;
    /**
     * Total angle of the window
     */
    angle?: number;
    /**
     * Radial height of the winding window
     */
    radialHeight?: number;
    [property: string]: any;
}

/**
 * Way in which the sections are aligned inside the winding window
 *
 * Way in which the turns are aligned inside the layer
 *
 * Way in which the layers are aligned inside the section
 */
export enum CoilAlignment {
    Centered = "centered",
    InnerOrTop = "inner or top",
    OuterOrBottom = "outer or bottom",
    Spread = "spread",
}

/**
 * Way in which the sections are oriented inside the winding window
 *
 * Way in which the layer is oriented inside the section
 *
 * Way in which the layers are oriented inside the section
 */
export enum WindingOrientation {
    Contiguous = "contiguous",
    Overlapping = "overlapping",
}

export enum WindingWindowShape {
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Data describing one winding associated with a magnetic
 */
export interface CoilFunctionalDescription {
    /**
     * Array on elements, representing the all the pins this winding is connected to
     */
    connections?:  ConnectionElement[];
    isolationSide: IsolationSide;
    /**
     * Name given to the winding
     */
    name: string;
    /**
     * Number of parallels in winding
     */
    numberParallels: number;
    /**
     * Number of turns in winding
     */
    numberTurns: number;
    wire:        Wire | string;
    [property: string]: any;
}

/**
 * Data describing the connection of the a wire
 */
export interface ConnectionElement {
    /**
     * Length of the connection, counted from the exit of the last turn until the terminal, in m
     */
    length?: number;
    /**
     * Metric of the terminal, if applicable
     */
    metric?: number;
    /**
     * Name of the pin where it is connected, if applicable
     */
    pinName?: string;
    type?:    ConnectionType;
    [property: string]: any;
}

/**
 * The description of a solid round magnet wire
 *
 * The description of a basic magnet wire
 *
 * The description of a solid foil magnet wire
 *
 * The description of a solid rectangular magnet wire
 *
 * The description of a stranded litz magnet wire
 *
 * The description of a solid planar magnet wire
 */
export interface Wire {
    /**
     * The conducting diameter of the wire, in m
     */
    conductingDiameter?: DimensionWithTolerance;
    material?:           WireMaterial | string;
    /**
     * The outer diameter of the wire, in m
     */
    outerDiameter?: DimensionWithTolerance;
    coating?:       InsulationWireCoating | string;
    /**
     * The conducting area of the wire, in m². Used for some rectangular shapes where the area
     * is smaller than expected due to rounded corners
     */
    conductingArea?:   DimensionWithTolerance;
    manufacturerInfo?: ManufacturerInfo;
    /**
     * The name of wire
     */
    name?: string;
    /**
     * The number of conductors in the wire
     */
    numberConductors?: number;
    /**
     * The standard of wire
     */
    standard?: WireStandard;
    /**
     * Name according to the standard of wire
     */
    standardName?: string;
    type:          WireType;
    /**
     * The conducting height of the wire, in m
     */
    conductingHeight?: DimensionWithTolerance;
    /**
     * The conducting width of the wire, in m
     */
    conductingWidth?: DimensionWithTolerance;
    /**
     * The outer height of the wire, in m
     */
    outerHeight?: DimensionWithTolerance;
    /**
     * The outer width of the wire, in m
     */
    outerWidth?: DimensionWithTolerance;
    /**
     * The radius of the edge, in case of rectangular wire, in m
     */
    edgeRadius?: DimensionWithTolerance;
    /**
     * The wire used as strands
     */
    strand?: WireRound | string;
    [property: string]: any;
}

/**
 * A coating for a wire
 */
export interface InsulationWireCoating {
    /**
     * The minimum voltage that causes a portion of an insulator to experience electrical
     * breakdown and become electrically conductive, in V
     */
    breakdownVoltage?: number;
    /**
     * The grade of the insulation around the wire
     */
    grade?:    number;
    material?: InsulationMaterial | string;
    /**
     * The number of layers of the insulation around the wire
     */
    numberLayers?: number;
    /**
     * The maximum temperature that the wire coating can withstand
     */
    temperatureRating?: number;
    /**
     * The maximum thickness of the insulation around the wire, in m
     */
    thickness?: DimensionWithTolerance;
    /**
     * The thickness of the layers of the insulation around the wire, in m
     */
    thicknessLayers?: number;
    /**
     * The type of the coating
     */
    type?: InsulationWireCoatingType;
    [property: string]: any;
}

/**
 * A material for insulation
 */
export interface InsulationMaterial {
    /**
     * Alternative names of the material
     */
    aliases?: string[];
    /**
     * The composition of a insulation material
     */
    composition?:       string;
    dielectricStrength: DielectricStrengthElement[];
    /**
     * The manufacturer of the insulation material
     */
    manufacturer?: string;
    /**
     * The melting temperature of the insulation material, in Celsius
     */
    meltingPoint?: number;
    /**
     * The name of a insulation material
     */
    name: string;
    /**
     * The dielectric constant of the insulation material
     */
    relativePermittivity?: number;
    /**
     * Resistivity value according to manufacturer
     */
    resistivity?: ResistivityPoint[];
    /**
     * The specific heat of the insulation material, in J / (Kg * K)
     */
    specificHeat?: number;
    /**
     * The temperature class of the insulation material, in Celsius
     */
    temperatureClass?: number;
    /**
     * The thermal conductivity of the insulation material, in W / (m * K)
     */
    thermalConductivity?: number;
    [property: string]: any;
}

/**
 * data for describing one point of dieletric strength
 */
export interface DielectricStrengthElement {
    /**
     * Humidity for the field value, in proportion over 1
     */
    humidity?: number;
    /**
     * Temperature for the field value, in Celsius
     */
    temperature?: number;
    /**
     * Thickness of the material
     */
    thickness?: number;
    /**
     * Dieletric strength value, in V / m
     */
    value: number;
    [property: string]: any;
}

/**
 * data for describing one point of resistivity
 */
export interface ResistivityPoint {
    /**
     * temperature for the field value, in Celsius
     */
    temperature?: number;
    /**
     * Resistivity value, in Ohm * m
     */
    value: number;
    [property: string]: any;
}

/**
 * The type of the coating
 */
export enum InsulationWireCoatingType {
    Bare = "bare",
    Enamelled = "enamelled",
    Extruded = "extruded",
    Insulated = "insulated",
    Served = "served",
    Taped = "taped",
}

/**
 * A material for wire
 */
export interface WireMaterial {
    /**
     * The name of a wire material
     */
    name: string;
    /**
     * The permeability of a wire material
     */
    permeability:         number;
    resistivity:          Resistivity;
    thermalConductivity?: ThermalConductivityElement[];
    [property: string]: any;
}

/**
 * data for describing the resistivity of a wire
 */
export interface Resistivity {
    /**
     * Temperature reference value, in Celsius
     */
    referenceTemperature: number;
    /**
     * Resistivity reference value, in Ohm * m
     */
    referenceValue: number;
    /**
     * Temperature coefficient value, alpha, in 1 / Celsius
     */
    temperatureCoefficient: number;
    [property: string]: any;
}

/**
 * data for describing one point of thermal conductivity
 */
export interface ThermalConductivityElement {
    /**
     * Temperature for the field value, in Celsius
     */
    temperature: number;
    /**
     * Thermal conductivity value, in W / m * K
     */
    value: number;
    [property: string]: any;
}

/**
 * The standard of wire
 */
export enum WireStandard {
    Iec60317 = "IEC 60317",
    Ipc6012 = "IPC-6012",
    NemaMw1000C = "NEMA MW 1000 C",
}

/**
 * The description of a solid round magnet wire
 *
 * The description of a basic magnet wire
 */
export interface WireRound {
    /**
     * The conducting diameter of the wire, in m
     */
    conductingDiameter: DimensionWithTolerance;
    material?:          WireMaterial | string;
    /**
     * The outer diameter of the wire, in m
     */
    outerDiameter?: DimensionWithTolerance;
    coating?:       InsulationWireCoating | string;
    /**
     * The conducting area of the wire, in m². Used for some rectangular shapes where the area
     * is smaller than expected due to rounded corners
     */
    conductingArea?:   DimensionWithTolerance;
    manufacturerInfo?: ManufacturerInfo;
    /**
     * The name of wire
     */
    name?: string;
    /**
     * The number of conductors in the wire
     */
    numberConductors?: number;
    /**
     * The standard of wire
     */
    standard?: WireStandard;
    /**
     * Name according to the standard of wire
     */
    standardName?: string;
    type:          WireType;
    [property: string]: any;
}

/**
 * The type of wire
 */
export enum WireType {
    Foil = "foil",
    Litz = "litz",
    Planar = "planar",
    Rectangular = "rectangular",
    Round = "round",
}

/**
 * Data describing one layer in a magnetic
 */
export interface Layer {
    /**
     * List of additional coordinates of the center of the layer, referred to the center of the
     * main column, in case the layer is not symmetrical, as in toroids
     */
    additionalCoordinates?: Array<number[]>;
    /**
     * The coordinates of the center of the layer, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the layer
     */
    dimensions: number[];
    /**
     * How much space in this layer is used by wires compared to the total
     */
    fillingFactor?: number;
    /**
     * In case of insulating layer, the material used
     */
    insulationMaterial?: InsulationMaterial | string;
    /**
     * Name given to the layer
     */
    name: string;
    /**
     * Way in which the layer is oriented inside the section
     */
    orientation: WindingOrientation;
    /**
     * List of partial windings in this layer
     */
    partialWindings: PartialWinding[];
    /**
     * The name of the section that this layer belongs to
     */
    section?: string;
    /**
     * Way in which the turns are aligned inside the layer
     */
    turnsAlignment?: CoilAlignment;
    /**
     * Type of the layer
     */
    type: ElectricalType;
    /**
     * Defines if the layer is wound by consecutive turns or parallels
     */
    windingStyle?: WindingStyle;
    [property: string]: any;
}

/**
 * System in which dimension and coordinates are in
 */
export enum CoordinateSystem {
    Cartesian = "cartesian",
    Polar = "polar",
}

/**
 * Data describing one part of winding, described by a list with the proportion of each
 * parallel in the winding that is contained here
 */
export interface PartialWinding {
    /**
     * Array on two elements, representing the input and output connection for this partial
     * winding
     */
    connections?: ConnectionElement[];
    /**
     * Number of parallels in winding
     */
    parallelsProportion: number[];
    /**
     * The name of the winding that this part belongs to
     */
    winding: string;
    [property: string]: any;
}

/**
 * Type of the layer
 */
export enum ElectricalType {
    Conduction = "conduction",
    Insulation = "insulation",
    Shielding = "shielding",
}

/**
 * Defines if the layer is wound by consecutive turns or parallels
 *
 * Defines if the section is wound by consecutive turns or parallels
 */
export enum WindingStyle {
    WindByConsecutiveParallels = "windByConsecutiveParallels",
    WindByConsecutiveTurns = "windByConsecutiveTurns",
}

/**
 * Data describing one section in a magnetic
 */
export interface Section {
    /**
     * The coordinates of the center of the section, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the section
     */
    dimensions: number[];
    /**
     * How much space in this section is used by wires compared to the total
     */
    fillingFactor?: number;
    /**
     * Way in which the layers are aligned inside the section
     */
    layersAlignment?: CoilAlignment;
    /**
     * Way in which the layers are oriented inside the section
     */
    layersOrientation: WindingOrientation;
    /**
     * Defines the distance in extremes of the section that is reserved to be filled with margin
     * tape. It is an array os two elements from inner or top, to outer or bottom
     */
    margin?: number[];
    /**
     * Name given to the winding
     */
    name: string;
    /**
     * List of partial windings in this section
     */
    partialWindings: PartialWinding[];
    /**
     * Type of the layer
     */
    type: ElectricalType;
    /**
     * Defines if the section is wound by consecutive turns or parallels
     */
    windingStyle?: WindingStyle;
    [property: string]: any;
}

/**
 * Data describing one turn in a magnetic
 */
export interface Turn {
    /**
     * List of additional coordinates of the center of the turn, referred to the center of the
     * main column, in case the turn is not symmetrical, as in toroids
     */
    additionalCoordinates?: Array<number[]>;
    /**
     * The angle that the turn does, useful for partial turns, in degrees
     */
    angle?: number;
    /**
     * The coordinates of the center of the turn, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * System in which dimension and coordinates are in
     */
    coordinateSystem?: CoordinateSystem;
    /**
     * Dimensions of the rectangle defining the turn
     */
    dimensions?: number[];
    /**
     * The name of the layer that this turn belongs to
     */
    layer?: string;
    /**
     * The length of the turn, referred from the center of its cross section, in m
     */
    length: number;
    /**
     * Name given to the turn
     */
    name: string;
    /**
     * Way in which the turn is wound
     */
    orientation?: TurnOrientation;
    /**
     * The index of the parallel that this turn belongs to
     */
    parallel: number;
    /**
     * Rotation of the rectangle defining the turn, in degrees
     */
    rotation?: number;
    /**
     * The name of the section that this turn belongs to
     */
    section?: string;
    /**
     * The name of the winding that this turn belongs to
     */
    winding: string;
    [property: string]: any;
}

/**
 * Way in which the turn is wound
 */
export enum TurnOrientation {
    Clockwise = "clockwise",
    CounterClockwise = "counterClockwise",
}

/**
 * Data describing the magnetic core.
 *
 * The description of a magnetic core
 */
export interface MagneticCore {
    /**
     * The lists of distributors of the magnetic core
     */
    distributorsInfo?: DistributorInfo[];
    /**
     * The data from the core based on its function, in a way that can be used by analytical
     * models.
     */
    functionalDescription: CoreFunctionalDescription;
    /**
     * List with data from the core based on its geometrical description, in a way that can be
     * used by CAD models.
     */
    geometricalDescription?: CoreGeometricalDescriptionElement[];
    manufacturerInfo?:       ManufacturerInfo;
    /**
     * The name of core
     */
    name?: string;
    /**
     * The data from the core after been processed, and ready to use by the analytical models
     */
    processedDescription?: CoreProcessedDescription;
    [property: string]: any;
}

/**
 * The data from the core based on its function, in a way that can be used by analytical
 * models.
 */
export interface CoreFunctionalDescription {
    /**
     * The coating of the core
     */
    coating?: Coating;
    /**
     * The lists of gaps in the magnetic core
     */
    gapping:  CoreGap[];
    material: CoreMaterial | string;
    /**
     * The number of stacked cores
     */
    numberStacks?: number;
    shape:         CoreShape | string;
    /**
     * The type of core
     */
    type: CoreType;
    [property: string]: any;
}

/**
 * The coating of the core
 */
export enum Coating {
    Epoxy = "epoxy",
    Parylene = "parylene",
}

/**
 * A gap for the magnetic cores
 */
export interface CoreGap {
    /**
     * Geometrical area of the gap
     */
    area?: number;
    /**
     * The coordinates of the center of the gap, referred to the center of the main column
     */
    coordinates?: number[];
    /**
     * The distance where the closest perpendicular surface is. This usually is half the winding
     * height
     */
    distanceClosestNormalSurface?: number;
    /**
     * The distance where the closest parallel surface is. This usually is the opposite side of
     * the winnding window
     */
    distanceClosestParallelSurface?: number;
    /**
     * The length of the gap
     */
    length: number;
    /**
     * Dimension of the section normal to the magnetic flux
     */
    sectionDimensions?: number[];
    shape?:             ColumnShape;
    /**
     * The type of a gap
     */
    type: GapType;
    [property: string]: any;
}

/**
 * The type of a gap
 */
export enum GapType {
    Additive = "additive",
    Residual = "residual",
    Subtractive = "subtractive",
}

/**
 * A material for the magnetic cores
 */
export interface CoreMaterial {
    bhCycle?: BhCycleElement[];
    /**
     * BH Cycle points where the magnetic flux density is 0
     */
    coerciveForce?: BhCycleElement[];
    /**
     * The temperature at which this material losses all ferromagnetism
     */
    curieTemperature?: number;
    /**
     * Density value according to manufacturer, in kg/m3
     */
    density?: number;
    /**
     * The family of a magnetic material according to its manufacturer
     */
    family?: string;
    /**
     * Heat capacity value according to manufacturer, in J/Kg/K
     */
    heatCapacity?: DimensionWithTolerance;
    /**
     * Heat conductivity value according to manufacturer, in W/m/K
     */
    heatConductivity?: DimensionWithTolerance;
    manufacturerInfo:  ManufacturerInfo;
    /**
     * The composition of a magnetic material
     */
    material: MaterialEnum;
    /**
     * The composition of a magnetic material
     */
    materialComposition?: MaterialCompositionEnum;
    /**
     * The name of a magnetic material
     */
    name: string;
    /**
     * The data regarding the relative permeability of a magnetic material
     */
    permeability: Permeabilities;
    /**
     * BH Cycle points where the magnetic field is 0
     */
    remanence?: BhCycleElement[];
    /**
     * Resistivity value according to manufacturer
     */
    resistivity: ResistivityPoint[];
    /**
     * BH Cycle points where a non-negligible increase in magnetic field produces a negligible
     * increase of magnetic flux density
     */
    saturation: BhCycleElement[];
    /**
     * The type of a magnetic material
     */
    type: CoreMaterialType;
    /**
     * The data regarding the volumetric losses of a magnetic material
     */
    volumetricLosses: { [key: string]: Array<VolumetricLossesPoint[] | CoreLossesMethodData> };
    [property: string]: any;
}

/**
 * data for describing one point of the BH cycle
 */
export interface BhCycleElement {
    /**
     * magnetic field value, in A/m
     */
    magneticField: number;
    /**
     * magnetic flux density value, in T
     */
    magneticFluxDensity: number;
    /**
     * temperature for the field value, in Celsius
     */
    temperature: number;
    [property: string]: any;
}

/**
 * The composition of a magnetic material
 */
export enum MaterialEnum {
    Amorphous = "amorphous",
    ElectricalSteel = "electricalSteel",
    Ferrite = "ferrite",
    Nanocrystalline = "nanocrystalline",
    Powder = "powder",
}

/**
 * The composition of a magnetic material
 */
export enum MaterialCompositionEnum {
    MgZn = "MgZn",
    MnZn = "MnZn",
    NiZn = "NiZn",
}

/**
 * The data regarding the relative permeability of a magnetic material
 */
export interface Permeabilities {
    amplitude?: PermeabilityPoint[] | PermeabilityPoint;
    /**
     * The data regarding the complex permeability of a magnetic material
     */
    complex?: ComplexPermeabilityData;
    initial:  PermeabilityPoint[] | PermeabilityPoint;
    [property: string]: any;
}

/**
 * data for describing one point of permebility
 */
export interface PermeabilityPoint {
    /**
     * Frequency of the Magnetic field, in Hz
     */
    frequency?: number;
    /**
     * DC bias in the magnetic field, in A/m
     */
    magneticFieldDcBias?: number;
    /**
     * magnetic flux density peak for the field value, in T
     */
    magneticFluxDensityPeak?: number;
    /**
     * The initial permeability of a magnetic material according to its manufacturer
     */
    modifiers?: { [key: string]: InitialPermeabilitModifier };
    /**
     * temperature for the field value, in Celsius
     */
    temperature?: number;
    /**
     * tolerance for the field value
     */
    tolerance?: number;
    /**
     * Permeability value
     */
    value: number;
    [property: string]: any;
}

/**
 * Object where keys are shape families for which this permeability is valid. If missing,
 * the variant is valid for all shapes
 *
 * Coefficients given by Magnetics in order to calculate the permeability of their cores
 *
 * Coefficients given by Micrometals in order to calculate the permeability of their cores
 *
 * Coefficients given by Fair-Rite in order to calculate the permeability of their materials
 */
export interface InitialPermeabilitModifier {
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the frequency, as factor = a + b * f + c * pow(f, 2) + d * pow(f, 3) + e * pow(f, 4)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the frequency, as factor = 1 / (a + b * pow(f, c) ) + d
     */
    frequencyFactor?: FrequencyFactor;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the H DC bias, as factor = a + b * pow(H, c)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the H DC bias, as factor = a + b * pow(H, c) + d
     */
    magneticFieldDcBiasFactor?: MagneticFieldDcBiasFactor;
    /**
     * Name of this method
     */
    method?: InitialPermeabilitModifierMethod;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as factor = a + b * T + c * pow(T, 2) + d * pow(T, 3) + e * pow(T, 4)
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as either factor = a * (T -20) * 0.0001 or factor = (a + c * T + e *
     * pow(T, 2)) / (1 + b * T + d * pow(T, 2))
     *
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the temperature, as either factor = a
     */
    temperatureFactor?: TemperatureFactor;
    /**
     * Field with the coefficients used to calculate how much the permeability decreases with
     * the B field, as factor = = 1 / ( 1 / ( a + b * pow(B,c)) + 1 / (d * pow(B, e) ) + 1 / f )
     */
    magneticFluxDensityFactor?: MagneticFluxDensityFactor;
    [property: string]: any;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the frequency, as factor = a + b * f + c * pow(f, 2) + d * pow(f, 3) + e * pow(f, 4)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the frequency, as factor = 1 / (a + b * pow(f, c) ) + d
 */
export interface FrequencyFactor {
    a:  number;
    b:  number;
    c:  number;
    d:  number;
    e?: number;
    [property: string]: any;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the H DC bias, as factor = a + b * pow(H, c)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the H DC bias, as factor = a + b * pow(H, c) + d
 */
export interface MagneticFieldDcBiasFactor {
    a:  number;
    b:  number;
    c:  number;
    d?: number;
    [property: string]: any;
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the B field, as factor = = 1 / ( 1 / ( a + b * pow(B,c)) + 1 / (d * pow(B, e) ) + 1 / f )
 */
export interface MagneticFluxDensityFactor {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    [property: string]: any;
}

export enum InitialPermeabilitModifierMethod {
    FairRite = "fair-rite",
    Magnetics = "magnetics",
    Micrometals = "micrometals",
}

/**
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as factor = a + b * T + c * pow(T, 2) + d * pow(T, 3) + e * pow(T, 4)
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as either factor = a * (T -20) * 0.0001 or factor = (a + c * T + e *
 * pow(T, 2)) / (1 + b * T + d * pow(T, 2))
 *
 * Field with the coefficients used to calculate how much the permeability decreases with
 * the temperature, as either factor = a
 */
export interface TemperatureFactor {
    a:  number;
    b?: number;
    c?: number;
    d?: number;
    e?: number;
    [property: string]: any;
}

/**
 * The data regarding the complex permeability of a magnetic material
 */
export interface ComplexPermeabilityData {
    imaginary: PermeabilityPoint[] | PermeabilityPoint;
    real:      PermeabilityPoint[] | PermeabilityPoint;
    [property: string]: any;
}

/**
 * The type of a magnetic material
 */
export enum CoreMaterialType {
    Commercial = "commercial",
    Custom = "custom",
}

/**
 * data for describing the volumetric losses at a given point of magnetic flux density,
 * frequency and temperature
 *
 * List of volumetric losses points
 */
export interface VolumetricLossesPoint {
    magneticFluxDensity: OperatingPointExcitation;
    /**
     * origin of the data
     */
    origin: string;
    /**
     * temperature value, in Celsius
     */
    temperature: number;
    /**
     * volumetric losses value, in W/m3
     */
    value: number;
    [property: string]: any;
}

/**
 * Steinmetz coefficients for estimating volumetric losses in a given frequency range
 *
 * Roshen coefficients for estimating volumetric losses
 *
 * Micrometals method for estimating volumetric losses
 *
 * Magnetics method for estimating volumetric losses
 *
 * Loss factor method for estimating volumetric losses
 */
export interface CoreLossesMethodData {
    /**
     * Name of this method
     */
    method:  CoreLossesMethodType;
    ranges?: SteinmetzCoreLossesMethodRangeDatum[];
    /**
     * List of coefficients for taking into account the excess losses and the dependencies of
     * the resistivity
     */
    coefficients?: RoshenAdditionalCoefficients;
    /**
     * List of reference volumetric losses used to estimate excess eddy current losses
     */
    referenceVolumetricLosses?: VolumetricLossesPoint[];
    a?:                         number;
    b?:                         number;
    c?:                         number;
    d?:                         number;
    factors?:                   LossFactorPoint[];
    [property: string]: any;
}

/**
 * List of coefficients for taking into account the excess losses and the dependencies of
 * the resistivity
 */
export interface RoshenAdditionalCoefficients {
    excessLossesCoefficient:                   number;
    resistivityFrequencyCoefficient:           number;
    resistivityMagneticFluxDensityCoefficient: number;
    resistivityOffset:                         number;
    resistivityTemperatureCoefficient:         number;
    [property: string]: any;
}

/**
 * Data for describing the loss factor at a given frequency and temperature
 */
export interface LossFactorPoint {
    /**
     * Frequency of the field, in Hz
     */
    frequency?: number;
    /**
     * temperature for the value, in Celsius
     */
    temperature?: number;
    /**
     * Loss Factor value
     */
    value: number;
    [property: string]: any;
}

export enum CoreLossesMethodType {
    LossFactor = "lossFactor",
    Magnetics = "magnetics",
    Micrometals = "micrometals",
    Roshen = "roshen",
    Steinmetz = "steinmetz",
}

export interface SteinmetzCoreLossesMethodRangeDatum {
    /**
     * frequency power coefficient alpha
     */
    alpha: number;
    /**
     * magnetic flux density power coefficient beta
     */
    beta: number;
    /**
     * Constant temperature coefficient ct0
     */
    ct0?: number;
    /**
     * Proportional negative temperature coefficient ct1
     */
    ct1?: number;
    /**
     * Square temperature coefficient ct2
     */
    ct2?: number;
    /**
     * Proportional coefficient k
     */
    k: number;
    /**
     * maximum frequency for which the coefficients are valid, in Hz
     */
    maximumFrequency?: number;
    /**
     * minimum frequency for which the coefficients are valid, in Hz
     */
    minimumFrequency?: number;
    [property: string]: any;
}

/**
 * A shape for the magnetic cores
 */
export interface CoreShape {
    /**
     * Alternative names of a magnetic shape
     */
    aliases?: string[];
    /**
     * The dimensions of a magnetic shape, keys must be as defined in EN 62317
     */
    dimensions?: { [key: string]: number | DimensionWithTolerance };
    /**
     * The family of a magnetic shape
     */
    family: CoreShapeFamily;
    /**
     * The subtype of the shape, in case there are more than one
     */
    familySubtype?: string;
    /**
     * Describes if the magnetic circuit of the shape is open, and can be combined with others;
     * or closed, and has to be used by itself
     */
    magneticCircuit?: MagneticCircuit;
    /**
     * The name of a magnetic shape
     */
    name?: string;
    /**
     * The type of a magnetic shape
     */
    type: FunctionalDescriptionType;
    [property: string]: any;
}

/**
 * The family of a magnetic shape
 */
export enum CoreShapeFamily {
    C = "c",
    Drum = "drum",
    E = "e",
    Ec = "ec",
    Efd = "efd",
    Ei = "ei",
    El = "el",
    Elp = "elp",
    Ep = "ep",
    Epx = "epx",
    Eq = "eq",
    Er = "er",
    Etd = "etd",
    H = "h",
    Lp = "lp",
    P = "p",
    PlanarE = "planar e",
    PlanarEl = "planar el",
    PlanarEr = "planar er",
    Pm = "pm",
    Pq = "pq",
    Pqi = "pqi",
    Rm = "rm",
    Rod = "rod",
    T = "t",
    U = "u",
    Ui = "ui",
    Ur = "ur",
    Ut = "ut",
}

/**
 * Describes if the magnetic circuit of the shape is open, and can be combined with others;
 * or closed, and has to be used by itself
 */
export enum MagneticCircuit {
    Closed = "closed",
    Open = "open",
}

/**
 * The type of core
 */
export enum CoreType {
    ClosedShape = "closed shape",
    PieceAndPlate = "piece and plate",
    Toroidal = "toroidal",
    TwoPieceSet = "two-piece set",
}

/**
 * The data from the core based on its geometrical description, in a way that can be used by
 * CAD models.
 *
 * Data describing the a piece of a core
 *
 * Data describing the spacer used to separate cores in additive gaps
 */
export interface CoreGeometricalDescriptionElement {
    /**
     * The coordinates of the top of the piece, referred to the center of the main column
     *
     * The coordinates of the center of the gap, referred to the center of the main column
     */
    coordinates: number[];
    machining?:  Machining[];
    material?:   CoreMaterial | string;
    /**
     * The rotation of the top of the piece from its original state, referred to the center of
     * the main column
     */
    rotation?: number[];
    shape?:    CoreShape | string;
    /**
     * The type of piece
     *
     * The type of spacer
     */
    type: CoreGeometricalDescriptionElementType;
    /**
     * Dimensions of the cube defining the spacer
     */
    dimensions?: number[];
    /**
     * Material of the spacer
     */
    insulationMaterial?: InsulationMaterial | string;
    [property: string]: any;
}

/**
 * Data describing the machining applied to a piece
 */
export interface Machining {
    /**
     * The coordinates of the start of the machining, referred to the top of the main column of
     * the piece
     */
    coordinates: number[];
    /**
     * Length of the machining
     */
    length: number;
    [property: string]: any;
}

/**
 * The type of piece
 *
 * The type of spacer
 */
export enum CoreGeometricalDescriptionElementType {
    Closed = "closed",
    HalfSet = "half set",
    Plate = "plate",
    Sheet = "sheet",
    Spacer = "spacer",
    Toroidal = "toroidal",
}

/**
 * The data from the core after been processed, and ready to use by the analytical models
 */
export interface CoreProcessedDescription {
    /**
     * List of columns in the core
     */
    columns: ColumnElement[];
    /**
     * Total depth of the core
     */
    depth:               number;
    effectiveParameters: EffectiveParameters;
    /**
     * Total height of the core
     */
    height: number;
    /**
     * Total width of the core
     */
    width: number;
    /**
     * List of winding windows, all elements in the list must be of the same type
     */
    windingWindows: WindingWindowElement[];
    [property: string]: any;
}

/**
 * Data describing a column of the core
 */
export interface ColumnElement {
    /**
     * Area of the section column, normal to the magnetic flux direction
     */
    area: number;
    /**
     * The coordinates of the center of the column, referred to the center of the main column.
     * In the case of half-sets, the center will be in the top point, where it would join
     * another half-set
     */
    coordinates: number[];
    /**
     * Depth of the column
     */
    depth: number;
    /**
     * Height of the column
     */
    height: number;
    /**
     * Minimum depth of the column, if irregular
     */
    minimumDepth?: number;
    /**
     * Minimum width of the column, if irregular
     */
    minimumWidth?: number;
    shape:         ColumnShape;
    /**
     * Name of the column
     */
    type: ColumnType;
    /**
     * Width of the column
     */
    width: number;
    [property: string]: any;
}

/**
 * Name of the column
 */
export enum ColumnType {
    Central = "central",
    Lateral = "lateral",
}

/**
 * Effective data of the magnetic core
 */
export interface EffectiveParameters {
    /**
     * This is the equivalent section that the magnetic flux traverses, because the shape of the
     * core is not uniform and its section changes along the path
     */
    effectiveArea: number;
    /**
     * This is the equivalent length that the magnetic flux travels through the core.
     */
    effectiveLength: number;
    /**
     * This is the product of the effective length by the effective area, and represents the
     * equivalent volume that is magnetized by the field
     */
    effectiveVolume: number;
    /**
     * This is the minimum area seen by the magnetic flux along its path
     */
    minimumArea: number;
    [property: string]: any;
}

export interface MagneticManufacturerInfo {
    /**
     * The manufacturer's price for this part
     */
    cost?: string;
    /**
     * The manufacturer's URL to the datasheet of the product
     */
    datasheetUrl?: string;
    /**
     * The family of a magnetic, as defined by the manufacturer
     */
    family?: string;
    /**
     * The name of the manufacturer of the part
     */
    name:             string;
    recommendations?: MagneticManufacturerRecommendations;
    /**
     * The manufacturer's reference of this part
     */
    reference?: string;
    /**
     * The production status of a part according to its manufacturer
     */
    status?: Status;
    [property: string]: any;
}

export interface MagneticManufacturerRecommendations {
    /**
     * The manufacturer's rated current for this part
     */
    ratedCurrent?: number;
    /**
     * The temperature rise for which the rated current is calculated
     */
    ratedCurrentTemperatureRise?: number;
    /**
     * The manufacturer's rated magnetic flux or volt-seconds for this part
     */
    ratedMagneticFlux?: number;
    /**
     * The manufacturer's saturation current for this part
     */
    saturationCurrent?: number;
    /**
     * Percentage of inductance drop at saturation current
     */
    saturationCurrentInductanceDrop?: number;
    [property: string]: any;
}

/**
 * The description of the outputs that result of simulating a Magnetic
 */
export interface Outputs {
    /**
     * Data describing the output core losses
     */
    coreLosses?: CoreLossesOutput;
    /**
     * Data describing the output impedance
     */
    impedance?: ImpedanceOutput;
    /**
     * Data describing the output insulation that the magnetic has
     */
    insulation?: DielectricVoltage[];
    /**
     * Data describing the output insulation coordination that the magnetic has
     */
    insulationCoordination?: InsulationCoordinationOutput;
    /**
     * Data describing the output leakage inductance
     */
    leakageInductance?: LeakageInductanceOutput;
    /**
     * Data describing the output magnetizing inductance
     */
    magnetizingInductance?: MagnetizingInductanceOutput;
    /**
     * Data describing the output stray capacitance
     */
    strayCapacitance?: StrayCapacitanceOutput[];
    /**
     * Data describing the output temperature
     */
    temperature?: TemperatureOutput;
    /**
     * Data describing the output winding losses
     */
    windingLosses?: WindingLossesOutput;
    /**
     * Data describing the output current field
     */
    windingWindowCurrentDensityField?: WindingWindowCurrentFieldOutput;
    /**
     * Data describing the output current field
     */
    windingWindowCurrentField?: WindingWindowCurrentFieldOutput;
    /**
     * Data describing the output magnetic strength field
     */
    windingWindowMagneticStrengthField?: WindingWindowMagneticStrengthFieldOutput;
    [property: string]: any;
}

/**
 * Data describing the output core losses
 *
 * Data describing the core losses and the intermediate inputs used to calculate them
 */
export interface CoreLossesOutput {
    /**
     * Value of the core losses
     */
    coreLosses: number;
    /**
     * Part of the core losses due to eddy currents
     */
    eddyCurrentCoreLosses?: number;
    /**
     * Part of the core losses due to hysteresis
     */
    hysteresisCoreLosses?: number;
    /**
     * Excitation of the B field that produced the core losses
     */
    magneticFluxDensity?: SignalDescriptor;
    /**
     * Model used to calculate the core losses in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * temperature in the core that produced the core losses
     */
    temperature?: number;
    /**
     * Volumetric value of the core losses
     */
    volumetricLosses?: number;
    [property: string]: any;
}

/**
 * Origin of the value of the result
 */
export enum ResultOrigin {
    Manufacturer = "manufacturer",
    Measurement = "measurement",
    Simulation = "simulation",
}

/**
 * Data describing the output impedance
 *
 * Data describing the impendance and the intermediate inputs used to calculate them
 */
export interface ImpedanceOutput {
    /**
     * List of inductance matrix per frequency
     */
    inductanceMatrix: InductanceMatrixAtFrequency[];
    /**
     * Model used to calculate the impedance in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * List of resistance matrix per frequency
     */
    resistanceMatrix: ResistanceMatrixAtFrequency[];
    [property: string]: any;
}

export interface InductanceMatrixAtFrequency {
    /**
     * Frequency of the inductance matrix
     */
    frequency: number;
    matrix:    Array<DimensionWithTolerance[]>;
    [property: string]: any;
}

export interface ResistanceMatrixAtFrequency {
    /**
     * Frequency of the resitance matrix
     */
    frequency: number;
    matrix:    Array<DimensionWithTolerance[]>;
    [property: string]: any;
}

/**
 * Data describing the output insulation that the magnetic has
 *
 * List of voltages that the magnetic can withstand
 */
export interface DielectricVoltage {
    /**
     * Duration of the voltate, or undefined if the field is not present
     */
    duration?: number;
    /**
     * Model used to calculate the voltage in the case of simulation, or method used to measure
     * it
     */
    methodUsed?: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
    /**
     * Voltage that the magnetic withstands
     */
    voltage: number;
    /**
     * Type of the voltage
     */
    voltageType: VoltageType;
    [property: string]: any;
}

/**
 * Type of the voltage
 */
export enum VoltageType {
    Ac = "AC",
    Dc = "DC",
}

/**
 * Data describing the output insulation coordination that the magnetic has
 *
 * List of voltages that the magnetic can withstand
 */
export interface InsulationCoordinationOutput {
    /**
     * Clearance required for this magnetic
     */
    clearance: number;
    /**
     * Creepage distance required for this magnetic
     */
    creepageDistance: number;
    /**
     * Distance through insulation required for this magnetic
     */
    distanceThroughInsulation: number;
    /**
     * Voltage that the magnetic withstands
     */
    withstandVoltage: number;
    /**
     * Duration of the voltate, or undefined if the field is not present
     */
    withstandVoltageDuration?: number;
    /**
     * Type of the voltage
     */
    withstandVoltageType?: VoltageType;
    [property: string]: any;
}

/**
 * Data describing the output leakage inductance
 *
 * Data describing the leakage inductance and the intermediate inputs used to calculate them
 */
export interface LeakageInductanceOutput {
    leakageInductancePerWinding: DimensionWithTolerance[];
    /**
     * Model used to calculate the leakage inductance in the case of simulation, or method used
     * to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    [property: string]: any;
}

/**
 * Data describing the output magnetizing inductance
 *
 * Data describing the magnetizing inductance and the intermediate inputs used to calculate
 * them
 */
export interface MagnetizingInductanceOutput {
    /**
     * Value of the reluctance of the core
     */
    coreReluctance: number;
    /**
     * Value of the reluctance of the gaps
     */
    gappingReluctance?: number;
    /**
     * Value of the magnetizing inductance
     */
    magnetizingInductance: DimensionWithTolerance;
    /**
     * Maximum value of the fringing of the gaps
     */
    maximumFringingFactor?: number;
    /**
     * Value of the maximum magnetic energy storable in the core
     */
    maximumMagneticEnergyCore?: number;
    /**
     * Value of the maximum magnetic energy storable in the gaps
     */
    maximumStorableMagneticEnergyGapping?: number;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * Value of the maximum magnetic energy storable in the gaps
     */
    reluctancePerGap?: AirGapReluctanceOutput[];
    /**
     * Value of the reluctance of the core
     */
    ungappedCoreReluctance?: number;
    [property: string]: any;
}

/**
 * Data describing the reluctance of an air gap
 */
export interface AirGapReluctanceOutput {
    /**
     * Value of the Fringing Factor
     */
    fringingFactor: number;
    /**
     * Value of the maximum magnetic energy storable in the gap
     */
    maximumStorableMagneticEnergy: number;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * Value of the reluctance of the gap
     */
    reluctance: number;
    [property: string]: any;
}

/**
 * Data describing the output stray capacitance
 *
 * Data describing the stray capacitance and the intermediate inputs used to calculate them
 */
export interface StrayCapacitanceOutput {
    /**
     * Model used to calculate the stray capacitance in the case of simulation, or method used
     * to measure it
     */
    methodUsed: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
    /**
     * Network of six equivalent capacitors that describe the capacitance between two given
     * windings
     */
    sixCapacitorNetworkPerWinding?: SixCapacitorNetworkPerWinding;
    /**
     * The three values of a three input electrostatic multipole that describe the capacitance
     * between two given windings
     */
    tripoleCapacitancePerWinding?: TripoleCapacitancePerWinding;
    /**
     * Voltage divider at the end of the physical turn
     */
    voltageDividerEndPerTurn?: number[];
    /**
     * Voltage divider at the start of the physical turn
     */
    voltageDividerStartPerTurn?: number[];
    /**
     * Voltage at the beginning of the physical turn
     */
    voltagePerTurn?: number[];
    [property: string]: any;
}

/**
 * Network of six equivalent capacitors that describe the capacitance between two given
 * windings
 */
export interface SixCapacitorNetworkPerWinding {
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c5: number;
    c6: number;
    [property: string]: any;
}

/**
 * The three values of a three input electrostatic multipole that describe the capacitance
 * between two given windings
 */
export interface TripoleCapacitancePerWinding {
    c1: number;
    c2: number;
    c3: number;
    [property: string]: any;
}

/**
 * Data describing the output temperature
 *
 * Data describing the temperature and the intermediate inputs used to calculate them
 */
export interface TemperatureOutput {
    /**
     * bulk thermal resistance of the whole magnetic
     */
    bulkThermalResistance?: number;
    /**
     * Temperature of the magnetic before it started working. If missing ambient temperature
     * must be assumed
     */
    initialTemperature?: number;
    /**
     * maximum temperature reached
     */
    maximumTemperature: number;
    /**
     * Model used to calculate the temperature in the case of simulation, or method used to
     * measure it
     */
    methodUsed:        string;
    origin:            ResultOrigin;
    temperaturePoint?: TemperaturePoint;
    [property: string]: any;
}

export interface TemperaturePoint {
    /**
     * The coordinates of the temperature point, referred to the center of the main column
     */
    coordinates: number[];
    /**
     * temperature at the point, in Celsius
     */
    value: number;
    [property: string]: any;
}

/**
 * Data describing the output winding losses
 *
 * Data describing the winding losses and the intermediate inputs used to calculate them
 */
export interface WindingLossesOutput {
    /**
     * Excitation of the current per physical turn that produced the winding losses
     */
    currentDividerPerTurn?: number[];
    /**
     * Excitation of the current per winding that produced the winding losses
     */
    currentPerWinding?: OperatingPoint;
    /**
     * List of DC resistance per turn
     */
    dcResistancePerTurn?: number[];
    /**
     * List of DC resistance per winding
     */
    dcResistancePerWinding?: number[];
    /**
     * Model used to calculate the winding losses in the case of simulation, or method used to
     * measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    /**
     * List of resistance matrix per frequency
     */
    resistanceMatrix?: ResistanceMatrixAtFrequency[];
    /**
     * temperature in the winding that produced the winding losses
     */
    temperature?: number;
    /**
     * Value of the winding losses
     */
    windingLosses:            number;
    windingLossesPerLayer?:   WindingLossesPerElement[];
    windingLossesPerSection?: WindingLossesPerElement[];
    windingLossesPerTurn?:    WindingLossesPerElement[];
    windingLossesPerWinding?: WindingLossesPerElement[];
    [property: string]: any;
}

export interface WindingLossesPerElement {
    /**
     * List of value of the winding ohmic losses
     */
    ohmicLosses?: OhmicLosses;
    /**
     * List of value of the winding proximity losses per harmonic
     */
    proximityEffectLosses?: WindingLossElement;
    /**
     * List of value of the winding skin losses per harmonic
     */
    skinEffectLosses?: WindingLossElement;
    [property: string]: any;
}

/**
 * List of value of the winding ohmic losses
 */
export interface OhmicLosses {
    /**
     * Value of the losses
     */
    losses: number;
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed?: string;
    /**
     * Origin of the value of the result
     */
    origin: ResultOrigin;
    [property: string]: any;
}

/**
 * List of value of the winding proximity losses per harmonic
 *
 * Data describing the losses due to either DC, skin effect, or proximity effect; in a given
 * element, which can be winding, section, layer or physical turn
 *
 * List of value of the winding skin losses per harmonic
 */
export interface WindingLossElement {
    /**
     * List of frequencies of the harmonics that are producing losses
     */
    harmonicFrequencies: number[];
    /**
     * Losses produced by each harmonic
     */
    lossesPerHarmonic: number[];
    /**
     * Model used to calculate the magnetizing inductance in the case of simulation, or method
     * used to measure it
     */
    methodUsed: string;
    origin:     ResultOrigin;
    [property: string]: any;
}

/**
 * Data describing the output current field
 *
 * Data describing the curren in the different chunks used in field calculation
 */
export interface WindingWindowCurrentFieldOutput {
    fieldPerFrequency: Field[];
    /**
     * Model used to calculate the current field
     */
    methodUsed: string;
    origin:     ResultOrigin;
    [property: string]: any;
}

/**
 * Data describing a field in a 2D or 3D space
 */
export interface Field {
    /**
     * Value of the magnetizing inductance
     */
    data: FieldPoint[];
    /**
     * Value of the field at this point
     */
    frequency: number;
    [property: string]: any;
}

/**
 * Data describing the value of a field in a 2D or 3D space
 */
export interface FieldPoint {
    /**
     * If this point has some special significance, can be identified with this label
     */
    label?: string;
    /**
     * The coordinates of the point of the field
     */
    point: number[];
    /**
     * Rotation of the rectangle defining the turn, in degrees
     */
    rotation?: number;
    /**
     * If this field point is inside of a wire, this is the index of the turn
     */
    turnIndex?: number;
    /**
     * If this field point is inside of a wire, this is the length of the turn
     */
    turnLength?: number;
    /**
     * Value of the field at this point
     */
    value: number;
    [property: string]: any;
}

/**
 * Data describing the output magnetic strength field
 */
export interface WindingWindowMagneticStrengthFieldOutput {
    fieldPerFrequency: ComplexField[];
    /**
     * Model used to calculate the magnetic strength field
     */
    methodUsed: string;
    origin:     ResultOrigin;
    [property: string]: any;
}

/**
 * Data describing a field in a 2D or 3D space
 */
export interface ComplexField {
    /**
     * Value of the magnetizing inductance
     */
    data: ComplexFieldPoint[];
    /**
     * Value of the field at this point
     */
    frequency: number;
    [property: string]: any;
}

/**
 * Data describing the complex value of a field in a 2D or 3D space
 */
export interface ComplexFieldPoint {
    /**
     * Imaginary value of the field at this point
     */
    imaginary: number;
    /**
     * If this point has some special significance, can be identified with this label
     */
    label?: string;
    /**
     * The coordinates of the point of the field
     */
    point: number[];
    /**
     * Real value of the field at this point
     */
    real: number;
    /**
     * If this field point is inside of a wire, this is the index of the turn
     */
    turnIndex?: number;
    /**
     * If this field point is inside of a wire, this is the length of the turn
     */
    turnLength?: number;
    [property: string]: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toMas(json: string): Mas {
        return cast(JSON.parse(json), r("Mas"));
    }

    public static masToJson(value: Mas): string {
        return JSON.stringify(uncast(value, r("Mas")), null, 2);
    }

    public static toInputs(json: string): Inputs {
        return cast(JSON.parse(json), r("Inputs"));
    }

    public static inputsToJson(value: Inputs): string {
        return JSON.stringify(uncast(value, r("Inputs")), null, 2);
    }

    public static toDesignRequirements(json: string): DesignRequirements {
        return cast(JSON.parse(json), r("DesignRequirements"));
    }

    public static designRequirementsToJson(value: DesignRequirements): string {
        return JSON.stringify(uncast(value, r("DesignRequirements")), null, 2);
    }

    public static toInsulationRequirements(json: string): InsulationRequirements {
        return cast(JSON.parse(json), r("InsulationRequirements"));
    }

    public static insulationRequirementsToJson(value: InsulationRequirements): string {
        return JSON.stringify(uncast(value, r("InsulationRequirements")), null, 2);
    }

    public static toDimensionWithTolerance(json: string): DimensionWithTolerance {
        return cast(JSON.parse(json), r("DimensionWithTolerance"));
    }

    public static dimensionWithToleranceToJson(value: DimensionWithTolerance): string {
        return JSON.stringify(uncast(value, r("DimensionWithTolerance")), null, 2);
    }

    public static toMaximumDimensions(json: string): MaximumDimensions {
        return cast(JSON.parse(json), r("MaximumDimensions"));
    }

    public static maximumDimensionsToJson(value: MaximumDimensions): string {
        return JSON.stringify(uncast(value, r("MaximumDimensions")), null, 2);
    }

    public static toImpedanceAtFrequency(json: string): ImpedanceAtFrequency {
        return cast(JSON.parse(json), r("ImpedanceAtFrequency"));
    }

    public static impedanceAtFrequencyToJson(value: ImpedanceAtFrequency): string {
        return JSON.stringify(uncast(value, r("ImpedanceAtFrequency")), null, 2);
    }

    public static toImpedancePoint(json: string): ImpedancePoint {
        return cast(JSON.parse(json), r("ImpedancePoint"));
    }

    public static impedancePointToJson(value: ImpedancePoint): string {
        return JSON.stringify(uncast(value, r("ImpedancePoint")), null, 2);
    }

    public static toOperatingPoint(json: string): OperatingPoint {
        return cast(JSON.parse(json), r("OperatingPoint"));
    }

    public static operatingPointToJson(value: OperatingPoint): string {
        return JSON.stringify(uncast(value, r("OperatingPoint")), null, 2);
    }

    public static toOperatingConditions(json: string): OperatingConditions {
        return cast(JSON.parse(json), r("OperatingConditions"));
    }

    public static operatingConditionsToJson(value: OperatingConditions): string {
        return JSON.stringify(uncast(value, r("OperatingConditions")), null, 2);
    }

    public static toCooling(json: string): Cooling {
        return cast(JSON.parse(json), r("Cooling"));
    }

    public static coolingToJson(value: Cooling): string {
        return JSON.stringify(uncast(value, r("Cooling")), null, 2);
    }

    public static toOperatingPointExcitation(json: string): OperatingPointExcitation {
        return cast(JSON.parse(json), r("OperatingPointExcitation"));
    }

    public static operatingPointExcitationToJson(value: OperatingPointExcitation): string {
        return JSON.stringify(uncast(value, r("OperatingPointExcitation")), null, 2);
    }

    public static toSignalDescriptor(json: string): SignalDescriptor {
        return cast(JSON.parse(json), r("SignalDescriptor"));
    }

    public static signalDescriptorToJson(value: SignalDescriptor): string {
        return JSON.stringify(uncast(value, r("SignalDescriptor")), null, 2);
    }

    public static toHarmonics(json: string): Harmonics {
        return cast(JSON.parse(json), r("Harmonics"));
    }

    public static harmonicsToJson(value: Harmonics): string {
        return JSON.stringify(uncast(value, r("Harmonics")), null, 2);
    }

    public static toProcessed(json: string): Processed {
        return cast(JSON.parse(json), r("Processed"));
    }

    public static processedToJson(value: Processed): string {
        return JSON.stringify(uncast(value, r("Processed")), null, 2);
    }

    public static toWaveform(json: string): Waveform {
        return cast(JSON.parse(json), r("Waveform"));
    }

    public static waveformToJson(value: Waveform): string {
        return JSON.stringify(uncast(value, r("Waveform")), null, 2);
    }

    public static toMagnetic(json: string): Magnetic {
        return cast(JSON.parse(json), r("Magnetic"));
    }

    public static magneticToJson(value: Magnetic): string {
        return JSON.stringify(uncast(value, r("Magnetic")), null, 2);
    }

    public static toCoil(json: string): Coil {
        return cast(JSON.parse(json), r("Coil"));
    }

    public static coilToJson(value: Coil): string {
        return JSON.stringify(uncast(value, r("Coil")), null, 2);
    }

    public static toBobbin(json: string): Bobbin {
        return cast(JSON.parse(json), r("Bobbin"));
    }

    public static bobbinToJson(value: Bobbin): string {
        return JSON.stringify(uncast(value, r("Bobbin")), null, 2);
    }

    public static toDistributorInfo(json: string): DistributorInfo {
        return cast(JSON.parse(json), r("DistributorInfo"));
    }

    public static distributorInfoToJson(value: DistributorInfo): string {
        return JSON.stringify(uncast(value, r("DistributorInfo")), null, 2);
    }

    public static toBobbinFunctionalDescription(json: string): BobbinFunctionalDescription {
        return cast(JSON.parse(json), r("BobbinFunctionalDescription"));
    }

    public static bobbinFunctionalDescriptionToJson(value: BobbinFunctionalDescription): string {
        return JSON.stringify(uncast(value, r("BobbinFunctionalDescription")), null, 2);
    }

    public static toPinWIndingConnection(json: string): PinWIndingConnection {
        return cast(JSON.parse(json), r("PinWIndingConnection"));
    }

    public static pinWIndingConnectionToJson(value: PinWIndingConnection): string {
        return JSON.stringify(uncast(value, r("PinWIndingConnection")), null, 2);
    }

    public static toPinout(json: string): Pinout {
        return cast(JSON.parse(json), r("Pinout"));
    }

    public static pinoutToJson(value: Pinout): string {
        return JSON.stringify(uncast(value, r("Pinout")), null, 2);
    }

    public static toPin(json: string): Pin {
        return cast(JSON.parse(json), r("Pin"));
    }

    public static pinToJson(value: Pin): string {
        return JSON.stringify(uncast(value, r("Pin")), null, 2);
    }

    public static toManufacturerInfo(json: string): ManufacturerInfo {
        return cast(JSON.parse(json), r("ManufacturerInfo"));
    }

    public static manufacturerInfoToJson(value: ManufacturerInfo): string {
        return JSON.stringify(uncast(value, r("ManufacturerInfo")), null, 2);
    }

    public static toCoreBobbinProcessedDescription(json: string): CoreBobbinProcessedDescription {
        return cast(JSON.parse(json), r("CoreBobbinProcessedDescription"));
    }

    public static coreBobbinProcessedDescriptionToJson(value: CoreBobbinProcessedDescription): string {
        return JSON.stringify(uncast(value, r("CoreBobbinProcessedDescription")), null, 2);
    }

    public static toWindingWindowElement(json: string): WindingWindowElement {
        return cast(JSON.parse(json), r("WindingWindowElement"));
    }

    public static windingWindowElementToJson(value: WindingWindowElement): string {
        return JSON.stringify(uncast(value, r("WindingWindowElement")), null, 2);
    }

    public static toCoilFunctionalDescription(json: string): CoilFunctionalDescription {
        return cast(JSON.parse(json), r("CoilFunctionalDescription"));
    }

    public static coilFunctionalDescriptionToJson(value: CoilFunctionalDescription): string {
        return JSON.stringify(uncast(value, r("CoilFunctionalDescription")), null, 2);
    }

    public static toConnectionElement(json: string): ConnectionElement {
        return cast(JSON.parse(json), r("ConnectionElement"));
    }

    public static connectionElementToJson(value: ConnectionElement): string {
        return JSON.stringify(uncast(value, r("ConnectionElement")), null, 2);
    }

    public static toWire(json: string): Wire {
        return cast(JSON.parse(json), r("Wire"));
    }

    public static wireToJson(value: Wire): string {
        return JSON.stringify(uncast(value, r("Wire")), null, 2);
    }

    public static toInsulationWireCoating(json: string): InsulationWireCoating {
        return cast(JSON.parse(json), r("InsulationWireCoating"));
    }

    public static insulationWireCoatingToJson(value: InsulationWireCoating): string {
        return JSON.stringify(uncast(value, r("InsulationWireCoating")), null, 2);
    }

    public static toInsulationMaterial(json: string): InsulationMaterial {
        return cast(JSON.parse(json), r("InsulationMaterial"));
    }

    public static insulationMaterialToJson(value: InsulationMaterial): string {
        return JSON.stringify(uncast(value, r("InsulationMaterial")), null, 2);
    }

    public static toDielectricStrengthElement(json: string): DielectricStrengthElement {
        return cast(JSON.parse(json), r("DielectricStrengthElement"));
    }

    public static dielectricStrengthElementToJson(value: DielectricStrengthElement): string {
        return JSON.stringify(uncast(value, r("DielectricStrengthElement")), null, 2);
    }

    public static toResistivityPoint(json: string): ResistivityPoint {
        return cast(JSON.parse(json), r("ResistivityPoint"));
    }

    public static resistivityPointToJson(value: ResistivityPoint): string {
        return JSON.stringify(uncast(value, r("ResistivityPoint")), null, 2);
    }

    public static toWireMaterial(json: string): WireMaterial {
        return cast(JSON.parse(json), r("WireMaterial"));
    }

    public static wireMaterialToJson(value: WireMaterial): string {
        return JSON.stringify(uncast(value, r("WireMaterial")), null, 2);
    }

    public static toResistivity(json: string): Resistivity {
        return cast(JSON.parse(json), r("Resistivity"));
    }

    public static resistivityToJson(value: Resistivity): string {
        return JSON.stringify(uncast(value, r("Resistivity")), null, 2);
    }

    public static toThermalConductivityElement(json: string): ThermalConductivityElement {
        return cast(JSON.parse(json), r("ThermalConductivityElement"));
    }

    public static thermalConductivityElementToJson(value: ThermalConductivityElement): string {
        return JSON.stringify(uncast(value, r("ThermalConductivityElement")), null, 2);
    }

    public static toWireRound(json: string): WireRound {
        return cast(JSON.parse(json), r("WireRound"));
    }

    public static wireRoundToJson(value: WireRound): string {
        return JSON.stringify(uncast(value, r("WireRound")), null, 2);
    }

    public static toLayer(json: string): Layer {
        return cast(JSON.parse(json), r("Layer"));
    }

    public static layerToJson(value: Layer): string {
        return JSON.stringify(uncast(value, r("Layer")), null, 2);
    }

    public static toPartialWinding(json: string): PartialWinding {
        return cast(JSON.parse(json), r("PartialWinding"));
    }

    public static partialWindingToJson(value: PartialWinding): string {
        return JSON.stringify(uncast(value, r("PartialWinding")), null, 2);
    }

    public static toSection(json: string): Section {
        return cast(JSON.parse(json), r("Section"));
    }

    public static sectionToJson(value: Section): string {
        return JSON.stringify(uncast(value, r("Section")), null, 2);
    }

    public static toTurn(json: string): Turn {
        return cast(JSON.parse(json), r("Turn"));
    }

    public static turnToJson(value: Turn): string {
        return JSON.stringify(uncast(value, r("Turn")), null, 2);
    }

    public static toMagneticCore(json: string): MagneticCore {
        return cast(JSON.parse(json), r("MagneticCore"));
    }

    public static magneticCoreToJson(value: MagneticCore): string {
        return JSON.stringify(uncast(value, r("MagneticCore")), null, 2);
    }

    public static toCoreFunctionalDescription(json: string): CoreFunctionalDescription {
        return cast(JSON.parse(json), r("CoreFunctionalDescription"));
    }

    public static coreFunctionalDescriptionToJson(value: CoreFunctionalDescription): string {
        return JSON.stringify(uncast(value, r("CoreFunctionalDescription")), null, 2);
    }

    public static toCoreGap(json: string): CoreGap {
        return cast(JSON.parse(json), r("CoreGap"));
    }

    public static coreGapToJson(value: CoreGap): string {
        return JSON.stringify(uncast(value, r("CoreGap")), null, 2);
    }

    public static toCoreMaterial(json: string): CoreMaterial {
        return cast(JSON.parse(json), r("CoreMaterial"));
    }

    public static coreMaterialToJson(value: CoreMaterial): string {
        return JSON.stringify(uncast(value, r("CoreMaterial")), null, 2);
    }

    public static toBhCycleElement(json: string): BhCycleElement {
        return cast(JSON.parse(json), r("BhCycleElement"));
    }

    public static bhCycleElementToJson(value: BhCycleElement): string {
        return JSON.stringify(uncast(value, r("BhCycleElement")), null, 2);
    }

    public static toPermeabilities(json: string): Permeabilities {
        return cast(JSON.parse(json), r("Permeabilities"));
    }

    public static permeabilitiesToJson(value: Permeabilities): string {
        return JSON.stringify(uncast(value, r("Permeabilities")), null, 2);
    }

    public static toPermeabilityPoint(json: string): PermeabilityPoint {
        return cast(JSON.parse(json), r("PermeabilityPoint"));
    }

    public static permeabilityPointToJson(value: PermeabilityPoint): string {
        return JSON.stringify(uncast(value, r("PermeabilityPoint")), null, 2);
    }

    public static toInitialPermeabilitModifier(json: string): InitialPermeabilitModifier {
        return cast(JSON.parse(json), r("InitialPermeabilitModifier"));
    }

    public static initialPermeabilitModifierToJson(value: InitialPermeabilitModifier): string {
        return JSON.stringify(uncast(value, r("InitialPermeabilitModifier")), null, 2);
    }

    public static toFrequencyFactor(json: string): FrequencyFactor {
        return cast(JSON.parse(json), r("FrequencyFactor"));
    }

    public static frequencyFactorToJson(value: FrequencyFactor): string {
        return JSON.stringify(uncast(value, r("FrequencyFactor")), null, 2);
    }

    public static toMagneticFieldDcBiasFactor(json: string): MagneticFieldDcBiasFactor {
        return cast(JSON.parse(json), r("MagneticFieldDcBiasFactor"));
    }

    public static magneticFieldDcBiasFactorToJson(value: MagneticFieldDcBiasFactor): string {
        return JSON.stringify(uncast(value, r("MagneticFieldDcBiasFactor")), null, 2);
    }

    public static toMagneticFluxDensityFactor(json: string): MagneticFluxDensityFactor {
        return cast(JSON.parse(json), r("MagneticFluxDensityFactor"));
    }

    public static magneticFluxDensityFactorToJson(value: MagneticFluxDensityFactor): string {
        return JSON.stringify(uncast(value, r("MagneticFluxDensityFactor")), null, 2);
    }

    public static toTemperatureFactor(json: string): TemperatureFactor {
        return cast(JSON.parse(json), r("TemperatureFactor"));
    }

    public static temperatureFactorToJson(value: TemperatureFactor): string {
        return JSON.stringify(uncast(value, r("TemperatureFactor")), null, 2);
    }

    public static toComplexPermeabilityData(json: string): ComplexPermeabilityData {
        return cast(JSON.parse(json), r("ComplexPermeabilityData"));
    }

    public static complexPermeabilityDataToJson(value: ComplexPermeabilityData): string {
        return JSON.stringify(uncast(value, r("ComplexPermeabilityData")), null, 2);
    }

    public static toVolumetricLossesPoint(json: string): VolumetricLossesPoint {
        return cast(JSON.parse(json), r("VolumetricLossesPoint"));
    }

    public static volumetricLossesPointToJson(value: VolumetricLossesPoint): string {
        return JSON.stringify(uncast(value, r("VolumetricLossesPoint")), null, 2);
    }

    public static toCoreLossesMethodData(json: string): CoreLossesMethodData {
        return cast(JSON.parse(json), r("CoreLossesMethodData"));
    }

    public static coreLossesMethodDataToJson(value: CoreLossesMethodData): string {
        return JSON.stringify(uncast(value, r("CoreLossesMethodData")), null, 2);
    }

    public static toRoshenAdditionalCoefficients(json: string): RoshenAdditionalCoefficients {
        return cast(JSON.parse(json), r("RoshenAdditionalCoefficients"));
    }

    public static roshenAdditionalCoefficientsToJson(value: RoshenAdditionalCoefficients): string {
        return JSON.stringify(uncast(value, r("RoshenAdditionalCoefficients")), null, 2);
    }

    public static toLossFactorPoint(json: string): LossFactorPoint {
        return cast(JSON.parse(json), r("LossFactorPoint"));
    }

    public static lossFactorPointToJson(value: LossFactorPoint): string {
        return JSON.stringify(uncast(value, r("LossFactorPoint")), null, 2);
    }

    public static toSteinmetzCoreLossesMethodRangeDatum(json: string): SteinmetzCoreLossesMethodRangeDatum {
        return cast(JSON.parse(json), r("SteinmetzCoreLossesMethodRangeDatum"));
    }

    public static steinmetzCoreLossesMethodRangeDatumToJson(value: SteinmetzCoreLossesMethodRangeDatum): string {
        return JSON.stringify(uncast(value, r("SteinmetzCoreLossesMethodRangeDatum")), null, 2);
    }

    public static toCoreShape(json: string): CoreShape {
        return cast(JSON.parse(json), r("CoreShape"));
    }

    public static coreShapeToJson(value: CoreShape): string {
        return JSON.stringify(uncast(value, r("CoreShape")), null, 2);
    }

    public static toCoreGeometricalDescriptionElement(json: string): CoreGeometricalDescriptionElement {
        return cast(JSON.parse(json), r("CoreGeometricalDescriptionElement"));
    }

    public static coreGeometricalDescriptionElementToJson(value: CoreGeometricalDescriptionElement): string {
        return JSON.stringify(uncast(value, r("CoreGeometricalDescriptionElement")), null, 2);
    }

    public static toMachining(json: string): Machining {
        return cast(JSON.parse(json), r("Machining"));
    }

    public static machiningToJson(value: Machining): string {
        return JSON.stringify(uncast(value, r("Machining")), null, 2);
    }

    public static toCoreProcessedDescription(json: string): CoreProcessedDescription {
        return cast(JSON.parse(json), r("CoreProcessedDescription"));
    }

    public static coreProcessedDescriptionToJson(value: CoreProcessedDescription): string {
        return JSON.stringify(uncast(value, r("CoreProcessedDescription")), null, 2);
    }

    public static toColumnElement(json: string): ColumnElement {
        return cast(JSON.parse(json), r("ColumnElement"));
    }

    public static columnElementToJson(value: ColumnElement): string {
        return JSON.stringify(uncast(value, r("ColumnElement")), null, 2);
    }

    public static toEffectiveParameters(json: string): EffectiveParameters {
        return cast(JSON.parse(json), r("EffectiveParameters"));
    }

    public static effectiveParametersToJson(value: EffectiveParameters): string {
        return JSON.stringify(uncast(value, r("EffectiveParameters")), null, 2);
    }

    public static toMagneticManufacturerInfo(json: string): MagneticManufacturerInfo {
        return cast(JSON.parse(json), r("MagneticManufacturerInfo"));
    }

    public static magneticManufacturerInfoToJson(value: MagneticManufacturerInfo): string {
        return JSON.stringify(uncast(value, r("MagneticManufacturerInfo")), null, 2);
    }

    public static toMagneticManufacturerRecommendations(json: string): MagneticManufacturerRecommendations {
        return cast(JSON.parse(json), r("MagneticManufacturerRecommendations"));
    }

    public static magneticManufacturerRecommendationsToJson(value: MagneticManufacturerRecommendations): string {
        return JSON.stringify(uncast(value, r("MagneticManufacturerRecommendations")), null, 2);
    }

    public static toOutputs(json: string): Outputs {
        return cast(JSON.parse(json), r("Outputs"));
    }

    public static outputsToJson(value: Outputs): string {
        return JSON.stringify(uncast(value, r("Outputs")), null, 2);
    }

    public static toCoreLossesOutput(json: string): CoreLossesOutput {
        return cast(JSON.parse(json), r("CoreLossesOutput"));
    }

    public static coreLossesOutputToJson(value: CoreLossesOutput): string {
        return JSON.stringify(uncast(value, r("CoreLossesOutput")), null, 2);
    }

    public static toImpedanceOutput(json: string): ImpedanceOutput {
        return cast(JSON.parse(json), r("ImpedanceOutput"));
    }

    public static impedanceOutputToJson(value: ImpedanceOutput): string {
        return JSON.stringify(uncast(value, r("ImpedanceOutput")), null, 2);
    }

    public static toInductanceMatrixAtFrequency(json: string): InductanceMatrixAtFrequency {
        return cast(JSON.parse(json), r("InductanceMatrixAtFrequency"));
    }

    public static inductanceMatrixAtFrequencyToJson(value: InductanceMatrixAtFrequency): string {
        return JSON.stringify(uncast(value, r("InductanceMatrixAtFrequency")), null, 2);
    }

    public static toResistanceMatrixAtFrequency(json: string): ResistanceMatrixAtFrequency {
        return cast(JSON.parse(json), r("ResistanceMatrixAtFrequency"));
    }

    public static resistanceMatrixAtFrequencyToJson(value: ResistanceMatrixAtFrequency): string {
        return JSON.stringify(uncast(value, r("ResistanceMatrixAtFrequency")), null, 2);
    }

    public static toDielectricVoltage(json: string): DielectricVoltage {
        return cast(JSON.parse(json), r("DielectricVoltage"));
    }

    public static dielectricVoltageToJson(value: DielectricVoltage): string {
        return JSON.stringify(uncast(value, r("DielectricVoltage")), null, 2);
    }

    public static toInsulationCoordinationOutput(json: string): InsulationCoordinationOutput {
        return cast(JSON.parse(json), r("InsulationCoordinationOutput"));
    }

    public static insulationCoordinationOutputToJson(value: InsulationCoordinationOutput): string {
        return JSON.stringify(uncast(value, r("InsulationCoordinationOutput")), null, 2);
    }

    public static toLeakageInductanceOutput(json: string): LeakageInductanceOutput {
        return cast(JSON.parse(json), r("LeakageInductanceOutput"));
    }

    public static leakageInductanceOutputToJson(value: LeakageInductanceOutput): string {
        return JSON.stringify(uncast(value, r("LeakageInductanceOutput")), null, 2);
    }

    public static toMagnetizingInductanceOutput(json: string): MagnetizingInductanceOutput {
        return cast(JSON.parse(json), r("MagnetizingInductanceOutput"));
    }

    public static magnetizingInductanceOutputToJson(value: MagnetizingInductanceOutput): string {
        return JSON.stringify(uncast(value, r("MagnetizingInductanceOutput")), null, 2);
    }

    public static toAirGapReluctanceOutput(json: string): AirGapReluctanceOutput {
        return cast(JSON.parse(json), r("AirGapReluctanceOutput"));
    }

    public static airGapReluctanceOutputToJson(value: AirGapReluctanceOutput): string {
        return JSON.stringify(uncast(value, r("AirGapReluctanceOutput")), null, 2);
    }

    public static toStrayCapacitanceOutput(json: string): StrayCapacitanceOutput {
        return cast(JSON.parse(json), r("StrayCapacitanceOutput"));
    }

    public static strayCapacitanceOutputToJson(value: StrayCapacitanceOutput): string {
        return JSON.stringify(uncast(value, r("StrayCapacitanceOutput")), null, 2);
    }

    public static toSixCapacitorNetworkPerWinding(json: string): SixCapacitorNetworkPerWinding {
        return cast(JSON.parse(json), r("SixCapacitorNetworkPerWinding"));
    }

    public static sixCapacitorNetworkPerWindingToJson(value: SixCapacitorNetworkPerWinding): string {
        return JSON.stringify(uncast(value, r("SixCapacitorNetworkPerWinding")), null, 2);
    }

    public static toTripoleCapacitancePerWinding(json: string): TripoleCapacitancePerWinding {
        return cast(JSON.parse(json), r("TripoleCapacitancePerWinding"));
    }

    public static tripoleCapacitancePerWindingToJson(value: TripoleCapacitancePerWinding): string {
        return JSON.stringify(uncast(value, r("TripoleCapacitancePerWinding")), null, 2);
    }

    public static toTemperatureOutput(json: string): TemperatureOutput {
        return cast(JSON.parse(json), r("TemperatureOutput"));
    }

    public static temperatureOutputToJson(value: TemperatureOutput): string {
        return JSON.stringify(uncast(value, r("TemperatureOutput")), null, 2);
    }

    public static toTemperaturePoint(json: string): TemperaturePoint {
        return cast(JSON.parse(json), r("TemperaturePoint"));
    }

    public static temperaturePointToJson(value: TemperaturePoint): string {
        return JSON.stringify(uncast(value, r("TemperaturePoint")), null, 2);
    }

    public static toWindingLossesOutput(json: string): WindingLossesOutput {
        return cast(JSON.parse(json), r("WindingLossesOutput"));
    }

    public static windingLossesOutputToJson(value: WindingLossesOutput): string {
        return JSON.stringify(uncast(value, r("WindingLossesOutput")), null, 2);
    }

    public static toWindingLossesPerElement(json: string): WindingLossesPerElement {
        return cast(JSON.parse(json), r("WindingLossesPerElement"));
    }

    public static windingLossesPerElementToJson(value: WindingLossesPerElement): string {
        return JSON.stringify(uncast(value, r("WindingLossesPerElement")), null, 2);
    }

    public static toOhmicLosses(json: string): OhmicLosses {
        return cast(JSON.parse(json), r("OhmicLosses"));
    }

    public static ohmicLossesToJson(value: OhmicLosses): string {
        return JSON.stringify(uncast(value, r("OhmicLosses")), null, 2);
    }

    public static toWindingLossElement(json: string): WindingLossElement {
        return cast(JSON.parse(json), r("WindingLossElement"));
    }

    public static windingLossElementToJson(value: WindingLossElement): string {
        return JSON.stringify(uncast(value, r("WindingLossElement")), null, 2);
    }

    public static toWindingWindowCurrentFieldOutput(json: string): WindingWindowCurrentFieldOutput {
        return cast(JSON.parse(json), r("WindingWindowCurrentFieldOutput"));
    }

    public static windingWindowCurrentFieldOutputToJson(value: WindingWindowCurrentFieldOutput): string {
        return JSON.stringify(uncast(value, r("WindingWindowCurrentFieldOutput")), null, 2);
    }

    public static toField(json: string): Field {
        return cast(JSON.parse(json), r("Field"));
    }

    public static fieldToJson(value: Field): string {
        return JSON.stringify(uncast(value, r("Field")), null, 2);
    }

    public static toFieldPoint(json: string): FieldPoint {
        return cast(JSON.parse(json), r("FieldPoint"));
    }

    public static fieldPointToJson(value: FieldPoint): string {
        return JSON.stringify(uncast(value, r("FieldPoint")), null, 2);
    }

    public static toWindingWindowMagneticStrengthFieldOutput(json: string): WindingWindowMagneticStrengthFieldOutput {
        return cast(JSON.parse(json), r("WindingWindowMagneticStrengthFieldOutput"));
    }

    public static windingWindowMagneticStrengthFieldOutputToJson(value: WindingWindowMagneticStrengthFieldOutput): string {
        return JSON.stringify(uncast(value, r("WindingWindowMagneticStrengthFieldOutput")), null, 2);
    }

    public static toComplexField(json: string): ComplexField {
        return cast(JSON.parse(json), r("ComplexField"));
    }

    public static complexFieldToJson(value: ComplexField): string {
        return JSON.stringify(uncast(value, r("ComplexField")), null, 2);
    }

    public static toComplexFieldPoint(json: string): ComplexFieldPoint {
        return cast(JSON.parse(json), r("ComplexFieldPoint"));
    }

    public static complexFieldPointToJson(value: ComplexFieldPoint): string {
        return JSON.stringify(uncast(value, r("ComplexFieldPoint")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Mas": o([
        { json: "inputs", js: "inputs", typ: r("Inputs") },
        { json: "magnetic", js: "magnetic", typ: r("Magnetic") },
        { json: "outputs", js: "outputs", typ: a(r("Outputs")) },
    ], "any"),
    "Inputs": o([
        { json: "designRequirements", js: "designRequirements", typ: r("DesignRequirements") },
        { json: "operatingPoints", js: "operatingPoints", typ: a(r("OperatingPoint")) },
    ], "any"),
    "DesignRequirements": o([
        { json: "insulation", js: "insulation", typ: u(undefined, r("InsulationRequirements")) },
        { json: "isolationSides", js: "isolationSides", typ: u(undefined, a(r("IsolationSide"))) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: r("DimensionWithTolerance") },
        { json: "market", js: "market", typ: u(undefined, r("Market")) },
        { json: "maximumDimensions", js: "maximumDimensions", typ: u(undefined, r("MaximumDimensions")) },
        { json: "maximumWeight", js: "maximumWeight", typ: u(undefined, 3.14) },
        { json: "minimumImpedance", js: "minimumImpedance", typ: u(undefined, a(r("ImpedanceAtFrequency"))) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "operatingTemperature", js: "operatingTemperature", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "strayCapacitance", js: "strayCapacitance", typ: u(undefined, a(r("DimensionWithTolerance"))) },
        { json: "terminalType", js: "terminalType", typ: u(undefined, a(r("ConnectionType"))) },
        { json: "topology", js: "topology", typ: u(undefined, r("Topology")) },
        { json: "turnsRatios", js: "turnsRatios", typ: a(r("DimensionWithTolerance")) },
        { json: "wiringTechnology", js: "wiringTechnology", typ: u(undefined, r("WiringTechnology")) },
    ], "any"),
    "InsulationRequirements": o([
        { json: "altitude", js: "altitude", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "cti", js: "cti", typ: u(undefined, r("Cti")) },
        { json: "insulationType", js: "insulationType", typ: u(undefined, r("InsulationType")) },
        { json: "mainSupplyVoltage", js: "mainSupplyVoltage", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "overvoltageCategory", js: "overvoltageCategory", typ: u(undefined, r("OvervoltageCategory")) },
        { json: "pollutionDegree", js: "pollutionDegree", typ: u(undefined, r("PollutionDegree")) },
        { json: "standards", js: "standards", typ: u(undefined, a(r("InsulationStandards"))) },
    ], "any"),
    "DimensionWithTolerance": o([
        { json: "excludeMaximum", js: "excludeMaximum", typ: u(undefined, true) },
        { json: "excludeMinimum", js: "excludeMinimum", typ: u(undefined, true) },
        { json: "maximum", js: "maximum", typ: u(undefined, 3.14) },
        { json: "minimum", js: "minimum", typ: u(undefined, 3.14) },
        { json: "nominal", js: "nominal", typ: u(undefined, 3.14) },
    ], "any"),
    "MaximumDimensions": o([
        { json: "depth", js: "depth", typ: u(undefined, 3.14) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "width", js: "width", typ: u(undefined, 3.14) },
    ], "any"),
    "ImpedanceAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "impedance", js: "impedance", typ: r("ImpedancePoint") },
    ], "any"),
    "ImpedancePoint": o([
        { json: "imaginaryPart", js: "imaginaryPart", typ: u(undefined, 3.14) },
        { json: "magnitude", js: "magnitude", typ: 3.14 },
        { json: "phase", js: "phase", typ: u(undefined, 3.14) },
        { json: "realPart", js: "realPart", typ: u(undefined, 3.14) },
    ], "any"),
    "OperatingPoint": o([
        { json: "conditions", js: "conditions", typ: r("OperatingConditions") },
        { json: "excitationsPerWinding", js: "excitationsPerWinding", typ: a(r("OperatingPointExcitation")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "OperatingConditions": o([
        { json: "ambientRelativeHumidity", js: "ambientRelativeHumidity", typ: u(undefined, 3.14) },
        { json: "ambientTemperature", js: "ambientTemperature", typ: 3.14 },
        { json: "cooling", js: "cooling", typ: u(undefined, r("Cooling")) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], "any"),
    "Cooling": o([
        { json: "fluid", js: "fluid", typ: u(undefined, "") },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "flowDiameter", js: "flowDiameter", typ: u(undefined, 3.14) },
        { json: "velocity", js: "velocity", typ: u(undefined, a(3.14)) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, a(3.14)) },
        { json: "interfaceThermalResistance", js: "interfaceThermalResistance", typ: u(undefined, 3.14) },
        { json: "interfaceThickness", js: "interfaceThickness", typ: u(undefined, 3.14) },
        { json: "thermalResistance", js: "thermalResistance", typ: u(undefined, 3.14) },
        { json: "maximumTemperature", js: "maximumTemperature", typ: u(undefined, 3.14) },
    ], "any"),
    "OperatingPointExcitation": o([
        { json: "current", js: "current", typ: u(undefined, r("SignalDescriptor")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "magneticFieldStrength", js: "magneticFieldStrength", typ: u(undefined, r("SignalDescriptor")) },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: u(undefined, r("SignalDescriptor")) },
        { json: "magnetizingCurrent", js: "magnetizingCurrent", typ: u(undefined, r("SignalDescriptor")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "voltage", js: "voltage", typ: u(undefined, r("SignalDescriptor")) },
    ], "any"),
    "SignalDescriptor": o([
        { json: "harmonics", js: "harmonics", typ: u(undefined, r("Harmonics")) },
        { json: "processed", js: "processed", typ: u(undefined, r("Processed")) },
        { json: "waveform", js: "waveform", typ: u(undefined, r("Waveform")) },
    ], "any"),
    "Harmonics": o([
        { json: "amplitudes", js: "amplitudes", typ: a(3.14) },
        { json: "frequencies", js: "frequencies", typ: a(3.14) },
    ], "any"),
    "Processed": o([
        { json: "acEffectiveFrequency", js: "acEffectiveFrequency", typ: u(undefined, 3.14) },
        { json: "average", js: "average", typ: u(undefined, 3.14) },
        { json: "dutyCycle", js: "dutyCycle", typ: u(undefined, 3.14) },
        { json: "effectiveFrequency", js: "effectiveFrequency", typ: u(undefined, 3.14) },
        { json: "label", js: "label", typ: r("WaveformLabel") },
        { json: "offset", js: "offset", typ: 3.14 },
        { json: "peak", js: "peak", typ: u(undefined, 3.14) },
        { json: "peakToPeak", js: "peakToPeak", typ: u(undefined, 3.14) },
        { json: "phase", js: "phase", typ: u(undefined, 3.14) },
        { json: "rms", js: "rms", typ: u(undefined, 3.14) },
        { json: "thd", js: "thd", typ: u(undefined, 3.14) },
    ], "any"),
    "Waveform": o([
        { json: "data", js: "data", typ: a(3.14) },
        { json: "numberPeriods", js: "numberPeriods", typ: u(undefined, 0) },
        { json: "ancillaryLabel", js: "ancillaryLabel", typ: u(undefined, r("WaveformLabel")) },
        { json: "time", js: "time", typ: u(undefined, a(3.14)) },
    ], "any"),
    "Magnetic": o([
        { json: "coil", js: "coil", typ: r("Coil") },
        { json: "core", js: "core", typ: r("MagneticCore") },
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("DistributorInfo"))) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("MagneticManufacturerInfo")) },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
    ], "any"),
    "Coil": o([
        { json: "bobbin", js: "bobbin", typ: u(r("Bobbin"), "") },
        { json: "functionalDescription", js: "functionalDescription", typ: a(r("CoilFunctionalDescription")) },
        { json: "layersDescription", js: "layersDescription", typ: u(undefined, a(r("Layer"))) },
        { json: "sectionsDescription", js: "sectionsDescription", typ: u(undefined, a(r("Section"))) },
        { json: "turnsDescription", js: "turnsDescription", typ: u(undefined, a(r("Turn"))) },
    ], "any"),
    "Bobbin": o([
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("DistributorInfo"))) },
        { json: "functionalDescription", js: "functionalDescription", typ: u(undefined, r("BobbinFunctionalDescription")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "processedDescription", js: "processedDescription", typ: u(undefined, r("CoreBobbinProcessedDescription")) },
    ], "any"),
    "DistributorInfo": o([
        { json: "cost", js: "cost", typ: u(undefined, 3.14) },
        { json: "country", js: "country", typ: u(undefined, "") },
        { json: "distributedArea", js: "distributedArea", typ: u(undefined, "") },
        { json: "email", js: "email", typ: u(undefined, "") },
        { json: "link", js: "link", typ: u(undefined, "") },
        { json: "name", js: "name", typ: "" },
        { json: "phone", js: "phone", typ: u(undefined, "") },
        { json: "quantity", js: "quantity", typ: 3.14 },
        { json: "reference", js: "reference", typ: "" },
        { json: "updatedAt", js: "updatedAt", typ: u(undefined, "") },
    ], "any"),
    "BobbinFunctionalDescription": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("PinWIndingConnection"))) },
        { json: "dimensions", js: "dimensions", typ: m(u(3.14, r("DimensionWithTolerance"))) },
        { json: "family", js: "family", typ: r("BobbinFamily") },
        { json: "familySubtype", js: "familySubtype", typ: u(undefined, "") },
        { json: "pinout", js: "pinout", typ: u(undefined, r("Pinout")) },
        { json: "shape", js: "shape", typ: "" },
        { json: "type", js: "type", typ: r("FunctionalDescriptionType") },
    ], "any"),
    "PinWIndingConnection": o([
        { json: "pin", js: "pin", typ: u(undefined, "") },
        { json: "winding", js: "winding", typ: u(undefined, "") },
    ], "any"),
    "Pinout": o([
        { json: "centralPitch", js: "centralPitch", typ: u(undefined, 3.14) },
        { json: "numberPins", js: "numberPins", typ: 0 },
        { json: "numberPinsPerRow", js: "numberPinsPerRow", typ: u(undefined, a(0)) },
        { json: "numberRows", js: "numberRows", typ: u(undefined, 0) },
        { json: "pinDescription", js: "pinDescription", typ: r("Pin") },
        { json: "pitch", js: "pitch", typ: a(3.14) },
        { json: "rowDistance", js: "rowDistance", typ: 3.14 },
    ], "any"),
    "Pin": o([
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: r("PinShape") },
        { json: "type", js: "type", typ: r("PinDescriptionType") },
    ], "any"),
    "ManufacturerInfo": o([
        { json: "cost", js: "cost", typ: u(undefined, "") },
        { json: "datasheetUrl", js: "datasheetUrl", typ: u(undefined, "") },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "name", js: "name", typ: "" },
        { json: "orderCode", js: "orderCode", typ: u(undefined, "") },
        { json: "reference", js: "reference", typ: u(undefined, "") },
        { json: "status", js: "status", typ: u(undefined, r("Status")) },
    ], "any"),
    "CoreBobbinProcessedDescription": o([
        { json: "columnDepth", js: "columnDepth", typ: 3.14 },
        { json: "columnShape", js: "columnShape", typ: r("ColumnShape") },
        { json: "columnThickness", js: "columnThickness", typ: 3.14 },
        { json: "columnWidth", js: "columnWidth", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "pins", js: "pins", typ: u(undefined, a(r("Pin"))) },
        { json: "wallThickness", js: "wallThickness", typ: 3.14 },
        { json: "windingWindows", js: "windingWindows", typ: a(r("WindingWindowElement")) },
    ], "any"),
    "WindingWindowElement": o([
        { json: "area", js: "area", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "sectionsAlignment", js: "sectionsAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "sectionsOrientation", js: "sectionsOrientation", typ: u(undefined, r("WindingOrientation")) },
        { json: "shape", js: "shape", typ: u(undefined, r("WindingWindowShape")) },
        { json: "width", js: "width", typ: u(undefined, 3.14) },
        { json: "angle", js: "angle", typ: u(undefined, 3.14) },
        { json: "radialHeight", js: "radialHeight", typ: u(undefined, 3.14) },
    ], "any"),
    "CoilFunctionalDescription": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("ConnectionElement"))) },
        { json: "isolationSide", js: "isolationSide", typ: r("IsolationSide") },
        { json: "name", js: "name", typ: "" },
        { json: "numberParallels", js: "numberParallels", typ: 0 },
        { json: "numberTurns", js: "numberTurns", typ: 0 },
        { json: "wire", js: "wire", typ: u(r("Wire"), "") },
    ], "any"),
    "ConnectionElement": o([
        { json: "length", js: "length", typ: u(undefined, 3.14) },
        { json: "metric", js: "metric", typ: u(undefined, 0) },
        { json: "pinName", js: "pinName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: u(undefined, r("ConnectionType")) },
    ], "any"),
    "Wire": o([
        { json: "conductingDiameter", js: "conductingDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "material", js: "material", typ: u(undefined, u(r("WireMaterial"), "")) },
        { json: "outerDiameter", js: "outerDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "coating", js: "coating", typ: u(undefined, u(r("InsulationWireCoating"), "")) },
        { json: "conductingArea", js: "conductingArea", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "numberConductors", js: "numberConductors", typ: u(undefined, 0) },
        { json: "standard", js: "standard", typ: u(undefined, r("WireStandard")) },
        { json: "standardName", js: "standardName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("WireType") },
        { json: "conductingHeight", js: "conductingHeight", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "conductingWidth", js: "conductingWidth", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "outerHeight", js: "outerHeight", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "outerWidth", js: "outerWidth", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "edgeRadius", js: "edgeRadius", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "strand", js: "strand", typ: u(undefined, u(r("WireRound"), "")) },
    ], "any"),
    "InsulationWireCoating": o([
        { json: "breakdownVoltage", js: "breakdownVoltage", typ: u(undefined, 3.14) },
        { json: "grade", js: "grade", typ: u(undefined, 0) },
        { json: "material", js: "material", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "numberLayers", js: "numberLayers", typ: u(undefined, 0) },
        { json: "temperatureRating", js: "temperatureRating", typ: u(undefined, 3.14) },
        { json: "thickness", js: "thickness", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "thicknessLayers", js: "thicknessLayers", typ: u(undefined, 3.14) },
        { json: "type", js: "type", typ: u(undefined, r("InsulationWireCoatingType")) },
    ], "any"),
    "InsulationMaterial": o([
        { json: "aliases", js: "aliases", typ: u(undefined, a("")) },
        { json: "composition", js: "composition", typ: u(undefined, "") },
        { json: "dielectricStrength", js: "dielectricStrength", typ: a(r("DielectricStrengthElement")) },
        { json: "manufacturer", js: "manufacturer", typ: u(undefined, "") },
        { json: "meltingPoint", js: "meltingPoint", typ: u(undefined, 3.14) },
        { json: "name", js: "name", typ: "" },
        { json: "relativePermittivity", js: "relativePermittivity", typ: u(undefined, 3.14) },
        { json: "resistivity", js: "resistivity", typ: u(undefined, a(r("ResistivityPoint"))) },
        { json: "specificHeat", js: "specificHeat", typ: u(undefined, 3.14) },
        { json: "temperatureClass", js: "temperatureClass", typ: u(undefined, 3.14) },
        { json: "thermalConductivity", js: "thermalConductivity", typ: u(undefined, 3.14) },
    ], "any"),
    "DielectricStrengthElement": o([
        { json: "humidity", js: "humidity", typ: u(undefined, 3.14) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "thickness", js: "thickness", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "ResistivityPoint": o([
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "WireMaterial": o([
        { json: "name", js: "name", typ: "" },
        { json: "permeability", js: "permeability", typ: 3.14 },
        { json: "resistivity", js: "resistivity", typ: r("Resistivity") },
        { json: "thermalConductivity", js: "thermalConductivity", typ: u(undefined, a(r("ThermalConductivityElement"))) },
    ], "any"),
    "Resistivity": o([
        { json: "referenceTemperature", js: "referenceTemperature", typ: 3.14 },
        { json: "referenceValue", js: "referenceValue", typ: 3.14 },
        { json: "temperatureCoefficient", js: "temperatureCoefficient", typ: 3.14 },
    ], "any"),
    "ThermalConductivityElement": o([
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "WireRound": o([
        { json: "conductingDiameter", js: "conductingDiameter", typ: r("DimensionWithTolerance") },
        { json: "material", js: "material", typ: u(undefined, u(r("WireMaterial"), "")) },
        { json: "outerDiameter", js: "outerDiameter", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "coating", js: "coating", typ: u(undefined, u(r("InsulationWireCoating"), "")) },
        { json: "conductingArea", js: "conductingArea", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "numberConductors", js: "numberConductors", typ: u(undefined, 0) },
        { json: "standard", js: "standard", typ: u(undefined, r("WireStandard")) },
        { json: "standardName", js: "standardName", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("WireType") },
    ], "any"),
    "Layer": o([
        { json: "additionalCoordinates", js: "additionalCoordinates", typ: u(undefined, a(a(3.14))) },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "fillingFactor", js: "fillingFactor", typ: u(undefined, 3.14) },
        { json: "insulationMaterial", js: "insulationMaterial", typ: u(undefined, u(r("InsulationMaterial"), "")) },
        { json: "name", js: "name", typ: "" },
        { json: "orientation", js: "orientation", typ: r("WindingOrientation") },
        { json: "partialWindings", js: "partialWindings", typ: a(r("PartialWinding")) },
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "turnsAlignment", js: "turnsAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "type", js: "type", typ: r("ElectricalType") },
        { json: "windingStyle", js: "windingStyle", typ: u(undefined, r("WindingStyle")) },
    ], "any"),
    "PartialWinding": o([
        { json: "connections", js: "connections", typ: u(undefined, a(r("ConnectionElement"))) },
        { json: "parallelsProportion", js: "parallelsProportion", typ: a(3.14) },
        { json: "winding", js: "winding", typ: "" },
    ], "any"),
    "Section": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: a(3.14) },
        { json: "fillingFactor", js: "fillingFactor", typ: u(undefined, 3.14) },
        { json: "layersAlignment", js: "layersAlignment", typ: u(undefined, r("CoilAlignment")) },
        { json: "layersOrientation", js: "layersOrientation", typ: r("WindingOrientation") },
        { json: "margin", js: "margin", typ: u(undefined, a(3.14)) },
        { json: "name", js: "name", typ: "" },
        { json: "partialWindings", js: "partialWindings", typ: a(r("PartialWinding")) },
        { json: "type", js: "type", typ: r("ElectricalType") },
        { json: "windingStyle", js: "windingStyle", typ: u(undefined, r("WindingStyle")) },
    ], "any"),
    "Turn": o([
        { json: "additionalCoordinates", js: "additionalCoordinates", typ: u(undefined, a(a(3.14))) },
        { json: "angle", js: "angle", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "coordinateSystem", js: "coordinateSystem", typ: u(undefined, r("CoordinateSystem")) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, a(3.14)) },
        { json: "layer", js: "layer", typ: u(undefined, "") },
        { json: "length", js: "length", typ: 3.14 },
        { json: "name", js: "name", typ: "" },
        { json: "orientation", js: "orientation", typ: u(undefined, r("TurnOrientation")) },
        { json: "parallel", js: "parallel", typ: 0 },
        { json: "rotation", js: "rotation", typ: u(undefined, 3.14) },
        { json: "section", js: "section", typ: u(undefined, "") },
        { json: "winding", js: "winding", typ: "" },
    ], "any"),
    "MagneticCore": o([
        { json: "distributorsInfo", js: "distributorsInfo", typ: u(undefined, a(r("DistributorInfo"))) },
        { json: "functionalDescription", js: "functionalDescription", typ: r("CoreFunctionalDescription") },
        { json: "geometricalDescription", js: "geometricalDescription", typ: u(undefined, a(r("CoreGeometricalDescriptionElement"))) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: u(undefined, r("ManufacturerInfo")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "processedDescription", js: "processedDescription", typ: u(undefined, r("CoreProcessedDescription")) },
    ], "any"),
    "CoreFunctionalDescription": o([
        { json: "coating", js: "coating", typ: u(undefined, r("Coating")) },
        { json: "gapping", js: "gapping", typ: a(r("CoreGap")) },
        { json: "material", js: "material", typ: u(r("CoreMaterial"), "") },
        { json: "numberStacks", js: "numberStacks", typ: u(undefined, 0) },
        { json: "shape", js: "shape", typ: u(r("CoreShape"), "") },
        { json: "type", js: "type", typ: r("CoreType") },
    ], "any"),
    "CoreGap": o([
        { json: "area", js: "area", typ: u(undefined, 3.14) },
        { json: "coordinates", js: "coordinates", typ: u(undefined, a(3.14)) },
        { json: "distanceClosestNormalSurface", js: "distanceClosestNormalSurface", typ: u(undefined, 3.14) },
        { json: "distanceClosestParallelSurface", js: "distanceClosestParallelSurface", typ: u(undefined, 3.14) },
        { json: "length", js: "length", typ: 3.14 },
        { json: "sectionDimensions", js: "sectionDimensions", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: u(undefined, r("ColumnShape")) },
        { json: "type", js: "type", typ: r("GapType") },
    ], "any"),
    "CoreMaterial": o([
        { json: "bhCycle", js: "bhCycle", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "coerciveForce", js: "coerciveForce", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "curieTemperature", js: "curieTemperature", typ: u(undefined, 3.14) },
        { json: "density", js: "density", typ: u(undefined, 3.14) },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "heatCapacity", js: "heatCapacity", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "heatConductivity", js: "heatConductivity", typ: u(undefined, r("DimensionWithTolerance")) },
        { json: "manufacturerInfo", js: "manufacturerInfo", typ: r("ManufacturerInfo") },
        { json: "material", js: "material", typ: r("MaterialEnum") },
        { json: "materialComposition", js: "materialComposition", typ: u(undefined, r("MaterialCompositionEnum")) },
        { json: "name", js: "name", typ: "" },
        { json: "permeability", js: "permeability", typ: r("Permeabilities") },
        { json: "remanence", js: "remanence", typ: u(undefined, a(r("BhCycleElement"))) },
        { json: "resistivity", js: "resistivity", typ: a(r("ResistivityPoint")) },
        { json: "saturation", js: "saturation", typ: a(r("BhCycleElement")) },
        { json: "type", js: "type", typ: r("CoreMaterialType") },
        { json: "volumetricLosses", js: "volumetricLosses", typ: m(a(u(a(r("VolumetricLossesPoint")), r("CoreLossesMethodData")))) },
    ], "any"),
    "BhCycleElement": o([
        { json: "magneticField", js: "magneticField", typ: 3.14 },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: 3.14 },
        { json: "temperature", js: "temperature", typ: 3.14 },
    ], "any"),
    "Permeabilities": o([
        { json: "amplitude", js: "amplitude", typ: u(undefined, u(a(r("PermeabilityPoint")), r("PermeabilityPoint"))) },
        { json: "complex", js: "complex", typ: u(undefined, r("ComplexPermeabilityData")) },
        { json: "initial", js: "initial", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
    ], "any"),
    "PermeabilityPoint": o([
        { json: "frequency", js: "frequency", typ: u(undefined, 3.14) },
        { json: "magneticFieldDcBias", js: "magneticFieldDcBias", typ: u(undefined, 3.14) },
        { json: "magneticFluxDensityPeak", js: "magneticFluxDensityPeak", typ: u(undefined, 3.14) },
        { json: "modifiers", js: "modifiers", typ: u(undefined, m(r("InitialPermeabilitModifier"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "tolerance", js: "tolerance", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "InitialPermeabilitModifier": o([
        { json: "frequencyFactor", js: "frequencyFactor", typ: u(undefined, r("FrequencyFactor")) },
        { json: "magneticFieldDcBiasFactor", js: "magneticFieldDcBiasFactor", typ: u(undefined, r("MagneticFieldDcBiasFactor")) },
        { json: "method", js: "method", typ: u(undefined, r("InitialPermeabilitModifierMethod")) },
        { json: "temperatureFactor", js: "temperatureFactor", typ: u(undefined, r("TemperatureFactor")) },
        { json: "magneticFluxDensityFactor", js: "magneticFluxDensityFactor", typ: u(undefined, r("MagneticFluxDensityFactor")) },
    ], "any"),
    "FrequencyFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: 3.14 },
        { json: "e", js: "e", typ: u(undefined, 3.14) },
    ], "any"),
    "MagneticFieldDcBiasFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
    ], "any"),
    "MagneticFluxDensityFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: 3.14 },
        { json: "c", js: "c", typ: 3.14 },
        { json: "d", js: "d", typ: 3.14 },
        { json: "e", js: "e", typ: 3.14 },
        { json: "f", js: "f", typ: 3.14 },
    ], "any"),
    "TemperatureFactor": o([
        { json: "a", js: "a", typ: 3.14 },
        { json: "b", js: "b", typ: u(undefined, 3.14) },
        { json: "c", js: "c", typ: u(undefined, 3.14) },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
        { json: "e", js: "e", typ: u(undefined, 3.14) },
    ], "any"),
    "ComplexPermeabilityData": o([
        { json: "imaginary", js: "imaginary", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
        { json: "real", js: "real", typ: u(a(r("PermeabilityPoint")), r("PermeabilityPoint")) },
    ], "any"),
    "VolumetricLossesPoint": o([
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: r("OperatingPointExcitation") },
        { json: "origin", js: "origin", typ: "" },
        { json: "temperature", js: "temperature", typ: 3.14 },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "CoreLossesMethodData": o([
        { json: "method", js: "method", typ: r("CoreLossesMethodType") },
        { json: "ranges", js: "ranges", typ: u(undefined, a(r("SteinmetzCoreLossesMethodRangeDatum"))) },
        { json: "coefficients", js: "coefficients", typ: u(undefined, r("RoshenAdditionalCoefficients")) },
        { json: "referenceVolumetricLosses", js: "referenceVolumetricLosses", typ: u(undefined, a(r("VolumetricLossesPoint"))) },
        { json: "a", js: "a", typ: u(undefined, 3.14) },
        { json: "b", js: "b", typ: u(undefined, 3.14) },
        { json: "c", js: "c", typ: u(undefined, 3.14) },
        { json: "d", js: "d", typ: u(undefined, 3.14) },
        { json: "factors", js: "factors", typ: u(undefined, a(r("LossFactorPoint"))) },
    ], "any"),
    "RoshenAdditionalCoefficients": o([
        { json: "excessLossesCoefficient", js: "excessLossesCoefficient", typ: 3.14 },
        { json: "resistivityFrequencyCoefficient", js: "resistivityFrequencyCoefficient", typ: 3.14 },
        { json: "resistivityMagneticFluxDensityCoefficient", js: "resistivityMagneticFluxDensityCoefficient", typ: 3.14 },
        { json: "resistivityOffset", js: "resistivityOffset", typ: 3.14 },
        { json: "resistivityTemperatureCoefficient", js: "resistivityTemperatureCoefficient", typ: 3.14 },
    ], "any"),
    "LossFactorPoint": o([
        { json: "frequency", js: "frequency", typ: u(undefined, 3.14) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "SteinmetzCoreLossesMethodRangeDatum": o([
        { json: "alpha", js: "alpha", typ: 3.14 },
        { json: "beta", js: "beta", typ: 3.14 },
        { json: "ct0", js: "ct0", typ: u(undefined, 3.14) },
        { json: "ct1", js: "ct1", typ: u(undefined, 3.14) },
        { json: "ct2", js: "ct2", typ: u(undefined, 3.14) },
        { json: "k", js: "k", typ: 3.14 },
        { json: "maximumFrequency", js: "maximumFrequency", typ: u(undefined, 3.14) },
        { json: "minimumFrequency", js: "minimumFrequency", typ: u(undefined, 3.14) },
    ], "any"),
    "CoreShape": o([
        { json: "aliases", js: "aliases", typ: u(undefined, a("")) },
        { json: "dimensions", js: "dimensions", typ: u(undefined, m(u(3.14, r("DimensionWithTolerance")))) },
        { json: "family", js: "family", typ: r("CoreShapeFamily") },
        { json: "familySubtype", js: "familySubtype", typ: u(undefined, "") },
        { json: "magneticCircuit", js: "magneticCircuit", typ: u(undefined, r("MagneticCircuit")) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "type", js: "type", typ: r("FunctionalDescriptionType") },
    ], "any"),
    "CoreGeometricalDescriptionElement": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "machining", js: "machining", typ: u(undefined, a(r("Machining"))) },
        { json: "material", js: "material", typ: u(undefined, u(r("CoreMaterial"), "")) },
        { json: "rotation", js: "rotation", typ: u(undefined, a(3.14)) },
        { json: "shape", js: "shape", typ: u(undefined, u(r("CoreShape"), "")) },
        { json: "type", js: "type", typ: r("CoreGeometricalDescriptionElementType") },
        { json: "dimensions", js: "dimensions", typ: u(undefined, a(3.14)) },
        { json: "insulationMaterial", js: "insulationMaterial", typ: u(undefined, u(r("InsulationMaterial"), "")) },
    ], "any"),
    "Machining": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "length", js: "length", typ: 3.14 },
    ], "any"),
    "CoreProcessedDescription": o([
        { json: "columns", js: "columns", typ: a(r("ColumnElement")) },
        { json: "depth", js: "depth", typ: 3.14 },
        { json: "effectiveParameters", js: "effectiveParameters", typ: r("EffectiveParameters") },
        { json: "height", js: "height", typ: 3.14 },
        { json: "width", js: "width", typ: 3.14 },
        { json: "windingWindows", js: "windingWindows", typ: a(r("WindingWindowElement")) },
    ], "any"),
    "ColumnElement": o([
        { json: "area", js: "area", typ: 3.14 },
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "depth", js: "depth", typ: 3.14 },
        { json: "height", js: "height", typ: 3.14 },
        { json: "minimumDepth", js: "minimumDepth", typ: u(undefined, 3.14) },
        { json: "minimumWidth", js: "minimumWidth", typ: u(undefined, 3.14) },
        { json: "shape", js: "shape", typ: r("ColumnShape") },
        { json: "type", js: "type", typ: r("ColumnType") },
        { json: "width", js: "width", typ: 3.14 },
    ], "any"),
    "EffectiveParameters": o([
        { json: "effectiveArea", js: "effectiveArea", typ: 3.14 },
        { json: "effectiveLength", js: "effectiveLength", typ: 3.14 },
        { json: "effectiveVolume", js: "effectiveVolume", typ: 3.14 },
        { json: "minimumArea", js: "minimumArea", typ: 3.14 },
    ], "any"),
    "MagneticManufacturerInfo": o([
        { json: "cost", js: "cost", typ: u(undefined, "") },
        { json: "datasheetUrl", js: "datasheetUrl", typ: u(undefined, "") },
        { json: "family", js: "family", typ: u(undefined, "") },
        { json: "name", js: "name", typ: "" },
        { json: "recommendations", js: "recommendations", typ: u(undefined, r("MagneticManufacturerRecommendations")) },
        { json: "reference", js: "reference", typ: u(undefined, "") },
        { json: "status", js: "status", typ: u(undefined, r("Status")) },
    ], "any"),
    "MagneticManufacturerRecommendations": o([
        { json: "ratedCurrent", js: "ratedCurrent", typ: u(undefined, 3.14) },
        { json: "ratedCurrentTemperatureRise", js: "ratedCurrentTemperatureRise", typ: u(undefined, 3.14) },
        { json: "ratedMagneticFlux", js: "ratedMagneticFlux", typ: u(undefined, 3.14) },
        { json: "saturationCurrent", js: "saturationCurrent", typ: u(undefined, 3.14) },
        { json: "saturationCurrentInductanceDrop", js: "saturationCurrentInductanceDrop", typ: u(undefined, 3.14) },
    ], "any"),
    "Outputs": o([
        { json: "coreLosses", js: "coreLosses", typ: u(undefined, r("CoreLossesOutput")) },
        { json: "impedance", js: "impedance", typ: u(undefined, r("ImpedanceOutput")) },
        { json: "insulation", js: "insulation", typ: u(undefined, a(r("DielectricVoltage"))) },
        { json: "insulationCoordination", js: "insulationCoordination", typ: u(undefined, r("InsulationCoordinationOutput")) },
        { json: "leakageInductance", js: "leakageInductance", typ: u(undefined, r("LeakageInductanceOutput")) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: u(undefined, r("MagnetizingInductanceOutput")) },
        { json: "strayCapacitance", js: "strayCapacitance", typ: u(undefined, a(r("StrayCapacitanceOutput"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, r("TemperatureOutput")) },
        { json: "windingLosses", js: "windingLosses", typ: u(undefined, r("WindingLossesOutput")) },
        { json: "windingWindowCurrentDensityField", js: "windingWindowCurrentDensityField", typ: u(undefined, r("WindingWindowCurrentFieldOutput")) },
        { json: "windingWindowCurrentField", js: "windingWindowCurrentField", typ: u(undefined, r("WindingWindowCurrentFieldOutput")) },
        { json: "windingWindowMagneticStrengthField", js: "windingWindowMagneticStrengthField", typ: u(undefined, r("WindingWindowMagneticStrengthFieldOutput")) },
    ], "any"),
    "CoreLossesOutput": o([
        { json: "coreLosses", js: "coreLosses", typ: 3.14 },
        { json: "eddyCurrentCoreLosses", js: "eddyCurrentCoreLosses", typ: u(undefined, 3.14) },
        { json: "hysteresisCoreLosses", js: "hysteresisCoreLosses", typ: u(undefined, 3.14) },
        { json: "magneticFluxDensity", js: "magneticFluxDensity", typ: u(undefined, r("SignalDescriptor")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "volumetricLosses", js: "volumetricLosses", typ: u(undefined, 3.14) },
    ], "any"),
    "ImpedanceOutput": o([
        { json: "inductanceMatrix", js: "inductanceMatrix", typ: a(r("InductanceMatrixAtFrequency")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "resistanceMatrix", js: "resistanceMatrix", typ: a(r("ResistanceMatrixAtFrequency")) },
    ], "any"),
    "InductanceMatrixAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "matrix", js: "matrix", typ: a(a(r("DimensionWithTolerance"))) },
    ], "any"),
    "ResistanceMatrixAtFrequency": o([
        { json: "frequency", js: "frequency", typ: 3.14 },
        { json: "matrix", js: "matrix", typ: a(a(r("DimensionWithTolerance"))) },
    ], "any"),
    "DielectricVoltage": o([
        { json: "duration", js: "duration", typ: u(undefined, 3.14) },
        { json: "methodUsed", js: "methodUsed", typ: u(undefined, "") },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "voltage", js: "voltage", typ: 3.14 },
        { json: "voltageType", js: "voltageType", typ: r("VoltageType") },
    ], "any"),
    "InsulationCoordinationOutput": o([
        { json: "clearance", js: "clearance", typ: 3.14 },
        { json: "creepageDistance", js: "creepageDistance", typ: 3.14 },
        { json: "distanceThroughInsulation", js: "distanceThroughInsulation", typ: 3.14 },
        { json: "withstandVoltage", js: "withstandVoltage", typ: 3.14 },
        { json: "withstandVoltageDuration", js: "withstandVoltageDuration", typ: u(undefined, 3.14) },
        { json: "withstandVoltageType", js: "withstandVoltageType", typ: u(undefined, r("VoltageType")) },
    ], "any"),
    "LeakageInductanceOutput": o([
        { json: "leakageInductancePerWinding", js: "leakageInductancePerWinding", typ: a(r("DimensionWithTolerance")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], "any"),
    "MagnetizingInductanceOutput": o([
        { json: "coreReluctance", js: "coreReluctance", typ: 3.14 },
        { json: "gappingReluctance", js: "gappingReluctance", typ: u(undefined, 3.14) },
        { json: "magnetizingInductance", js: "magnetizingInductance", typ: r("DimensionWithTolerance") },
        { json: "maximumFringingFactor", js: "maximumFringingFactor", typ: u(undefined, 3.14) },
        { json: "maximumMagneticEnergyCore", js: "maximumMagneticEnergyCore", typ: u(undefined, 3.14) },
        { json: "maximumStorableMagneticEnergyGapping", js: "maximumStorableMagneticEnergyGapping", typ: u(undefined, 3.14) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "reluctancePerGap", js: "reluctancePerGap", typ: u(undefined, a(r("AirGapReluctanceOutput"))) },
        { json: "ungappedCoreReluctance", js: "ungappedCoreReluctance", typ: u(undefined, 3.14) },
    ], "any"),
    "AirGapReluctanceOutput": o([
        { json: "fringingFactor", js: "fringingFactor", typ: 3.14 },
        { json: "maximumStorableMagneticEnergy", js: "maximumStorableMagneticEnergy", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "reluctance", js: "reluctance", typ: 3.14 },
    ], "any"),
    "StrayCapacitanceOutput": o([
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "sixCapacitorNetworkPerWinding", js: "sixCapacitorNetworkPerWinding", typ: u(undefined, r("SixCapacitorNetworkPerWinding")) },
        { json: "tripoleCapacitancePerWinding", js: "tripoleCapacitancePerWinding", typ: u(undefined, r("TripoleCapacitancePerWinding")) },
        { json: "voltageDividerEndPerTurn", js: "voltageDividerEndPerTurn", typ: u(undefined, a(3.14)) },
        { json: "voltageDividerStartPerTurn", js: "voltageDividerStartPerTurn", typ: u(undefined, a(3.14)) },
        { json: "voltagePerTurn", js: "voltagePerTurn", typ: u(undefined, a(3.14)) },
    ], "any"),
    "SixCapacitorNetworkPerWinding": o([
        { json: "C1", js: "c1", typ: 3.14 },
        { json: "C2", js: "c2", typ: 3.14 },
        { json: "C3", js: "c3", typ: 3.14 },
        { json: "C4", js: "c4", typ: 3.14 },
        { json: "C5", js: "c5", typ: 3.14 },
        { json: "C6", js: "c6", typ: 3.14 },
    ], "any"),
    "TripoleCapacitancePerWinding": o([
        { json: "C1", js: "c1", typ: 3.14 },
        { json: "C2", js: "c2", typ: 3.14 },
        { json: "C3", js: "c3", typ: 3.14 },
    ], "any"),
    "TemperatureOutput": o([
        { json: "bulkThermalResistance", js: "bulkThermalResistance", typ: u(undefined, 3.14) },
        { json: "initialTemperature", js: "initialTemperature", typ: u(undefined, 3.14) },
        { json: "maximumTemperature", js: "maximumTemperature", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "temperaturePoint", js: "temperaturePoint", typ: u(undefined, r("TemperaturePoint")) },
    ], "any"),
    "TemperaturePoint": o([
        { json: "coordinates", js: "coordinates", typ: a(3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "WindingLossesOutput": o([
        { json: "currentDividerPerTurn", js: "currentDividerPerTurn", typ: u(undefined, a(3.14)) },
        { json: "currentPerWinding", js: "currentPerWinding", typ: u(undefined, r("OperatingPoint")) },
        { json: "dcResistancePerTurn", js: "dcResistancePerTurn", typ: u(undefined, a(3.14)) },
        { json: "dcResistancePerWinding", js: "dcResistancePerWinding", typ: u(undefined, a(3.14)) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
        { json: "resistanceMatrix", js: "resistanceMatrix", typ: u(undefined, a(r("ResistanceMatrixAtFrequency"))) },
        { json: "temperature", js: "temperature", typ: u(undefined, 3.14) },
        { json: "windingLosses", js: "windingLosses", typ: 3.14 },
        { json: "windingLossesPerLayer", js: "windingLossesPerLayer", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerSection", js: "windingLossesPerSection", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerTurn", js: "windingLossesPerTurn", typ: u(undefined, a(r("WindingLossesPerElement"))) },
        { json: "windingLossesPerWinding", js: "windingLossesPerWinding", typ: u(undefined, a(r("WindingLossesPerElement"))) },
    ], "any"),
    "WindingLossesPerElement": o([
        { json: "ohmicLosses", js: "ohmicLosses", typ: u(undefined, r("OhmicLosses")) },
        { json: "proximityEffectLosses", js: "proximityEffectLosses", typ: u(undefined, r("WindingLossElement")) },
        { json: "skinEffectLosses", js: "skinEffectLosses", typ: u(undefined, r("WindingLossElement")) },
    ], "any"),
    "OhmicLosses": o([
        { json: "losses", js: "losses", typ: 3.14 },
        { json: "methodUsed", js: "methodUsed", typ: u(undefined, "") },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], "any"),
    "WindingLossElement": o([
        { json: "harmonicFrequencies", js: "harmonicFrequencies", typ: a(3.14) },
        { json: "lossesPerHarmonic", js: "lossesPerHarmonic", typ: a(3.14) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], "any"),
    "WindingWindowCurrentFieldOutput": o([
        { json: "fieldPerFrequency", js: "fieldPerFrequency", typ: a(r("Field")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], "any"),
    "Field": o([
        { json: "data", js: "data", typ: a(r("FieldPoint")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
    ], "any"),
    "FieldPoint": o([
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "point", js: "point", typ: a(3.14) },
        { json: "rotation", js: "rotation", typ: u(undefined, 3.14) },
        { json: "turnIndex", js: "turnIndex", typ: u(undefined, 0) },
        { json: "turnLength", js: "turnLength", typ: u(undefined, 3.14) },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "WindingWindowMagneticStrengthFieldOutput": o([
        { json: "fieldPerFrequency", js: "fieldPerFrequency", typ: a(r("ComplexField")) },
        { json: "methodUsed", js: "methodUsed", typ: "" },
        { json: "origin", js: "origin", typ: r("ResultOrigin") },
    ], "any"),
    "ComplexField": o([
        { json: "data", js: "data", typ: a(r("ComplexFieldPoint")) },
        { json: "frequency", js: "frequency", typ: 3.14 },
    ], "any"),
    "ComplexFieldPoint": o([
        { json: "imaginary", js: "imaginary", typ: 3.14 },
        { json: "label", js: "label", typ: u(undefined, "") },
        { json: "point", js: "point", typ: a(3.14) },
        { json: "real", js: "real", typ: 3.14 },
        { json: "turnIndex", js: "turnIndex", typ: u(undefined, 0) },
        { json: "turnLength", js: "turnLength", typ: u(undefined, 3.14) },
    ], "any"),
    "Cti": [
        "Group I",
        "Group II",
        "Group IIIA",
        "Group IIIB",
    ],
    "InsulationType": [
        "Basic",
        "Double",
        "Functional",
        "Reinforced",
        "Supplementary",
    ],
    "OvervoltageCategory": [
        "OVC-I",
        "OVC-II",
        "OVC-III",
        "OVC-IV",
    ],
    "PollutionDegree": [
        "P1",
        "P2",
        "P3",
    ],
    "InsulationStandards": [
        "IEC 60335-1",
        "IEC 60664-1",
        "IEC 61558-1",
        "IEC 62368-1",
    ],
    "IsolationSide": [
        "denary",
        "duodenary",
        "nonary",
        "octonary",
        "primary",
        "quaternary",
        "quinary",
        "secondary",
        "senary",
        "septenary",
        "tertiary",
        "undenary",
    ],
    "Market": [
        "Commercial",
        "Industrial",
        "Medical",
        "Military",
        "Space",
    ],
    "ConnectionType": [
        "Flying Lead",
        "Pin",
        "Screw",
        "SMT",
    ],
    "Topology": [
        "Active Clamp Forward Converter",
        "Boost Converter",
        "Buck Converter",
        "Cuk Converter",
        "Flyback Converter",
        "Full-Bridge Converter",
        "Half-Bridge Converter",
        "Inverting Buck-Boost Converter",
        "Phase-Shifted Full-Bridge Converter",
        "Push-Pull Converter",
        "SEPIC",
        "Single Switch Forward Converter",
        "Two Switch Flyback Converter",
        "Two Switch Forward Converter",
        "Weinberg Converter",
        "Zeta Converter",
    ],
    "WiringTechnology": [
        "Deposition",
        "Printed",
        "Wound",
    ],
    "WaveformLabel": [
        "Bipolar Rectangular",
        "Bipolar Triangular",
        "Custom",
        "Flyback Primary",
        "Flyback Secondary",
        "FlybackSecondaryDCM",
        "Flyback Secondary With Deadtime",
        "Rectangular",
        "RectangularDCM",
        "Rectangular With Deadtime",
        "Sinusoidal",
        "Triangular",
        "Unipolar Rectangular",
        "Unipolar Triangular",
    ],
    "BobbinFamily": [
        "e",
        "ec",
        "efd",
        "el",
        "ep",
        "er",
        "etd",
        "p",
        "pm",
        "pq",
        "rm",
        "u",
    ],
    "PinShape": [
        "irregular",
        "rectangular",
        "round",
    ],
    "PinDescriptionType": [
        "smd",
        "tht",
    ],
    "FunctionalDescriptionType": [
        "custom",
        "standard",
    ],
    "Status": [
        "obsolete",
        "production",
        "prototype",
    ],
    "ColumnShape": [
        "irregular",
        "oblong",
        "rectangular",
        "round",
    ],
    "CoilAlignment": [
        "centered",
        "inner or top",
        "outer or bottom",
        "spread",
    ],
    "WindingOrientation": [
        "contiguous",
        "overlapping",
    ],
    "WindingWindowShape": [
        "rectangular",
        "round",
    ],
    "InsulationWireCoatingType": [
        "bare",
        "enamelled",
        "extruded",
        "insulated",
        "served",
        "taped",
    ],
    "WireStandard": [
        "IEC 60317",
        "IPC-6012",
        "NEMA MW 1000 C",
    ],
    "WireType": [
        "foil",
        "litz",
        "planar",
        "rectangular",
        "round",
    ],
    "CoordinateSystem": [
        "cartesian",
        "polar",
    ],
    "ElectricalType": [
        "conduction",
        "insulation",
        "shielding",
    ],
    "WindingStyle": [
        "windByConsecutiveParallels",
        "windByConsecutiveTurns",
    ],
    "TurnOrientation": [
        "clockwise",
        "counterClockwise",
    ],
    "Coating": [
        "epoxy",
        "parylene",
    ],
    "GapType": [
        "additive",
        "residual",
        "subtractive",
    ],
    "MaterialEnum": [
        "amorphous",
        "electricalSteel",
        "ferrite",
        "nanocrystalline",
        "powder",
    ],
    "MaterialCompositionEnum": [
        "MgZn",
        "MnZn",
        "NiZn",
    ],
    "InitialPermeabilitModifierMethod": [
        "fair-rite",
        "magnetics",
        "micrometals",
    ],
    "CoreMaterialType": [
        "commercial",
        "custom",
    ],
    "CoreLossesMethodType": [
        "lossFactor",
        "magnetics",
        "micrometals",
        "roshen",
        "steinmetz",
    ],
    "CoreShapeFamily": [
        "c",
        "drum",
        "e",
        "ec",
        "efd",
        "ei",
        "el",
        "elp",
        "ep",
        "epx",
        "eq",
        "er",
        "etd",
        "h",
        "lp",
        "p",
        "planar e",
        "planar el",
        "planar er",
        "pm",
        "pq",
        "pqi",
        "rm",
        "rod",
        "t",
        "u",
        "ui",
        "ur",
        "ut",
    ],
    "MagneticCircuit": [
        "closed",
        "open",
    ],
    "CoreType": [
        "closed shape",
        "piece and plate",
        "toroidal",
        "two-piece set",
    ],
    "CoreGeometricalDescriptionElementType": [
        "closed",
        "half set",
        "plate",
        "sheet",
        "spacer",
        "toroidal",
    ],
    "ColumnType": [
        "central",
        "lateral",
    ],
    "ResultOrigin": [
        "manufacturer",
        "measurement",
        "simulation",
    ],
    "VoltageType": [
        "AC",
        "DC",
    ],
};

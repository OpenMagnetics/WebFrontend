"""OpenMagnetics MCP App server — magnetic component design in a chat.

Exposes the OpenMagnetics engine (through the ``PyOpenMagnetics`` pybind11
module) as MCP tools, with sweep charts as an MCP Apps UI resource (SEP-1865).

Companion to the Kirchhoff server: Kirchhoff emits a magnetic's MAS Inputs
(``magnetic_inputs``), this server advises real core+coil designs for them, and
the chosen MAS goes back to Kirchhoff's ``bind_part``. The model brokers the
handoff across the two connectors — replacing the cross-origin postMessage
round-trip the web apps use, which exists only because a browser cannot run
this engine.

Run:
    python3 mcp/server.py                # streamable HTTP on 127.0.0.1:8402/mcp

    OPENMAGNETICS_MCP_PORT=8409 python3 mcp/server.py     # alongside Kelvin,
                                                          # which also holds 8402
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent

# Import from a neutral directory: a sibling PyOpenMagnetics/ source tree
# shadows the installed module and fails with a confusing
# "No module named 'PyOpenMagnetics.PyOpenMagnetics'".
_saved = [p for p in sys.path if p in ("", str(Path.cwd()))]
for p in _saved:
    sys.path.remove(p)
try:
    import PyOpenMagnetics as om
except ImportError as error:                                       # pragma: no cover
    raise ImportError(
        "PyOpenMagnetics is not importable. Install the wheel, or build it from "
        "~/OpenMagnetics/PyOpenMagnetics.\n"
        f"(running Python {sys.version_info.major}.{sys.version_info.minor} at {sys.executable})"
    ) from error

from mcp.server.fastmcp import FastMCP                 # noqa: E402
from mcp.server.transport_security import (            # noqa: E402
    TransportSecuritySettings,
)
from mcp.types import CallToolResult, TextContent      # noqa: E402

UI_RESOURCE_MIME = "text/html;profile=mcp-app"
UI_CURVES_URI = "ui://openmagnetics/curves.html"


def _ui_meta(uri: str) -> dict:
    return {"ui/resourceUri": uri, "ui": {"resourceUri": uri}}


UI_CURVES_META = _ui_meta(UI_CURVES_URI)

# CoreAdviser modes, in the engine's own JSON spelling (lowercase with spaces —
# NOT the C++ enum names, which the parser rejects).
CORE_MODES = ("available cores", "standard cores", "custom cores")
DEFAULT_CORE_MODE = "available cores"

PORT = 8402     # Hertz 8400, Kirchhoff 8401, Kelvin 8402, Moebius bridge 8404, …
#
# 8402 is shared with Kelvin, whose server has held it since before this one
# existed. Both are wanted at once in the Moebius pool, so the port moves with
# OPENMAGNETICS_MCP_PORT rather than being fixed here — the default is
# unchanged, and a standalone run is exactly what it always was.
#
# The host allowlist below is built from the port ACTUALLY bound. Hardcoding
# 8402 in it while the transport binds elsewhere fails every request with a bare
# `421 Invalid Host header`, which hosts routinely surface as a sign-in error
# that says nothing about the port.
_PORT = int(os.environ.get("OPENMAGNETICS_MCP_PORT", PORT))

_public_host = os.environ.get("OPENMAGNETICS_PUBLIC_HOST", "").strip()
if "://" in _public_host:
    _public_host = _public_host.split("://", 1)[1]
_public_host = _public_host.split("/", 1)[0].strip()
if os.environ.get("OPENMAGNETICS_ALLOW_ANY_HOST") == "1":
    _security = TransportSecuritySettings(enable_dns_rebinding_protection=False)
else:
    _allowed = [f"127.0.0.1:{_PORT}", f"localhost:{_PORT}", "127.0.0.1", "localhost"]
    if _public_host:
        _allowed += [_public_host, f"{_public_host}:443"]
    # Matched EXACTLY (or with a ":*" port wildcard) — a bare "*" is a literal
    # that never matches and would 403 every browser-resident host.
    _origins = ["https://claude.ai", "https://www.claude.ai",
                "http://localhost:*", "http://127.0.0.1:*"]
    if _public_host:
        _origins.append(f"https://{_public_host}")
    _origins += [o.strip() for o in
                 os.environ.get("OPENMAGNETICS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
    _security = TransportSecuritySettings(allowed_hosts=_allowed, allowed_origins=_origins)

mcp = FastMCP("OpenMagnetics", host=os.environ.get("OPENMAGNETICS_MCP_HOST", "127.0.0.1"),
              port=_PORT, transport_security=_security)


# --- helpers ----------------------------------------------------------------

def _unwrap(result):
    """Unpack the engine's {'data': ...} envelope and RAISE on its error string.

    The engine reports failures as a `data` string starting with "Exception:"
    rather than throwing. Returning that verbatim would hand the model an error
    message shaped like a result.
    """
    data = result.get("data") if isinstance(result, dict) and "data" in result else result
    if isinstance(data, str) and data.startswith("Exception"):
        raise RuntimeError(data[len("Exception:"):].strip())
    return data


def _result(summary: str, payload: dict) -> CallToolResult:
    """Compact digest for the model, full payload for the widget.

    A plain dict return would emit no structuredContent at all and serialise the
    WHOLE payload into `content` — a magnetic MAS is hundreds of kilobytes.
    """
    return CallToolResult(content=[TextContent(type="text", text=summary)],
                          structuredContent=payload)


def _eng(value, unit: str) -> str:
    if value is None:
        return "-"
    for factor, prefix in ((1e-12, "p"), (1e-9, "n"), (1e-6, "µ"), (1e-3, "m"), (1.0, "")):
        if abs(value) < factor * 1000.0:
            return f"{value / factor:.3g} {prefix}{unit}"
    if abs(value) < 1e6:
        return f"{value / 1e3:.3g} k{unit}"
    return f"{value / 1e6:.3g} M{unit}"


def _core_mode(mode: str) -> str:
    if mode not in CORE_MODES:
        raise ValueError(f"mode must be one of {', '.join(CORE_MODES)} -- got {mode!r}")
    return mode


def _reference(magnetic: dict) -> str:
    return (magnetic.get("manufacturerInfo") or {}).get("reference") or "(unnamed)"


def _require_complete(magnetic: dict, what: str) -> None:
    """Refuse a magnetic whose coil the FAST adviser left incomplete.

    advise_magnetics(fast=True) returns designs good enough to rank but without a
    fully computed coil; impedance, SPICE export and the loss models then produce
    `[CALCULATION_NAN_RESULT] Energy cannot be nan` deep inside the engine. Better
    to say which call to make than to hand back NaN.
    """
    coil = magnetic.get("coil") or {}
    if not (coil.get("turnsDescription") or coil.get("sectionsDescription")):
        raise ValueError(
            f"{what} needs a magnetic with a fully described coil. This one came from the "
            f"FAST adviser, which stops at the core: re-run advise_magnetics with fast=false "
            f"(slower, ~1 min) or pass it through advise_coil first."
        )


# --- the pipeline contract --------------------------------------------------
# Every payload is a result under Moebius's contracts/pipeline_result.json, so an
# orchestrator, a widget and the next engine can all read this one without learning its
# private shapes. What each branch is FOR here:
#
#   design    — the advisers: ranked core+coil designs nobody can order, so not `candidates`.
#   document  — a MAS, a wound coil, a SPICE subcircuit: ONE artifact, named by its schema.
#   quantity  — losses, leakage, peak current, temperature: numbers WITH the model that
#               computed them, because two core-loss models disagree by more than most
#               design margins and a bare 0.83 cannot say which one spoke.
#   curves    — the eight sweeps.
#   catalogue — what the engine holds: materials, shapes, families, manufacturers, models.

def _axis(label: str, unit: str, scale: str | None = None) -> dict:
    return {"label": label, "unit": unit, **({"scale": scale} if scale else {})}


def _document_result(summary: str, *, schema: str, operation: str, document: dict,
                     subject: str | None = None, version: str | None = None,
                     derived_from: str | None = None, changed: list | None = None,
                     diagnostics: list | None = None, view: str | None = None) -> CallToolResult:
    payload: dict = {
        "mode": "document",
        "schema": {"name": schema, **({"version": version} if version else {})},
        "operation": operation,
        "document": document,
    }
    for key, value in (("subject", subject), ("derivedFrom", derived_from),
                       ("changed", changed), ("diagnostics", diagnostics), ("view", view)):
        if value:
            payload[key] = value
    return _result(summary, payload)


def _quantity_result(summary: str, *, subject: str, model: str, quantities: dict,
                     conditions: dict | None = None, caveat: str | None = None) -> CallToolResult:
    payload: dict = {"mode": "quantity", "subject": subject, "model": model,
                     "quantities": quantities}
    if conditions:
        payload["conditions"] = conditions
    if caveat:
        payload["caveat"] = caveat
    return _result(summary, payload)


def _scalar(value, unit: str, label: str | None = None) -> dict | None:
    """One named number, unit BESIDE the value. None when the engine did not compute it —
    absent and zero are different facts and must not collapse into one."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    out = {"value": float(value), "unit": unit}
    if label:
        out["label"] = label
    return out


def _resolve_dimension(value):
    """A MAS dimensionWithTolerance collapsed to one number: nominal, else the midpoint of the
    bounds, else the bound that exists. Raises when none is present rather than substituting a
    zero — an engine that reported no value and one that reported 0 H mean different things."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if not isinstance(value, dict):
        raise ValueError(f"not a dimension: {value!r}")
    if isinstance(value.get("nominal"), (int, float)):
        return float(value["nominal"])
    lo, hi = value.get("minimum"), value.get("maximum")
    if isinstance(lo, (int, float)) and isinstance(hi, (int, float)):
        return (float(lo) + float(hi)) / 2
    for bound in (hi, lo):
        if isinstance(bound, (int, float)):
            return float(bound)
    raise ValueError(f"dimension carries no value: {value!r}")


def _at_temperature(operating_point: dict, temperature: float) -> dict:
    """The operating point with the temperature the caller asked for.

    The loss models read ambient from the operating point's `conditions`, so a temperature
    passed beside it would be silently ignored — which is how a 100 °C loss figure ends up
    computed at 25 °C.
    """
    conditions = dict(operating_point.get("conditions") or {})
    conditions["ambientTemperature"] = float(temperature)
    return {**operating_point, "conditions": conditions}


def _catalogue_result(summary: str, names: list, kind: str, units: str | None = None
                      ) -> CallToolResult:
    """A `catalogue` result: what this pipeline can answer about, each entry saying its KIND
    so materials and shapes cannot be mistaken for one another downstream."""
    payload = {"mode": "catalogue",
               "families": [{"name": str(n), "kind": kind} for n in names]}
    if units:
        payload["units"] = units
    return _result(summary, payload)


def _designs_result(summary: str, entries: list, kind: str, caveat: str | None = None
                    ) -> CallToolResult:
    """A `design` result: ranked things the ENGINE produced.

    Not `candidates`: a candidate requires an MPN because it is a part somebody can order, and
    a core+coil the adviser invented is a thing you would have to have made. Keeping them
    apart is the whole reason the two branches exist.
    """
    designs = []
    for i, entry in enumerate(entries or []):
        mas = entry.get("mas") if isinstance(entry, dict) else None
        magnetic = (mas or {}).get("magnetic") or (entry if isinstance(entry, dict) else {})
        design = {"rank": i + 1, "label": _reference(magnetic)}
        score = entry.get("scoring") if isinstance(entry, dict) else None
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            design["score"] = float(score)
        if mas:
            design["document"] = mas
        elif isinstance(entry, dict):
            design["document"] = entry
        designs.append(design)
    payload = {"mode": "design", "kind": kind, "designs": designs}
    if caveat:
        payload["caveat"] = caveat
    return _result(summary, payload)


def _curves_result(title, subtitle, series, summary, *, x_axis, y_axis, note=None,
                   subject=None):
    payload = {"mode": "curves", "title": title, "axes": {"x": x_axis, "y": y_axis},
               "series": series}
    if subtitle:
        payload["subtitle"] = subtitle
    if subject:
        payload["subject"] = subject
    if note:
        payload["caveat"] = note
    return _result(summary, payload)


def _sweep_result(sweep: dict, title: str, x_axis: dict, y_axis: dict,
                  extra: str = "", magnetic: dict | None = None) -> CallToolResult:
    """The engine's {title, xPoints, yPoints} sweep as a `curves` result.

    The axes are DECLARED rather than left in a label string: '|Z| (Ω)' told a reader what the
    ordinate was and told a consumer nothing it could convert, compare or re-label.

    The MAGNETIC rides along as the subject. Two things need it. A chart was anonymous — '|Z|
    against frequency' never said which magnetic, so two sweeps differed only by title. And a
    widget in a host that permits WebAssembly can run this engine itself: with the subject in
    hand it recomputes as the user drags a slider, instead of a round trip per frame. Hosts
    that refuse WASM ignore it and draw the points, exactly as before.
    """
    xs = sweep.get("xPoints") or []
    ys = sweep.get("yPoints") or []
    if not xs or len(xs) != len(ys):
        raise RuntimeError(f"sweep returned {len(xs)} x-points and {len(ys)} y-points")
    finite = [y for y in ys if isinstance(y, (int, float))]
    span = (f"{min(finite):.4g} to {max(finite):.4g}" if finite else "no finite values")
    subject = None
    if magnetic:
        subject = {"kind": "magnetic", "name": _reference(magnetic),
                   "schema": {"name": "MAS"}, "document": magnetic}
    return _curves_result(
        sweep.get("title") or title, f"{len(xs)} points",
        [{"name": sweep.get("title") or title, "kind": "modelled",
          "points": [[float(a), float(b)] for a, b in zip(xs, ys)]}],
        f"{title}: {len(xs)} points from {xs[0]:.4g} to {xs[-1]:.4g}; "
        f"{y_axis['label']} ranges {span}.{extra}",
        x_axis=x_axis, y_axis=y_axis, subject=subject)


FREQ_AXIS = _axis("frequency", "Hz", "log")


# --- tools: advisers --------------------------------------------------------

@mcp.tool(
    title="Advise magnetic designs",
    description=(
        "Design complete magnetics (core + coil) for a set of MAS Inputs, ranked by the "
        "adviser's own scoring. This is the OpenMagnetics adviser — the counterpart to "
        "Kirchhoff's magnetic_inputs, so a converter's magnetic can be designed without "
        "leaving the conversation."
    ),
    structured_output=False,
)
def advise_magnetics(inputs: dict, count: int = 3, mode: str = DEFAULT_CORE_MODE,
                     fast: bool = True) -> CallToolResult:
    """Ranked core+coil designs for MAS Inputs.

    Args:
        inputs: MAS Inputs (designRequirements + operatingPoints). Kirchhoff's
            magnetic_inputs tool produces exactly this.
        count: how many designs to return.
        mode: 'available cores' (real stocked cores), 'standard cores', 'custom cores'.
        fast: True ranks quickly (~8 s) but stops at the core — good for browsing,
            NOT usable for impedance/SPICE/loss analysis. False runs the full
            adviser (~1 min) and returns designs every other tool here accepts.
    """
    fn = om.calculate_advised_magnetics_fast if fast else om.calculate_advised_magnetics
    designs = _unwrap(fn(inputs, count, _core_mode(mode)))
    if not designs:
        raise RuntimeError("the adviser returned no designs for these inputs")
    rows = []
    for i, d in enumerate(designs):
        mas = d.get("mas") or {}
        scoring = d.get("scoring")
        rows.append(f"  {i}: {_reference(mas.get('magnetic') or {})}"
                    + (f"  (score {scoring})" if isinstance(scoring, (int, float)) else ""))
    caveat = ("\nThese are FAST designs: core selected, coil not fully described. For "
              "impedance, SPICE export or loss analysis re-run with fast=false."
              if fast else "")
    return _designs_result(
        f"{len(designs)} design(s), best first:\n" + "\n".join(rows) + caveat,
        designs, "magnetic",
        # The FAST caveat is a FIELD, not only a sentence: a design with no coil described
        # makes every downstream loss model return NaN deep inside the engine, and a consumer
        # that cannot read it from the payload will pass one on and be told "Energy cannot be nan".
        caveat=("fast designs: the core is chosen, the coil is not described — re-run with "
                "fast=false before impedance, SPICE export or loss analysis" if fast else None))


@mcp.tool(
    title="Advise cores only",
    description="Rank candidate CORES (shape + material + gap) for a set of MAS Inputs.",
    structured_output=False,
)
def advise_cores(inputs: dict, count: int = 3, mode: str = DEFAULT_CORE_MODE,
                 weights: dict | None = None) -> CallToolResult:
    """Ranked cores.

    Args:
        weights: optional per-filter weighting object for the core adviser.
    """
    cores = _unwrap(om.calculate_advised_cores(inputs, weights or {}, count, _core_mode(mode)))
    names = [_reference((c.get("mas") or {}).get("magnetic") or c) for c in (cores or [])]
    return _designs_result(f"{len(cores or [])} core(s): " + ", ".join(names[:8]),
                           cores, "core")


@mcp.tool(
    title="Advise a coil",
    description=(
        "Design the winding (sections, layers, turns, wires) for a magnetic that already "
        "has a core — the step the FAST adviser skips."
    ),
    structured_output=False,
)
def advise_coil(mas: dict) -> CallToolResult:
    """Complete the coil of a MAS whose core is already chosen."""
    out = _unwrap(om.calculate_advised_coil(mas))
    magnetic = (out or {}).get("magnetic") or {}
    coil = magnetic.get("coil") or {}
    turns = len(coil.get("turnsDescription") or [])
    return _document_result(
        f"Coil designed for {_reference(magnetic)}: {turns} turn(s) described, "
        f"{len(coil.get('sectionsDescription') or [])} section(s).",
        schema="MAS", operation="transformed", document=out, subject=_reference(magnetic),
        changed=[{"ref": _reference(magnetic), "change": f"coil designed: {turns} turn(s), "
                  f"{len(coil.get('sectionsDescription') or [])} section(s)"}])


@mcp.tool(
    title="Advise magnetics from a catalog",
    description="Rank off-the-shelf catalog magnetics against MAS Inputs (no custom design).",
    structured_output=False,
)
def advise_from_catalog(inputs: dict, catalog: list, count: int = 3) -> CallToolResult:
    """Catalog parts that meet the requirements.

    Args:
        inputs: MAS Inputs the part must satisfy.
        catalog: the magnetics to rank — the engine ranks what it is given and has
            no built-in catalogue, so an empty list means "nothing to choose from",
            not "search everything".
    """
    if not catalog:
        raise ValueError(
            "catalog is empty -- this tool ranks magnetics you supply, it does not "
            "search a built-in database. Use advise_magnetics to design one instead.")
    out = _unwrap(om.calculate_advised_magnetics_from_catalog(inputs, catalog, count))
    names = [_reference((d.get("mas") or {}).get("magnetic") or {}) for d in (out or [])]
    return _designs_result(f"{len(out or [])} catalog magnetic(s): " + ", ".join(names[:8]),
                           out, "magnetic")


# --- tools: losses and analysis --------------------------------------------

@mcp.tool(
    title="Core losses",
    description="Core loss of a magnetic at an operating point, with the model used.",
    structured_output=False,
)
def core_losses(magnetic: dict, operating_point: dict, temperature: float = 25.0,
                models: dict | None = None) -> CallToolResult:
    """Core losses in W."""
    _require_complete(magnetic, "core loss calculation")
    # (core, coil, inputs, models) — not (magnetic, operatingPoint, models, temperature). The
    # old call shape raised "key 'functionalDescription' not found" from deep inside the engine,
    # which reads like bad data and was a wrong signature.
    #
    # TEMPERATURE travels in the operating point's conditions, where the engine looks for it;
    # passing it as a fifth argument silently did nothing.
    inputs = {"designRequirements": {"magnetizingInductance": {"nominal": 0}, "turnsRatios": []},
              "operatingPoints": [_at_temperature(operating_point, temperature)]}
    out = _unwrap(om.calculate_core_losses(magnetic.get("core") or {}, magnetic.get("coil") or {},
                                           inputs, models or {}))
    losses = out.get("coreLosses") if isinstance(out, dict) else out
    # WHICH MODEL SAID SO is half the answer: Steinmetz, iGSE and Roshen disagree by more
    # than most thermal margins, and a bare number cannot be checked against another run.
    model = ((out or {}).get("methodUsed") if isinstance(out, dict) else None) \
        or (models or {}).get("coreLosses") or "the engine's default core-loss model"
    quantities = {"coreLosses": _scalar(losses, "W", "core losses")}
    for key, unit in (("magneticFluxDensityPeak", "T"), ("volumetricLosses", "W/m3")):
        entry = _scalar((out or {}).get(key) if isinstance(out, dict) else None, unit)
        if entry:
            quantities[key] = entry
    return _quantity_result(
        f"Core losses {_eng(losses, 'W')} at {temperature} °C for {_reference(magnetic)}.",
        subject=_reference(magnetic), model=str(model),
        quantities={k: v for k, v in quantities.items() if v},
        conditions={"temperature": {"value": float(temperature), "unit": "degC"}})


@mcp.tool(
    title="Winding losses",
    description="DC + AC winding losses (skin and proximity) per winding and per turn.",
    structured_output=False,
)
def winding_losses(magnetic: dict, operating_point: dict,
                   temperature: float = 25.0) -> CallToolResult:
    """Winding losses breakdown."""
    _require_complete(magnetic, "winding loss calculation")
    out = _unwrap(om.calculate_winding_losses(magnetic, operating_point, temperature))
    total = out.get("windingLosses") if isinstance(out, dict) else None
    per = out.get("dcResistancePerWinding") if isinstance(out, dict) else None
    # Per-winding split as a `breakdown`, in the same unit as the total, so nobody has to
    # guess whether 1.2 W was the whole coil or one of its windings.
    breakdown = {}
    if isinstance(per, dict):
        breakdown = {str(k): float(v) for k, v in per.items()
                     if isinstance(v, (int, float)) and not isinstance(v, bool)}
    elif isinstance(per, list):
        breakdown = {f"winding {i}": float(v) for i, v in enumerate(per)
                     if isinstance(v, (int, float)) and not isinstance(v, bool)}
    losses_entry = _scalar(total, "W", "winding losses")
    if losses_entry and breakdown:
        losses_entry["breakdown"] = breakdown
    quantities = {"windingLosses": losses_entry} if losses_entry else {}
    for key, unit in (("dcResistance", "ohm"), ("acResistance", "ohm"),
                      ("skinEffectLosses", "W"), ("proximityEffectLosses", "W")):
        entry = _scalar((out or {}).get(key) if isinstance(out, dict) else None, unit)
        if entry:
            quantities[key] = entry
    if not quantities:
        raise RuntimeError("the winding-loss model returned no usable number")
    return _quantity_result(
        f"Winding losses {_eng(total, 'W')} at {temperature} °C"
        + (f"; DC resistance per winding {per}" if per else ""),
        subject=_reference(magnetic), model="Dowell (skin and proximity effect)",
        quantities=quantities,
        conditions={"temperature": {"value": float(temperature), "unit": "degC"}})


@mcp.tool(
    title="Leakage inductance",
    description="Leakage inductance matrix between windings at a frequency.",
    structured_output=False,
)
def leakage_inductance(magnetic: dict, frequency: float = 100000.0,
                       models: dict | None = None) -> CallToolResult:
    """Leakage inductance matrix, H."""
    _require_complete(magnetic, "leakage inductance")
    out = _unwrap(om.calculate_leakage_inductance_matrix(magnetic, frequency, models or {}))
    # A MATRIX, not a headline number: leakage between N windings is a term per pair, and
    # flattening it loses which pair each term belonged to.
    #
    # The engine returns it as {magnitude: {from: {to: dimensionWithTolerance}}} — nested by
    # winding NAME, each cell a {nominal, minimum, maximum}. It is squared into rows and
    # columns in the winding order the engine used, so the matrix indices mean the same thing
    # as the coil's own winding order.
    magnitude = (out or {}).get("magnitude") if isinstance(out, dict) else None
    if not isinstance(magnitude, dict) or not magnitude:
        raise RuntimeError(f"the leakage-inductance model returned no matrix: {out!r}")
    windings = list(magnitude)
    for row in magnitude.values():
        for name in (row or {}):
            if name not in windings:
                windings.append(name)
    matrix = [[_resolve_dimension((magnitude.get(a) or {}).get(b, 0.0)) for b in windings]
              for a in windings]
    return _quantity_result(
        f"Leakage inductance matrix at {_eng(frequency, 'Hz')} for {_reference(magnetic)}.",
        subject=_reference(magnetic), model="MKF leakage-inductance matrix",
        quantities={"leakageInductance": {
            "matrix": matrix, "unit": "H",
            "label": "per winding pair, in the order " + ", ".join(windings)}},
        conditions={"frequency": {"value": float(frequency), "unit": "Hz"}})


@mcp.tool(
    title="Peak winding current",
    description="Peak current in one winding at an operating point.",
    structured_output=False,
)
def peak_winding_current(magnetic: dict, operating_point: dict,
                         winding_index: int = 0) -> CallToolResult:
    """Peak current, A."""
    out = _unwrap(om.calculate_peak_winding_current(magnetic, operating_point, winding_index))
    peak = _scalar(out, "A", f"peak current in winding {winding_index}")
    if not peak:
        raise RuntimeError(f"the engine returned no numeric peak current: {out!r}")
    return _quantity_result(
        f"Peak current in winding {winding_index}: {_eng(out, 'A')}",
        subject=_reference(magnetic), model="MKF peak winding current",
        quantities={"peakWindingCurrent": peak},
        conditions={"winding": {"value": winding_index, "label": "winding index"}})


@mcp.tool(
    title="Temperature from thermal resistance",
    description="Core temperature rise from its thermal resistance and total losses.",
    structured_output=False,
)
def core_temperature(magnetic: dict, total_losses: float) -> CallToolResult:
    """Core temperature, °C.

    The engine takes the CORE and the losses; ambient comes from the core's own conditions, so
    there is no ambient argument to pass. It used to accept one and hand it to a binding that
    has no such parameter, which failed the call outright.
    """
    out = _unwrap(om.calculate_temperature_from_core_thermal_resistance(
        magnetic.get("core") or {}, total_losses))
    temperature = _scalar(out, "degC", "core temperature")
    if not temperature:
        raise RuntimeError(f"the thermal model returned no numeric temperature: {out!r}")
    # NO temperature RISE is reported. The engine returns an absolute temperature and takes
    # its ambient from the core, so subtracting an ambient this layer invented would be a
    # number nobody computed — and the rise is the figure an engineer compares against a
    # datasheet limit, so a wrong one is worse than none.
    return _quantity_result(
        f"Core reaches {out} °C with {_eng(total_losses, 'W')} of loss.",
        subject=_reference(magnetic), model="core thermal resistance",
        quantities={"coreTemperature": temperature},
        conditions={"totalLosses": {"value": float(total_losses), "unit": "W"}})


# --- tools: sweeps (all chart into the curves widget) -----------------------

@mcp.tool(
    title="Impedance vs frequency",
    description="Sweep a magnetic's impedance across frequency and chart it.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_impedance(magnetic: dict, start_hz: float = 1e3, stop_hz: float = 1e7,
                    points: int = 40, mode: str = "log") -> CallToolResult:
    """|Z| vs frequency."""
    _require_complete(magnetic, "an impedance sweep")
    out = _unwrap(om.sweep_impedance_over_frequency(magnetic, start_hz, stop_hz, points, mode, ""))
    return _sweep_result(out, "Impedance", FREQ_AXIS, _axis("impedance", "ohm"), magnetic=magnetic)


@mcp.tool(
    title="Core losses vs frequency",
    description="Sweep core losses across frequency at an operating point and chart it.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_core_losses(magnetic: dict, operating_point: dict, start_hz: float = 1e4,
                      stop_hz: float = 1e6, points: int = 30, temperature: float = 25.0,
                      mode: str = "log") -> CallToolResult:
    """Core loss vs frequency."""
    out = _unwrap(om.sweep_core_losses_over_frequency(
        magnetic, operating_point, start_hz, stop_hz, points, temperature, mode, ""))
    return _sweep_result(out, "Core losses", FREQ_AXIS, _axis("core loss", "W"), magnetic=magnetic)


@mcp.tool(
    title="Winding losses vs frequency",
    description="Sweep winding losses across frequency and chart it.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_winding_losses(magnetic: dict, operating_point: dict, start_hz: float = 1e4,
                         stop_hz: float = 1e7, points: int = 30, temperature: float = 25.0,
                         mode: str = "log") -> CallToolResult:
    """Winding loss vs frequency."""
    _require_complete(magnetic, "a winding-loss sweep")
    out = _unwrap(om.sweep_winding_losses_over_frequency(
        magnetic, operating_point, start_hz, stop_hz, points, temperature, mode, ""))
    return _sweep_result(out, "Winding losses", FREQ_AXIS, _axis("winding loss", "W"), magnetic=magnetic)


@mcp.tool(
    title="Magnetizing inductance vs DC bias",
    description=(
        "Sweep magnetizing inductance against DC bias current — the saturation curve."
    ),
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_inductance_vs_dc_bias(magnetic: dict, start_a: float = 0.0, stop_a: float = 10.0,
                                points: int = 30, temperature: float = 25.0,
                                mode: str = "linear") -> CallToolResult:
    """L vs DC bias."""
    out = _unwrap(om.sweep_magnetizing_inductance_over_dc_bias(
        magnetic, start_a, stop_a, points, temperature, mode, ""))
    return _sweep_result(out, "Magnetizing inductance vs DC bias", _axis("DC bias", "A"),
                         _axis("magnetizing inductance", "H"), magnetic=magnetic)


@mcp.tool(
    title="Magnetizing inductance vs frequency",
    description="Sweep magnetizing inductance across frequency.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_inductance_vs_frequency(magnetic: dict, start_hz: float = 1e3, stop_hz: float = 1e7,
                                  points: int = 30, temperature: float = 25.0,
                                  mode: str = "log") -> CallToolResult:
    """L vs frequency."""
    out = _unwrap(om.sweep_magnetizing_inductance_over_frequency(
        magnetic, start_hz, stop_hz, points, temperature, mode, ""))
    return _sweep_result(out, "Magnetizing inductance vs frequency", FREQ_AXIS,
                         _axis("magnetizing inductance", "H"), magnetic=magnetic)


@mcp.tool(
    title="Magnetizing inductance vs temperature",
    description="Sweep magnetizing inductance across temperature.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_inductance_vs_temperature(magnetic: dict, start_c: float = -40.0, stop_c: float = 125.0,
                                    points: int = 30, frequency: float = 100000.0,
                                    mode: str = "linear") -> CallToolResult:
    """L vs temperature."""
    out = _unwrap(om.sweep_magnetizing_inductance_over_temperature(
        magnetic, start_c, stop_c, points, frequency, mode, ""))
    return _sweep_result(out, "Magnetizing inductance vs temperature",
                         _axis("temperature", "degC"),
                         _axis("magnetizing inductance", "H"), magnetic=magnetic)


@mcp.tool(
    title="Q factor vs frequency",
    description="Sweep the quality factor across frequency.",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_q_factor(magnetic: dict, start_hz: float = 1e3, stop_hz: float = 1e7,
                   points: int = 30, mode: str = "log") -> CallToolResult:
    """Q vs frequency."""
    _require_complete(magnetic, "a Q-factor sweep")
    out = _unwrap(om.sweep_q_factor_over_frequency(magnetic, start_hz, stop_hz, points, mode, ""))
    return _sweep_result(out, "Q factor", FREQ_AXIS, _axis("Q factor", "1"), magnetic=magnetic)


@mcp.tool(
    title="Resistance vs frequency",
    description="Sweep AC resistance across frequency (skin and proximity effects).",
    meta=UI_CURVES_META, structured_output=False,
)
def sweep_resistance(magnetic: dict, start_hz: float = 1e3, stop_hz: float = 1e7,
                     temperature: float = 25.0,
                     points: int = 30, mode: str = "log") -> CallToolResult:
    """R_ac vs frequency."""
    _require_complete(magnetic, "a resistance sweep")
    out = _unwrap(om.sweep_resistance_over_frequency(
        magnetic, start_hz, stop_hz, points, temperature, mode, ""))
    return _sweep_result(out, "AC resistance", FREQ_AXIS, _axis("AC resistance", "ohm"), magnetic=magnetic)


# --- tools: winding ---------------------------------------------------------

@mcp.tool(
    title="Wind a coil",
    description="Lay out a coil's turns from its winding description.",
    structured_output=False,
)
def wind_coil(coil: dict, repetitions: int = 1, proportion_per_winding: list | None = None,
              pattern: list | None = None, margin_pairs: list | None = None) -> CallToolResult:
    """Full winding pass."""
    out = _unwrap(om.wind(coil, repetitions, proportion_per_winding or [],
                          pattern or [], margin_pairs or []))
    return _document_result(
        f"Coil wound: {len((out or {}).get('turnsDescription') or [])} turn(s), "
        f"{len((out or {}).get('sectionsDescription') or [])} section(s).",
        schema="MAS", version="coil", operation="transformed", document=out,
        changed=[{"ref": "coil", "change":
                  f"wound: {len((out or {}).get('turnsDescription') or [])} turn(s), "
                  f"{len((out or {}).get('sectionsDescription') or [])} section(s)"}])


@mcp.tool(
    title="Wind by turns",
    description="Lay out a coil turn by turn from an existing section/layer description.",
    structured_output=False,
)
def wind_by_turns(coil: dict) -> CallToolResult:
    """Turn-level winding."""
    out = _unwrap(om.wind_by_turns(coil))
    return _document_result(
        f"Wound {len((out or {}).get('turnsDescription') or [])} turn(s).",
        schema="MAS", version="coil", operation="transformed", document=out,
        changed=[{"ref": "coil", "change":
                  f"wound turn by turn: {len((out or {}).get('turnsDescription') or [])} turn(s)"}])


@mcp.tool(
    title="Wind by sections",
    description="Split a coil into sections with a winding pattern and insulation.",
    structured_output=False,
)
def wind_by_sections(coil: dict, repetitions: int = 1,
                     proportion_per_winding: list | None = None, pattern: list | None = None,
                     insulation_thickness: float = 0.0) -> CallToolResult:
    """Section-level winding."""
    out = _unwrap(om.wind_by_sections(coil, repetitions, proportion_per_winding or [],
                                      pattern or [], insulation_thickness))
    return _document_result(
        f"Wound into {len((out or {}).get('sectionsDescription') or [])} section(s).",
        schema="MAS", version="coil", operation="transformed", document=out,
        changed=[{"ref": "coil", "change":
                  f"split into {len((out or {}).get('sectionsDescription') or [])} section(s)"}])


@mcp.tool(
    title="Wind by layers",
    description="Split a coil's sections into layers with inter-layer insulation.",
    structured_output=False,
)
def wind_by_layers(coil: dict, insulation_layers: dict | None = None,
                   insulation_thickness: float = 0.0) -> CallToolResult:
    """Layer-level winding."""
    out = _unwrap(om.wind_by_layers(coil, insulation_layers or {}, insulation_thickness))
    return _document_result(
        f"Wound into {len((out or {}).get('layersDescription') or [])} layer(s).",
        schema="MAS", version="coil", operation="transformed", document=out,
        changed=[{"ref": "coil", "change":
                  f"split into {len((out or {}).get('layersDescription') or [])} layer(s)"}])


@mcp.tool(
    title="Wind a planar coil",
    description="Lay out a planar (PCB) winding from a stack-up.",
    structured_output=False,
)
def wind_planar(coil: dict, stack_up: list, border_to_wire_distance: float = 0.0,
                wire_to_wire_distance: list | None = None,
                insulation_thickness: list | None = None,
                core_to_layer_distance: float = 0.0) -> CallToolResult:
    """Planar winding.

    Args:
        stack_up: one WINDING INDEX per PCB layer — [0, 0] puts winding 0 on two layers. Not
            turn counts: an index past the last winding walks off the end of the engine's
            winding list and dies with std::bad_alloc rather than a message.
    """
    out = _unwrap(om.wind_planar(coil, stack_up, border_to_wire_distance,
                                 wire_to_wire_distance or [], insulation_thickness or [],
                                 core_to_layer_distance))
    return _document_result(
        f"Planar coil wound over {len(stack_up)} layer(s).",
        schema="MAS", version="coil", operation="transformed", document=out,
        changed=[{"ref": "coil", "change": f"planar layout over {len(stack_up)} layer(s)"}])


# --- tools: export ----------------------------------------------------------

@mcp.tool(
    title="Export SPICE subcircuit",
    description=(
        "Export a magnetic as a SPICE subcircuit — the model a simulator needs to see "
        "the real core and winding rather than an ideal inductor."
    ),
    structured_output=False,
)
def export_spice_subcircuit(magnetic: dict) -> CallToolResult:
    """SPICE subcircuit text."""
    _require_complete(magnetic, "a SPICE subcircuit export")
    text = _unwrap(om.export_magnetic_as_subcircuit(magnetic))
    return _document_result(
        f"SPICE subcircuit for {_reference(magnetic)} "
        f"({len(text.splitlines())} lines):\n\n{text}",
        schema="spice-subcircuit", operation="produced", subject=_reference(magnetic),
        document={"text": text, "lines": len(text.splitlines())},
        derived_from=_reference(magnetic))


@mcp.tool(
    title="Export schematic symbol",
    description="Export a magnetic as a schematic symbol.",
    structured_output=False,
)
def export_symbol(magnetic: dict, inputs: dict) -> CallToolResult:
    """Symbol text."""
    text = _unwrap(om.export_magnetic_as_symbol(magnetic, inputs))
    return _document_result(
        f"Symbol for {_reference(magnetic)} ({len(str(text))} chars).",
        schema="schematic-symbol", operation="produced", subject=_reference(magnetic),
        document={"text": str(text), "lines": len(str(text).splitlines())},
        derived_from=_reference(magnetic))


# --- tools: catalog ---------------------------------------------------------

@mcp.tool(
    title="List core materials",
    description="Core materials the engine knows, optionally filtered by manufacturer.",
    structured_output=False,
)
def list_core_materials(manufacturer: str | None = None) -> CallToolResult:
    """Available core materials."""
    # The binding takes the manufacturer as a REQUIRED argument (empty string = all of them);
    # calling it bare raised "incompatible function arguments" on every call.
    materials = _unwrap(om.get_available_core_materials(manufacturer or ""))
    return _catalogue_result(
        f"{len(materials)} core material(s)"
        + (f" matching {manufacturer!r}" if manufacturer else "")
        + ": " + ", ".join(str(m) for m in materials[:25])
        + (" …" if len(materials) > 25 else ""),
        materials, "core material")


@mcp.tool(
    title="List core shapes",
    description="Core shapes the engine knows, optionally by family or manufacturer.",
    structured_output=False,
)
def list_core_shapes(family: str | None = None,
                     manufacturer: str | None = None) -> CallToolResult:
    """Available core shapes."""
    if family:
        shapes = _unwrap(om.get_available_core_shapes_by_family(family))
    elif manufacturer:
        shapes = _unwrap(om.get_available_core_shapes_by_manufacturer(manufacturer))
    else:
        shapes = _unwrap(om.get_available_core_shapes())
    return _catalogue_result(
        f"{len(shapes)} core shape(s)"
        + (f" in family {family!r}" if family else "")
        + (f" from {manufacturer!r}" if manufacturer else "")
        + ": " + ", ".join(str(s) for s in shapes[:25])
        + (" …" if len(shapes) > 25 else ""),
        shapes, "core shape", units="mm for shape dimensions")


@mcp.tool(
    title="List core shape families",
    description="The core shape families (E, ETD, PQ, RM, toroid, …) the engine knows.",
    structured_output=False,
)
def list_shape_families() -> CallToolResult:
    """Shape families."""
    families = _unwrap(om.get_available_core_shape_families())
    return _catalogue_result(
        f"{len(families)} shape family/families: " + ", ".join(str(f) for f in families),
        families, "shape family")


@mcp.tool(
    title="List core manufacturers",
    description="Core manufacturers in the engine's database.",
    structured_output=False,
)
def list_core_manufacturers() -> CallToolResult:
    """Core manufacturers."""
    makers = _unwrap(om.get_available_core_manufacturers())
    return _catalogue_result(
        f"{len(makers)} manufacturer(s): " + ", ".join(str(m) for m in makers),
        makers, "core manufacturer")


@mcp.tool(
    title="List core-loss models",
    description=(
        "Which core-loss models apply to a magnetic (Steinmetz, iGSE, Roshen, …) — "
        "different models disagree, so the choice is part of the answer."
    ),
    structured_output=False,
)
def list_core_loss_models(magnetic: dict) -> CallToolResult:
    """Applicable core-loss models."""
    methods = _unwrap(om.get_available_core_losses_methods(magnetic))
    # The models are a catalogue of what CAN answer, not an answer: they disagree by more
    # than most thermal margins, which is why choosing one is part of the question.
    return _catalogue_result(
        f"{len(methods)} core-loss model(s) available for "
        f"{_reference(magnetic)}: " + ", ".join(str(m) for m in methods),
        methods, "core-loss model")


# --- the MCP Apps UI resource ----------------------------------------------

def _widget(filename: str) -> str:
    bundle = Path(__file__).parent / "dist" / filename
    if not bundle.exists():
        raise FileNotFoundError(
            f"{bundle} missing -- build the widgets first: cd mcp && npm install && npm run build")
    return bundle.read_text(encoding="utf-8")


@mcp.resource(UI_CURVES_URI, name="openmagnetics-curves-widget",
              title="OpenMagnetics sweeps", mime_type=UI_RESOURCE_MIME)
def curves_widget() -> str:
    """Sweep chart for impedance, losses and inductance."""
    return _widget("curves.html")


def assert_widgets_resolve() -> None:
    """Refuse to serve a ui:// nobody can fetch.

    Eight sweep tools advertised ui://openmagnetics/curves.html for months while mcp/ held
    only this file — no package.json, no widget source, no dist/. Every MCP Apps host asked
    for the resource and got a FileNotFoundError, and nothing complained, because the TEXT
    result still worked: the failure was invisible in a plain client and broke only where
    the feature is meant to shine (ABT #651).

    A tool that advertises a chart the host cannot fetch is worse than one that advertises
    nothing, so this fails at startup rather than per request.
    """
    missing = [name for uri, name in ((UI_CURVES_URI, "curves.html"),)
               if not (Path(__file__).parent / "dist" / name).exists()]
    if missing:
        raise RuntimeError(
            "REFUSING to start: these widget bundles are advertised over MCP but absent — "
            + ", ".join(missing)
            + ". Build them first:  cd mcp && npm install && npm run build"
        )


def build_app():
    from starlette.middleware.cors import CORSMiddleware

    assert_widgets_resolve()

    app = mcp.streamable_http_app()
    app.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
                       allow_headers=["*"], expose_headers=["Mcp-Session-Id"])
    return app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(build_app(), host=mcp.settings.host, port=mcp.settings.port)

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

import functools
import gzip
import hashlib
import inspect
import json
import os
import sys
import tempfile
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
UI_PICKER_URI = "ui://openmagnetics/picker.html"
UI_COIL_URI = "ui://openmagnetics/coil.html"
UI_RESULT_URI = "ui://openmagnetics/result.html"


def _ui_meta(uri: str) -> dict:
    return {"ui/resourceUri": uri, "ui": {"resourceUri": uri}}


UI_CURVES_META = _ui_meta(UI_CURVES_URI)
# The ranked-design picker (ABT #652): the advisers' digests in a sortable table, and the
# chosen design's mas:// handle sent back to the model through the MCP Apps bridge.
UI_PICKER_META = _ui_meta(UI_PICKER_URI)
# The wound-coil view (ABT #653): MKF's own Painter cross-section of what a wind_* tool laid
# out, beside a per-section / per-layer table read from the wound coil.
UI_COIL_META = _ui_meta(UI_COIL_URI)
# The result panel for the analysis tools (ABT #654): the number, its breakdown as the engine
# reported it, the model that computed it and the operating point it holds at.
UI_RESULT_META = _ui_meta(UI_RESULT_URI)

# Every ui:// this server advertises and the dist/ bundle that serves it. One table, read by
# both the resources and the startup assertion, so a widget cannot be added to one and not
# the other.
UI_WIDGETS = {UI_CURVES_URI: "curves.html", UI_PICKER_URI: "picker.html",
              UI_COIL_URI: "coil.html", UI_RESULT_URI: "result.html"}

# How each adviser orders what it returns, stated as a field so the picker can say why a design
# sits where it does instead of showing a bare number. The two paths rank in OPPOSITE
# directions, which is exactly why this cannot be left implicit (MKF MagneticAdviser.cpp):
#   full / catalogue: the weighted filter total, sorted descending, ties by magnetic reference;
#   fast:             the "score" IS the total loss in W (core + winding), sorted ascending.
MAGNETIC_ADVISER_ORDER = ("the MagneticAdviser weighted filter total (higher first; equal "
                          "scores by magnetic reference)")
FAST_ADVISER_ORDER = ("total losses, core + winding, in W (lower first): the fast adviser's "
                      "score is that loss sum, not a weighted total")

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


# --- the document store: what a model gets a HANDLE to, not a copy of ------------------
#
# The adviser's own output is megabytes. One advise_cores call measured 5,367,760 characters,
# advise_magnetics 966,180 and 1,283,786; Claude Code refused each with "exceeds maximum
# allowed tokens", the model retried with another tool, and the turn ended having produced no
# answer at all. The engine was working perfectly and the user got nothing.
#
# So the DOCUMENT stays here and the model carries a reference. Not a compression problem:
# gzip+base64 costs about a fifth of the tokens, which sounds like the answer until you scale
# it — that 5.4 MB payload is still ~300,000 tokens — and a model cannot decompress base64 in
# its context anyway, so it would be holding bytes it cannot read. Compression belongs on the
# DISK side of a handle, which is where it is used here (8x, and free).

_STORE = Path(os.environ.get("OPENMAGNETICS_WORK_DIR")
              or (Path(tempfile.gettempdir()) / "openmagnetics-mas"))
_REF_SCHEME = "mas://"


def _clean(node):
    """Drop nulls and empty objects — the WebFrontend's `clean()`, minus its bug.

    In MAS an absent optional and a null field are the same fact, so this removes no
    information: 22% off a full document, 34% off a magnetic, and an impedance sweep computed
    from the cleaned copy agrees with the original to 0.0000%. That is what separates it from
    a sampling setting, which buys size by changing the answer.

    The shared helper in WebSharedComponents also deletes empty ARRAYS, and that is not
    information-free: `turnsRatios: []` is how a MAS says "an inductor", and without it the
    engine refuses the document with `key 'turnsRatios' not found`. It buys 39 characters in
    130,000 (0.04%) in exchange for a document the engine cannot load, so empty arrays stay.
    """
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            value = _clean(value)
            if value is None or value == "null" or (isinstance(value, dict) and not value):
                continue
            out[key] = value
        return out
    if isinstance(node, list):
        return [_clean(v) for v in node if v is not None and v != "null"]
    return node


def _register_mas(document: dict) -> str:
    """Keep a document and return the handle that fetches it back."""
    blob = gzip.compress(json.dumps(_clean(document), separators=(",", ":")).encode(), 6)
    ident = hashlib.sha256(blob).hexdigest()[:16]
    _STORE.mkdir(parents=True, exist_ok=True)
    path = _STORE / f"{ident}.json.gz"
    if not path.exists():
        path.write_bytes(blob)
    return f"{_REF_SCHEME}{ident}"


def _resolve_mas(ref: str) -> dict:
    ident = ref[len(_REF_SCHEME):].strip()
    if not ident or "/" in ident or ".." in ident:
        raise ValueError(f"{ref!r} is not a document handle")
    path = _STORE / f"{ident}.json.gz"
    if not path.exists():
        raise ValueError(
            f"{ref} is not in this server's store. Handles live as long as the server does; "
            f"re-run the adviser call that produced it.")
    return json.loads(gzip.decompress(path.read_bytes()))


def _dig(document: dict, name: str):
    """The part of a stored document a parameter of this name is asking for.

    A handle names a MAS; `magnetic=` wants its magnetic and `coil=` wants that magnetic's
    coil. Resolving to the whole document instead would hand the engine a shape it rejects
    several frames deep, where the error names a C++ field rather than the argument.
    """
    if name == "magnetic":
        return document.get("magnetic") or document
    if name == "coil":
        return ((document.get("magnetic") or document).get("coil") or {})
    if name == "inputs":
        return document.get("inputs") or document
    if name == "core":
        core = (document.get("magnetic") or document).get("core")
        if not core:
            raise ValueError("the document behind this handle has no core to pass as `core`")
        return core
    if name in ("mas", "document"):
        return document
    return document


def resolves_refs(fn):
    """Let any document parameter be given as a handle instead of a document.

    functools.wraps matters here beyond tidiness: FastMCP builds each tool's input schema
    from inspect.signature, which follows __wrapped__ — so the schema stays the real one.
    """
    takes_core = "core" in inspect.signature(fn).parameters

    @functools.wraps(fn)
    def wrapper(**kwargs):
        coil_document = None
        for key, value in list(kwargs.items()):
            if isinstance(value, str) and value.startswith(_REF_SCHEME):
                document = _resolve_mas(value)
                if key == "coil":
                    coil_document = document
                kwargs[key] = _dig(document, key)
        # A coil given BY HANDLE comes from a stored magnetic, and that magnetic's core is the
        # one this coil is wound on — the same design, not a substitute. The wind_* tools need
        # it only to have the Painter draw the result; a coil passed inline carries no core,
        # and then the caller must name one (or the drawing says it could not be made).
        if takes_core and coil_document is not None and kwargs.get("core") is None:
            magnetic = coil_document.get("magnetic") or coil_document
            if magnetic.get("core"):
                kwargs["core"] = magnetic["core"]
        return fn(**kwargs)
    return wrapper


def _digest(mas: dict) -> dict:
    """What a reader needs to CHOOSE between designs, without the document behind it.

    Deliberately small and deliberately physical: shape, material, gap, turns, wire. A rank
    and a score alone say one design beat another without saying what either IS, which leaves
    a model no basis to pick and nothing to tell the user.
    """
    magnetic = (mas or {}).get("magnetic") or mas or {}
    core = magnetic.get("core") or {}
    fd = core.get("functionalDescription") or {}
    shape = fd.get("shape")
    material = fd.get("material")
    out: dict = {}
    if isinstance(shape, dict):
        out["shape"] = shape.get("name")
    elif shape:
        out["shape"] = shape
    if isinstance(material, dict):
        out["material"] = material.get("name")
        out["manufacturer"] = ((material.get("manufacturerInfo") or {}).get("name"))
    elif material:
        out["material"] = material
    gaps = fd.get("gapping") or []
    grinding = [g for g in gaps if g.get("type") == "subtractive"]
    if grinding:
        out["gap_mm"] = round(float(grinding[0].get("length") or 0.0) * 1000, 4)
    effective = ((core.get("processedDescription") or {}).get("effectiveParameters") or {})
    if effective.get("effectiveArea"):
        out["effective_area_mm2"] = round(float(effective["effectiveArea"]) * 1e6, 3)
    coil = magnetic.get("coil") or {}
    for key, name in (("sectionsDescription", "sections"), ("layersDescription", "layers"),
                      ("turnsDescription", "turns_described")):
        if coil.get(key):
            out[name] = len(coil[key])
    windings = coil.get("functionalDescription") or []
    if windings:
        out["turns"] = [w.get("numberTurns") for w in windings]
        wire = (windings[0].get("wire") or {})
        if wire.get("name"):
            out["wire"] = wire["name"]
    outputs = (mas or {}).get("outputs") or []
    if outputs:
        first = outputs[0] if isinstance(outputs, list) else outputs
        losses = (first or {}).get("coreLosses") or {}
        if losses.get("coreLosses") is not None:
            out["core_losses_w"] = round(float(losses["coreLosses"]), 4)
        winding = (first or {}).get("windingLosses") or {}
        if winding.get("windingLosses") is not None:
            out["winding_losses_w"] = round(float(winding["windingLosses"]), 4)
    return out


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
        "document": _clean(document),
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


def _designs_result(summary: str, entries: list, kind: str, caveat: str | None = None,
                    detail: bool = False, tiebreaker: str | None = None) -> CallToolResult:
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
        # What the total is made of: the engine's per-filter scores, when it reports them.
        # They are the answer to "why is this one above that one", which the total alone hides.
        per_filter = entry.get("scoringPerFilter") if isinstance(entry, dict) else None
        if isinstance(per_filter, dict) and per_filter:
            # Labelled as the engine's per-filter figure and nothing more: they are not the
            # weighted terms of the total (they do not sum to it), so no arithmetic is implied.
            design["notes"] = [f"filter score {name}: {value:.4g}" if isinstance(value, (int, float))
                               else f"filter score {name}: {value}"
                               for name, value in per_filter.items()]
        document = mas if mas else (entry if isinstance(entry, dict) else None)
        if document:
            # The digest and the handle, not the document — unless the caller asked. See the
            # note above _register_mas: the documents here reach millions of characters, and a
            # tool result the model is refused is worse than a small one, because the engine
            # still ran and the turn still ends with nothing.
            properties = _digest(document)
            if properties:
                design["properties"] = properties
            design["ref"] = _register_mas(document)
            if detail:
                design["document"] = document
        designs.append(design)
    payload = {"mode": "design", "kind": kind, "designs": designs}
    if caveat:
        payload["caveat"] = caveat
    if tiebreaker:
        payload["tiebreaker"] = tiebreaker
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
                   "schema": {"name": "MAS"}, "document": _clean(magnetic)}
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
    meta=UI_PICKER_META, structured_output=False,
)
@resolves_refs
def advise_magnetics(inputs: dict | str | str, count: int = 3, mode: str = DEFAULT_CORE_MODE,
                     fast: bool = True, detail: bool = False) -> CallToolResult:
    """Ranked core+coil designs for MAS Inputs.

    Args:
        inputs: MAS Inputs (designRequirements + operatingPoints). Kirchhoff's
            magnetic_inputs tool produces exactly this.
        count: how many designs to return.
        mode: 'available cores' (real stocked cores), 'standard cores', 'custom cores'.
        fast: True ranks quickly (~8 s) but stops at the core — good for browsing,
            NOT usable for impedance/SPICE/loss analysis. False runs the full
            adviser (~1 min) and returns designs every other tool here accepts.
        detail: inline each full MAS document in the result. Off by default and rarely
            what you want: these run to millions of characters and will be refused as
            too large. Every design carries a `ref` handle that any tool here accepts
            in place of the document, and fetch_design reads a part of one.
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
        designs, "magnetic", detail=detail,
        tiebreaker=FAST_ADVISER_ORDER if fast else MAGNETIC_ADVISER_ORDER,
        # The FAST caveat is a FIELD, not only a sentence: a design with no coil described
        # makes every downstream loss model return NaN deep inside the engine, and a consumer
        # that cannot read it from the payload will pass one on and be told "Energy cannot be nan".
        caveat=("fast designs: the core is chosen, the coil is not described — re-run with "
                "fast=false before impedance, SPICE export or loss analysis" if fast else None))


@mcp.tool(
    title="Read part of a stored design",
    description=(
        "Read one part of a design document held by handle. The advisers return a `ref` "
        "instead of the document because a full MAS runs to millions of characters; this "
        "fetches the piece you actually need."
    ),
    structured_output=False,
)
def fetch_design(ref: str, path: str = "") -> CallToolResult:
    """A subtree of a stored document.

    Args:
        ref: the handle from a design (`mas://…`).
        path: dotted path into the document, e.g. `magnetic.core.functionalDescription`
            or `magnetic.coil.functionalDescription.0.numberTurns`. Empty returns the
            whole document, which for a full MAS is usually too large to be accepted —
            ask for the part you need.
    """
    document = _resolve_mas(ref if ref.startswith(_REF_SCHEME) else _REF_SCHEME + ref)
    node, walked = document, []
    for step in [x for x in path.split(".") if x]:
        walked.append(step)
        if isinstance(node, list):
            try:
                node = node[int(step)]
            except (ValueError, IndexError):
                raise ValueError(
                    f"{'.'.join(walked)} does not exist: that level is a list of "
                    f"{len(node)} item(s), so the step must be an index within it.")
        elif isinstance(node, dict):
            if step not in node:
                raise ValueError(f"{'.'.join(walked)} does not exist. Available here: "
                                 f"{', '.join(sorted(node)[:14]) or '(nothing)'}")
            node = node[step]
        else:
            raise ValueError(f"{'.'.join(walked[:-1])} is a {type(node).__name__}, "
                             f"which has no {step!r} inside it.")
    size = len(json.dumps(node, separators=(",", ":")))
    subject = _reference(document.get("magnetic") or {})
    if not isinstance(node, (dict, list)):
        # A leaf comes back as the one-key excerpt it IS in its parent, not as a `quantity`.
        # A quantity must carry a unit for a number, and NOTHING here knows the unit of an
        # arbitrary MAS field — emitting unit: null to fill the slot is what the boundary
        # validator caught, correctly. The value's own name is the honest key, and the summary
        # line above carries the readable form.
        node = {path.rsplit(".", 1)[-1] or "value": node}
    return _document_result(
        f"{path or 'the whole document'}: {size:,} characters"
        + ("  — large; ask for a narrower path if this is refused" if size > 60_000 else ""),
        schema="MAS", operation="read", document=node, subject=subject)


@mcp.tool(
    title="Advise cores only",
    description="Rank candidate CORES (shape + material + gap) for a set of MAS Inputs.",
    meta=UI_PICKER_META, structured_output=False,
)
@resolves_refs
def advise_cores(inputs: dict | str | str, count: int = 3, mode: str = DEFAULT_CORE_MODE,
                 weights: dict | None = None, detail: bool = False) -> CallToolResult:
    """Ranked cores.

    Args:
        weights: optional per-filter weighting object for the core adviser.
        detail: inline each full document. Off by default — one measured call returned
            5,367,760 characters, which no model can be handed. Use the `ref` handles.
    """
    cores = _unwrap(om.calculate_advised_cores(inputs, weights or {}, count, _core_mode(mode)))
    names = [_reference((c.get("mas") or {}).get("magnetic") or c) for c in (cores or [])]
    return _designs_result(f"{len(cores or [])} core(s): " + ", ".join(names[:8]),
                           cores, "core", detail=detail)


@mcp.tool(
    title="Advise a coil",
    description=(
        "Design the winding (sections, layers, turns, wires) for a magnetic that already "
        "has a core — the step the FAST adviser skips."
    ),
    meta=UI_PICKER_META, structured_output=False,
)
@resolves_refs
def advise_coil(mas: dict | str) -> CallToolResult:
    """Complete the coil of a MAS whose core is already chosen."""
    out = _unwrap(om.calculate_advised_coil(mas))
    magnetic = (out or {}).get("magnetic") or {}
    coil = magnetic.get("coil") or {}
    turns = len(coil.get("turnsDescription") or [])
    # A digest and a handle, like the other two advisers — because this one's size is driven by
    # the TURN COUNT and it was already at 93% of a client's limit for a 9-turn inductor:
    # 66,861 characters at 9 turns, 92,599 at 28, about 1.35 kB per turn. Any transformer
    # crosses it, and crossing it means the model is handed nothing and the turn dies quietly.
    # Inlining here was safe only for the smallest thing anyone would design.
    return _designs_result(
        f"Coil designed for {_reference(magnetic)}: {turns} turn(s) described, "
        f"{len(coil.get('sectionsDescription') or [])} section(s). The wound MAS is behind the "
        f"handle below; fetch_design reads any part of it.",
        [{"mas": out}], "magnetic")


@mcp.tool(
    title="Advise magnetics from a catalog",
    description="Rank off-the-shelf catalog magnetics against MAS Inputs (no custom design).",
    meta=UI_PICKER_META, structured_output=False,
)
@resolves_refs
def advise_from_catalog(inputs: dict | str | str, catalog: list, count: int = 3) -> CallToolResult:
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
                           out, "magnetic", tiebreaker=MAGNETIC_ADVISER_ORDER)


# --- tools: losses and analysis --------------------------------------------
#
# Each answers as a `quantity` and is viewed through ui://…/result.html: the number, the parts
# the engine split it into, the model that computed it and the operating point it holds at.
# Nothing here models anything. The values are the engine's, read out of its own output; the
# conditions are the caller's operating point, read back. Where a field is absent it is absent
# from the panel too — an omitted breakdown and a breakdown of zeros are different facts.

# The processed waveform fields an operating point may state, with their units. Read, never
# derived: a waveform given only as samples states none of them, and then none are shown.
# Each is (MAS field, unit or None for the signal's own, label).
_PROCESSED_FIELDS = (("label", None, "waveform"), ("peakToPeak", None, "peak-to-peak"),
                     ("offset", None, "offset"), ("peak", None, "peak"), ("rms", None, "RMS"),
                     ("dutyCycle", "1", "duty cycle"))


def _operating_point_conditions(operating_point: dict) -> dict:
    """The operating point as named conditions, exactly as the caller stated it."""
    if not isinstance(operating_point, dict):
        raise ValueError(f"operating_point must be a MAS operating point object, got "
                         f"{type(operating_point).__name__}")
    excitations = operating_point.get("excitationsPerWinding")
    if not isinstance(excitations, list) or not excitations:
        raise ValueError("operating_point has no excitationsPerWinding, so it states no "
                         "operating point to compute at")
    out: dict = {}
    ambient = (operating_point.get("conditions") or {}).get("ambientTemperature")
    if isinstance(ambient, (int, float)) and not isinstance(ambient, bool):
        out["ambientTemperature"] = {"value": float(ambient), "unit": "degC",
                                     "label": "ambient temperature"}
    for i, excitation in enumerate(excitations):
        name = (excitation or {}).get("name") or f"winding {i}"
        frequency = (excitation or {}).get("frequency")
        if isinstance(frequency, (int, float)) and not isinstance(frequency, bool):
            out[f"{name}.frequency"] = {"value": float(frequency), "unit": "Hz",
                                        "label": f"{name} frequency"}
        for signal, unit in (("current", "A"), ("voltage", "V")):
            processed = (((excitation or {}).get(signal) or {}).get("processed") or {})
            for field, field_unit, field_label in _PROCESSED_FIELDS:
                value = processed.get(field)
                if value is None:
                    continue
                entry = {"value": value if isinstance(value, str) else float(value),
                         "label": f"{name} {signal} {field_label}"}
                if not isinstance(value, str):
                    entry["unit"] = field_unit or unit
                out[f"{name}.{signal}.{field}"] = entry
    return out


def _harmonic_sum(element: dict | None, what: str) -> float | None:
    """The engine's per-harmonic losses of one element, added up — the sum MKF itself takes
    for its total. None when the engine did not report the element at all."""
    if element is None:
        return None
    per = element.get("lossesPerHarmonic")
    if not isinstance(per, list) or not all(isinstance(v, (int, float)) for v in per):
        raise RuntimeError(f"{what}: the engine reported the element without numeric "
                           f"lossesPerHarmonic: {element!r}"[:400])
    return float(sum(per))


@mcp.tool(
    title="Core losses",
    description="Core loss of a magnetic at an operating point, with the model used.",
    meta=UI_RESULT_META, structured_output=False,
)
@resolves_refs
def core_losses(magnetic: dict | str, operating_point: dict, temperature: float = 25.0,
                models: dict | None = None) -> CallToolResult:
    """Core losses in W."""
    _require_complete(magnetic, "core loss calculation")
    # (core, coil, inputs, models) — not (magnetic, operatingPoint, models, temperature). The
    # old call shape raised "key 'functionalDescription' not found" from deep inside the engine,
    # which reads like bad data and was a wrong signature.
    #
    # TEMPERATURE travels in the operating point's conditions, where the engine looks for it;
    # passing it as a fifth argument silently did nothing.
    at = _at_temperature(operating_point, temperature)
    inputs = {"designRequirements": {"magnetizingInductance": {"nominal": 0}, "turnsRatios": []},
              "operatingPoints": [at]}
    out = _unwrap(om.calculate_core_losses(magnetic.get("core") or {}, magnetic.get("coil") or {},
                                           inputs, models or {}))
    if not isinstance(out, dict):
        raise RuntimeError(f"the core-loss model returned {out!r}, not a core-loss output"[:400])
    losses = _scalar(out.get("coreLosses"), "W", "core losses")
    if not losses:
        raise RuntimeError(f"the core-loss model returned no numeric coreLosses: "
                           f"{sorted(out)}")
    # WHICH MODEL SAID SO is half the answer: Steinmetz, iGSE and Roshen disagree by more
    # than most thermal margins, and a bare number cannot be checked against another run.
    model = out.get("methodUsed") or (models or {}).get("coreLosses")
    if not model:
        raise RuntimeError("the core-loss output does not name the model that computed it")
    quantities = {"coreLosses": losses}
    for key, unit, label in (("volumetricLosses", "W/m3", "volumetric core losses"),
                             ("magneticFluxDensityPeak", "T", "peak flux density"),
                             ("magneticFluxDensityAcPeak", "T", "AC peak flux density"),
                             ("temperature", "degC", "core temperature the losses hold at"),
                             ("maximumCoreTemperatureRise", "K",
                              "core temperature rise the engine estimated")):
        entry = _scalar(out.get(key), unit, label)
        if entry:
            quantities[key] = entry
    conditions = {"temperature": {"value": float(temperature), "unit": "degC",
                                  "label": "temperature requested"},
                  **_operating_point_conditions(at)}
    # The excitation as the ENGINE processed it, beside the one the caller stated.
    for key, unit, label in (("currentRms", "A", "RMS current (engine-processed)"),
                             ("voltageRms", "V", "RMS voltage (engine-processed)")):
        if isinstance(out.get(key), (int, float)) and not isinstance(out.get(key), bool):
            conditions[key] = {"value": float(out[key]), "unit": unit, "label": label}
    return _quantity_result(
        f"Core losses {_eng(losses['value'], 'W')} ({model}) at {temperature} °C for "
        f"{_reference(magnetic)}.",
        subject=_reference(magnetic), model=str(model), quantities=quantities,
        conditions=conditions)


@mcp.tool(
    title="Winding losses",
    description="DC + AC winding losses (skin and proximity) per winding.",
    meta=UI_RESULT_META, structured_output=False,
)
@resolves_refs
def winding_losses(magnetic: dict | str, operating_point: dict,
                   temperature: float = 25.0) -> CallToolResult:
    """Winding losses breakdown."""
    _require_complete(magnetic, "winding loss calculation")
    out = _unwrap(om.calculate_winding_losses(magnetic, operating_point, temperature))
    if not isinstance(out, dict):
        raise RuntimeError(f"the winding-loss model returned {out!r}, not a loss output"[:400])
    total = _scalar(out.get("windingLosses"), "W", "winding losses")
    if not total:
        raise RuntimeError(f"the winding-loss model returned no numeric windingLosses: "
                           f"{sorted(out)}")
    quantities = {"windingLosses": total}
    # The split the engine reports PER WINDING — DC (ohmic), skin, proximity — each as its own
    # quantity whose breakdown is per winding, in W like the total. (This used to put the DC
    # RESISTANCE per winding, in ohms, under a breakdown of the loss in W.)
    per_winding = out.get("windingLossesPerWinding")
    if isinstance(per_winding, list) and per_winding:
        parts = {"ohmicLosses": {}, "skinEffectLosses": {}, "proximityEffectLosses": {}}
        for i, element in enumerate(per_winding):
            name = (element or {}).get("name") or f"winding {i}"
            ohmic = (element or {}).get("ohmicLosses")
            if ohmic is not None:
                if not isinstance(ohmic.get("losses"), (int, float)):
                    raise RuntimeError(f"{name}: ohmicLosses carries no numeric losses: {ohmic!r}")
                parts["ohmicLosses"][name] = float(ohmic["losses"])
            for key in ("skinEffectLosses", "proximityEffectLosses"):
                value = _harmonic_sum((element or {}).get(key), f"{name} {key}")
                if value is not None:
                    parts[key][name] = value
        labels = {"ohmicLosses": "DC (ohmic) losses",
                  "skinEffectLosses": "skin-effect losses (sum over harmonics)",
                  "proximityEffectLosses": "proximity-effect losses (sum over harmonics)"}
        for key, breakdown in parts.items():
            if breakdown:
                quantities[key] = {"value": float(sum(breakdown.values())), "unit": "W",
                                   "label": labels[key], "breakdown": breakdown}
        # The parts must add up to the engine's own total. If they do not, this reading of its
        # output is wrong, and a panel that shows parts disagreeing with their sum is worse than
        # one that shows only the sum.
        split = sum(q["value"] for k, q in quantities.items() if k in parts)
        if abs(split - total["value"]) > 1e-6 + 1e-3 * abs(total["value"]):
            raise RuntimeError(f"the per-winding DC + skin + proximity losses add up to {split} W "
                               f"but the engine's total is {total['value']} W")
    resistance = out.get("dcResistancePerWinding")
    if isinstance(resistance, list) and resistance:
        names = ([(e or {}).get("name") for e in per_winding]
                 if isinstance(per_winding, list) else [])
        quantities["dcResistancePerWinding"] = {
            # No single value: the resistances of different windings do not add to anything.
            "value": None, "unit": "ohm", "label": "DC resistance per winding",
            "breakdown": {(names[i] if i < len(names) and names[i] else f"winding {i}"): float(v)
                          for i, v in enumerate(resistance)}}
    if not out.get("methodUsed"):
        raise RuntimeError("the winding-loss output does not name the method that computed it")
    settings = om.get_settings()
    model = (f"{out['methodUsed']} (skin: "
             f"{settings['windingSkinEffectLossesModel']}, proximity: "
             f"{settings['windingProximityEffectLossesModel']})")
    return _quantity_result(
        f"Winding losses {_eng(total['value'], 'W')} at {temperature} °C for "
        f"{_reference(magnetic)}"
        + "".join(f"; {quantities[k]['label']} {_eng(quantities[k]['value'], 'W')}"
                  for k in ("ohmicLosses", "skinEffectLosses", "proximityEffectLosses")
                  if k in quantities),
        subject=_reference(magnetic), model=model, quantities=quantities,
        conditions={"temperature": {"value": float(temperature), "unit": "degC",
                                    "label": "winding temperature"},
                    **_operating_point_conditions(operating_point)})


@mcp.tool(
    title="Leakage inductance",
    description="Leakage inductance matrix between windings at a frequency.",
    meta=UI_RESULT_META, structured_output=False,
)
@resolves_refs
def leakage_inductance(magnetic: dict | str, frequency: float = 100000.0,
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
    missing = [f"{a}->{b}" for a in windings for b in windings
               if b not in (magnitude.get(a) or {})]
    if missing:
        # Not filled with 0 H: a pair the engine did not report is not a pair with no leakage.
        raise RuntimeError("the leakage-inductance matrix the engine returned is not square; "
                           "missing pairs: " + ", ".join(missing))
    matrix = [[_resolve_dimension(magnitude[a][b]) for b in windings] for a in windings]
    return _quantity_result(
        f"Leakage inductance matrix at {_eng(frequency, 'Hz')} for {_reference(magnetic)}.",
        subject=_reference(magnetic), model="MKF leakage-inductance matrix",
        quantities={"leakageInductance": {
            "matrix": matrix, "unit": "H",
            "label": "per winding pair, in the order " + ", ".join(windings)}},
        conditions={"frequency": {"value": float(frequency), "unit": "Hz"}})


@mcp.tool(
    title="Peak winding current",
    description="Peak magnetizing (flux-driving) current at an operating point, referred to "
                "one winding.",
    meta=UI_RESULT_META, structured_output=False,
)
@resolves_refs
def peak_winding_current(magnetic: dict | str, operating_point: dict,
                         winding_index: int = 0) -> CallToolResult:
    """Peak magnetizing current, A.

    What MKF's calculate_peak_winding_current returns: the peak of the MAGNETIZING current, the
    part that drives core flux, referred to `winding_index` — not the peak of that winding's
    own current, which for a transformer also carries reflected load current.
    """
    out = _unwrap(om.calculate_peak_winding_current(magnetic, operating_point, winding_index))
    peak = _scalar(out, "A", f"peak magnetizing current, referred to winding {winding_index}")
    if not peak:
        raise RuntimeError(f"the engine returned no numeric peak current: {out!r}")
    return _quantity_result(
        f"Peak magnetizing current referred to winding {winding_index}: {_eng(out, 'A')}",
        subject=_reference(magnetic), model="MKF peak magnetizing current",
        quantities={"peakWindingCurrent": peak},
        conditions={"winding": {"value": winding_index, "unit": "1",
                                "label": "winding index referred to"},
                    **_operating_point_conditions(operating_point)})


@mcp.tool(
    title="Temperature from thermal resistance",
    description="Core temperature from its thermal resistance and total losses.",
    meta=UI_RESULT_META, structured_output=False,
)
@resolves_refs
def core_temperature(magnetic: dict | str, total_losses: float) -> CallToolResult:
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
    model = om.get_settings().get("coreThermalResistanceModel")
    if not model:
        raise RuntimeError("the engine settings name no coreThermalResistanceModel")
    return _quantity_result(
        f"Core reaches {out} °C with {_eng(total_losses, 'W')} of loss.",
        subject=_reference(magnetic), model=f"core thermal resistance ({model})",
        quantities={"coreTemperature": temperature},
        conditions={"totalLosses": {"value": float(total_losses), "unit": "W",
                                    "label": "total losses dissipated"}})


# --- tools: sweeps (all chart into the curves widget) -----------------------

@mcp.tool(
    title="Impedance vs frequency",
    description="Sweep a magnetic's impedance across frequency and chart it.",
    meta=UI_CURVES_META, structured_output=False,
)
@resolves_refs
def sweep_impedance(magnetic: dict | str, start_hz: float = 1e3, stop_hz: float = 1e7,
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
@resolves_refs
def sweep_core_losses(magnetic: dict | str, operating_point: dict, start_hz: float = 1e4,
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
@resolves_refs
def sweep_winding_losses(magnetic: dict | str, operating_point: dict, start_hz: float = 1e4,
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
@resolves_refs
def sweep_inductance_vs_dc_bias(magnetic: dict | str, start_a: float = 0.0, stop_a: float = 10.0,
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
@resolves_refs
def sweep_inductance_vs_frequency(magnetic: dict | str, start_hz: float = 1e3, stop_hz: float = 1e7,
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
@resolves_refs
def sweep_inductance_vs_temperature(magnetic: dict | str, start_c: float = -40.0, stop_c: float = 125.0,
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
@resolves_refs
def sweep_q_factor(magnetic: dict | str, start_hz: float = 1e3, stop_hz: float = 1e7,
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
@resolves_refs
def sweep_resistance(magnetic: dict | str, start_hz: float = 1e3, stop_hz: float = 1e7,
                     temperature: float = 25.0,
                     points: int = 30, mode: str = "log") -> CallToolResult:
    """R_ac vs frequency."""
    _require_complete(magnetic, "a resistance sweep")
    out = _unwrap(om.sweep_resistance_over_frequency(
        magnetic, start_hz, stop_hz, points, temperature, mode, ""))
    return _sweep_result(out, "AC resistance", FREQ_AXIS, _axis("AC resistance", "ohm"), magnetic=magnetic)


# --- tools: winding ---------------------------------------------------------
#
# Every wind_* result is the wound coil as a `document`, viewed through ui://…/coil.html. The
# picture is MKF's own Painter (PyOpenMagnetics plot_*), never geometry drawn here: the Painter
# is what the web app and every MKF report draw, so the cross-section an engineer judges in a
# chat is the one the engine itself believes in. It needs the CORE as well as the coil — a
# coil alone has no window to sit in — which is why each tool takes an optional `core`.

# Which Painter call can draw a coil wound to a given depth. The deepest description present
# decides: plot_magnetic draws turns (and needs them — "Winding turns not created" otherwise),
# plot_layers needs layers, plot_sections needs only sections.
_PAINTERS = (
    ("turns", "turnsDescription", "plot_magnetic", "core, bobbin and every turn"),
    ("layers", "layersDescription", "plot_layers", "core, bobbin and the layers"),
    ("sections", "sectionsDescription", "plot_sections", "core, bobbin and the sections"),
)


def _core_name(core: dict) -> str:
    fd = core.get("functionalDescription") or {}
    shape = fd.get("shape")
    name = core.get("name") or (shape.get("name") if isinstance(shape, dict) else shape)
    if not name:
        raise ValueError("the core names neither itself nor its shape, so the cross-section "
                         "cannot say what it is a cross-section OF")
    return str(name)


def _cross_section(coil: dict, core: dict | None) -> tuple[dict | None, str | None]:
    """The Painter's SVG of `coil` on `core` as a companion document, or why there is none.

    Returns (companion, None) or (None, reason). A missing core or a Painter refusal is a
    reason the widget shows in place of the drawing — never a substitute picture, and never a
    reason to withhold the wound coil, which is valid either way.
    """
    if not core:
        return None, ("cross-section not drawn: no core was given, and the Painter cannot place "
                      "a coil without one. Pass `core` (the core of the magnetic this coil "
                      "belongs to; a mas:// handle works), or pass the coil itself as a handle.")
    for level, key, painter, shows in _PAINTERS:
        if coil.get(key):
            break
    else:
        raise RuntimeError("the winding returned no sections, layers or turns, so there is "
                           "nothing wound to draw")
    drawn = getattr(om, painter)({"core": core, "coil": coil})
    if not isinstance(drawn, dict) or not drawn.get("success"):
        error = (drawn or {}).get("error") if isinstance(drawn, dict) else drawn
        return None, f"cross-section not drawn: MKF's Painter ({painter}) refused it: {error}"
    svg = drawn.get("svg")
    if not isinstance(svg, str) or "<svg" not in svg:
        return None, (f"cross-section not drawn: MKF's Painter ({painter}) reported success but "
                      f"returned no SVG")
    return {"schema": {"name": "SVG"}, "subject": _core_name(core),
            "document": {"svg": svg, "painter": f"MKF Painter ({painter})", "level": level,
                         "shows": shows}}, None


def _section_lines(coil: dict) -> list[str]:
    """One line per section for the model's text digest: what is in it, counted from the coil.
    Counting, not computing: the filling factor is the engine's own figure, read back."""
    layers = coil.get("layersDescription") or []
    turns = coil.get("turnsDescription") or []
    lines = []
    for section in coil.get("sectionsDescription") or []:
        name = section.get("name")
        windings = ", ".join(pw.get("winding") or "?" for pw in section.get("partialWindings") or [])
        parts = [f"{section.get('type') or 'section'}"]
        if windings:
            parts.append(windings)
        if layers:
            parts.append(f"{sum(1 for l in layers if l.get('section') == name)} layer(s)")
        if turns:
            parts.append(f"{sum(1 for t in turns if t.get('section') == name)} turn(s)")
        if isinstance(section.get("fillingFactor"), (int, float)):
            parts.append(f"filling factor {section['fillingFactor']:.3g}")
        lines.append(f"  {name}: " + ", ".join(parts))
    return lines


def _wound_result(headline: str, change: str, out, core: dict | None) -> CallToolResult:
    if not isinstance(out, dict):
        raise RuntimeError(f"the winding returned {type(out).__name__}, not a coil: {out!r}"[:400])
    companion, why_not = _cross_section(out, core)
    lines = _section_lines(out)
    summary = headline + ("\n" + "\n".join(lines) if lines else "")
    summary += ("\nThe widget shows MKF's Painter cross-section." if companion
                else f"\n{why_not}")
    result = _document_result(
        summary, schema="MAS", version="coil", operation="transformed", document=out,
        subject=companion["subject"] if companion else None,
        changed=[{"ref": "coil", "change": change}],
        diagnostics=[why_not] if why_not else None, view=UI_COIL_URI)
    if companion:
        # Beside the document, not inside it: the wound coil stays exactly the MAS the engine
        # returned, and the picture is a separate artifact that says which Painter made it.
        result.structuredContent["companions"] = {"crossSection": companion}
    return result


def _counts(out) -> tuple[int, int, int]:
    out = out or {}
    return (len(out.get("sectionsDescription") or []), len(out.get("layersDescription") or []),
            len(out.get("turnsDescription") or []))


@mcp.tool(
    title="Wind a coil",
    description="Lay out a coil's turns from its winding description, and draw the result.",
    meta=UI_COIL_META, structured_output=False,
)
@resolves_refs
def wind_coil(coil: dict | str, repetitions: int = 1, proportion_per_winding: list | None = None,
              pattern: list | None = None, margin_pairs: list | None = None,
              core: dict | str | None = None) -> CallToolResult:
    """Full winding pass.

    Args:
        core: the MAS core this coil is wound on, or a mas:// handle. Only the
            cross-section needs it; a coil given as a handle brings its own.
    """
    out = _unwrap(om.wind(coil, repetitions, proportion_per_winding or [],
                          pattern or [], margin_pairs or []))
    sections, _, turns = _counts(out)
    return _wound_result(f"Coil wound: {turns} turn(s), {sections} section(s).",
                         f"wound: {turns} turn(s), {sections} section(s)", out, core)


@mcp.tool(
    title="Wind by turns",
    description="Lay out a coil turn by turn from an existing section/layer description, and "
                "draw the result.",
    meta=UI_COIL_META, structured_output=False,
)
@resolves_refs
def wind_by_turns(coil: dict | str, core: dict | str | None = None) -> CallToolResult:
    """Turn-level winding.

    Args:
        core: the MAS core this coil is wound on, or a mas:// handle. Only the
            cross-section needs it; a coil given as a handle brings its own.
    """
    out = _unwrap(om.wind_by_turns(coil))
    _, _, turns = _counts(out)
    return _wound_result(f"Wound {turns} turn(s).", f"wound turn by turn: {turns} turn(s)",
                         out, core)


@mcp.tool(
    title="Wind by sections",
    description="Split a coil into sections with a winding pattern and insulation, and draw "
                "the result.",
    meta=UI_COIL_META, structured_output=False,
)
@resolves_refs
def wind_by_sections(coil: dict | str, repetitions: int = 1,
                     proportion_per_winding: list | None = None, pattern: list | None = None,
                     insulation_thickness: float = 0.0,
                     core: dict | str | None = None) -> CallToolResult:
    """Section-level winding.

    Args:
        core: the MAS core this coil is wound on, or a mas:// handle. Only the
            cross-section needs it; a coil given as a handle brings its own.
    """
    out = _unwrap(om.wind_by_sections(coil, repetitions, proportion_per_winding or [],
                                      pattern or [], insulation_thickness))
    sections, _, _ = _counts(out)
    return _wound_result(f"Wound into {sections} section(s).",
                         f"split into {sections} section(s)", out, core)


@mcp.tool(
    title="Wind by layers",
    description="Split a coil's sections into layers with inter-layer insulation, and draw "
                "the result.",
    meta=UI_COIL_META, structured_output=False,
)
@resolves_refs
def wind_by_layers(coil: dict | str, insulation_layers: dict | None = None,
                   insulation_thickness: float = 0.0,
                   core: dict | str | None = None) -> CallToolResult:
    """Layer-level winding.

    Args:
        core: the MAS core this coil is wound on, or a mas:// handle. Only the
            cross-section needs it; a coil given as a handle brings its own.
    """
    out = _unwrap(om.wind_by_layers(coil, insulation_layers or {}, insulation_thickness))
    _, layers, _ = _counts(out)
    return _wound_result(f"Wound into {layers} layer(s).", f"split into {layers} layer(s)",
                         out, core)


@mcp.tool(
    title="Wind a planar coil",
    description="Lay out a planar (PCB) winding from a stack-up, and draw the result.",
    meta=UI_COIL_META, structured_output=False,
)
@resolves_refs
def wind_planar(coil: dict | str, stack_up: list, border_to_wire_distance: float = 0.0,
                wire_to_wire_distance: list | None = None,
                insulation_thickness: list | None = None,
                core_to_layer_distance: float = 0.0,
                core: dict | str | None = None) -> CallToolResult:
    """Planar winding.

    Args:
        stack_up: one WINDING INDEX per PCB layer — [0, 0] puts winding 0 on two layers. Not
            turn counts: an index past the last winding walks off the end of the engine's
            winding list and dies with std::bad_alloc rather than a message.
        core: the MAS core this coil is wound on, or a mas:// handle. Only the
            cross-section needs it; a coil given as a handle brings its own.
    """
    out = _unwrap(om.wind_planar(coil, stack_up, border_to_wire_distance,
                                 wire_to_wire_distance or [], insulation_thickness or [],
                                 core_to_layer_distance))
    return _wound_result(f"Planar coil wound over {len(stack_up)} layer(s).",
                         f"planar layout over {len(stack_up)} layer(s)", out, core)


# --- tools: export ----------------------------------------------------------

@mcp.tool(
    title="Export SPICE subcircuit",
    description=(
        "Export a magnetic as a SPICE subcircuit — the model a simulator needs to see "
        "the real core and winding rather than an ideal inductor."
    ),
    structured_output=False,
)
@resolves_refs
def export_spice_subcircuit(magnetic: dict | str) -> CallToolResult:
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
@resolves_refs
def export_symbol(magnetic: dict | str, inputs: dict | str) -> CallToolResult:
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
@resolves_refs
def list_core_loss_models(magnetic: dict | str) -> CallToolResult:
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
    return _widget(UI_WIDGETS[UI_CURVES_URI])


@mcp.resource(UI_PICKER_URI, name="openmagnetics-picker-widget",
              title="OpenMagnetics designs", mime_type=UI_RESOURCE_MIME)
def picker_widget() -> str:
    """Ranked-design picker for the advise_* tools: choose one, its handle goes to the model."""
    return _widget(UI_WIDGETS[UI_PICKER_URI])


@mcp.resource(UI_COIL_URI, name="openmagnetics-coil-widget",
              title="OpenMagnetics wound coil", mime_type=UI_RESOURCE_MIME)
def coil_widget() -> str:
    """The wind_* tools' view: MKF's Painter cross-section and a per-section / per-layer table."""
    return _widget(UI_WIDGETS[UI_COIL_URI])


@mcp.resource(UI_RESULT_URI, name="openmagnetics-result-widget",
              title="OpenMagnetics result", mime_type=UI_RESOURCE_MIME)
def result_widget() -> str:
    """The analysis tools' panel: value, breakdown, model and operating point."""
    return _widget(UI_WIDGETS[UI_RESULT_URI])


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
    missing = [f"{uri} -> dist/{name}" for uri, name in UI_WIDGETS.items()
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

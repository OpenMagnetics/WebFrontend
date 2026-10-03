"""The wound-coil view (ABT #653) and the result panel (ABT #654), server side: which tools
advertise which ui://, the resources, the startup refusal, and the real engine's payloads —
checked here and then fed through the views' own readers (the JS the widgets ship).

    python3 -m pytest mcp/tests/test_server_coil_result.py

Needs the built bundles (cd mcp && npm run build) and PyOpenMagnetics. Everything below the
wiring tests runs the real engine: a cross-section is only worth testing if it is the one MKF's
Painter actually draws for a coil the engine actually wound.
"""

from __future__ import annotations

import asyncio
import copy
import json
import shutil
import subprocess
import sys
from pathlib import Path

import re

import pytest

MCP_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(MCP_DIR))

import server  # noqa: E402

om = server.om
WINDERS = ("wind_coil", "wind_by_turns", "wind_by_sections", "wind_by_layers", "wind_planar")
ANALYSES = ("core_losses", "winding_losses", "leakage_inductance", "peak_winding_current",
            "core_temperature")
INPUTS = json.loads((Path(__file__).parent / "fixtures" / "inductor_inputs.json").read_text())


def _tools() -> dict:
    return {t.name: t for t in asyncio.run(server.mcp.list_tools())}


def _carriers(uri: str) -> list:
    return sorted(n for n, t in _tools().items() if (t.meta or {}).get("ui/resourceUri") == uri)


# --- wiring -----------------------------------------------------------------------------------

def test_the_winders_and_only_they_advertise_the_coil_view():
    assert _carriers(server.UI_COIL_URI) == sorted(WINDERS)
    for name in WINDERS:
        assert _tools()[name].meta == {"ui/resourceUri": server.UI_COIL_URI,
                                       "ui": {"resourceUri": server.UI_COIL_URI}}


def test_the_analyses_and_only_they_advertise_the_result_panel():
    assert _carriers(server.UI_RESULT_URI) == sorted(ANALYSES)


def test_every_winder_takes_a_core_for_the_painter():
    for name in WINDERS:
        assert "core" in _tools()[name].inputSchema["properties"], name


@pytest.mark.parametrize("uri,bundle,marker", [
    (server.UI_COIL_URI, "coil.html", "cg-drawing"),
    (server.UI_RESULT_URI, "result.html", "rp-headline"),
])
def test_the_resource_serves_its_single_file_bundle(uri, bundle, marker):
    resources = {str(r.uri): r for r in asyncio.run(server.mcp.list_resources())}
    assert resources[uri].mimeType == "text/html;profile=mcp-app"
    contents = list(asyncio.run(server.mcp.read_resource(uri)))
    assert len(contents) == 1
    html = (MCP_DIR / "dist" / bundle).read_text(encoding="utf-8")
    assert contents[0].content == html
    assert '<script type="module" src=' not in html
    assert marker in html and "--w-bg" in html


@pytest.mark.parametrize("bundle,uri,reader", [
    ("coil.html", server.UI_COIL_URI, "coil_widget"),
    ("result.html", server.UI_RESULT_URI, "result_widget"),
])
def test_startup_refuses_when_a_new_bundle_is_missing(tmp_path, monkeypatch, bundle, uri, reader):
    (tmp_path / "dist").mkdir()
    for name in server.UI_WIDGETS.values():
        if name != bundle:
            shutil.copy(MCP_DIR / "dist" / name, tmp_path / "dist" / name)
    monkeypatch.setattr(server, "__file__", str(tmp_path / "server.py"))
    with pytest.raises(RuntimeError, match=f"{uri} -> dist/{bundle}".replace(".", r"\.")):
        server.assert_widgets_resolve()
    with pytest.raises(FileNotFoundError, match=bundle):
        getattr(server, reader)()


# --- the real engine --------------------------------------------------------------------------

def _call(name: str, args: dict):
    result = asyncio.run(server.mcp.call_tool(name, args))
    assert not result.isError, result.content
    return result


@pytest.fixture(scope="module")
def designed():
    """A real inductor: the fast adviser's core, its coil designed by advise_coil."""
    fast = _call("advise_magnetics", {"inputs": INPUTS, "count": 1, "mode": "standard cores",
                                      "fast": True})
    coil = _call("advise_coil", {"mas": fast.structuredContent["designs"][0]["ref"]})
    ref = coil.structuredContent["designs"][0]["ref"]
    mas = server._resolve_mas(ref)
    bare = copy.deepcopy(mas["magnetic"]["coil"])
    for key in ("sectionsDescription", "layersDescription", "turnsDescription", "groupsDescription"):
        bare.pop(key, None)
    return {"ref": ref, "mas": mas, "magnetic": mas["magnetic"], "bare": bare,
            "op": mas["inputs"]["operatingPoints"][0]}


@pytest.fixture(scope="module")
def transformer(designed):
    """The same core with a second winding, wound by the engine: two windings, so the leakage
    matrix and the per-winding loss split have more than one entry to get wrong."""
    coil = copy.deepcopy(designed["bare"])
    secondary = copy.deepcopy(coil["functionalDescription"][0])
    secondary.update(name="secondary", isolationSide="secondary", numberTurns=3)
    coil["functionalDescription"].append(secondary)
    wound = _call("wind_coil", {"coil": coil, "core": designed["magnetic"]["core"]})
    op = copy.deepcopy(designed["op"])
    second = copy.deepcopy(op["excitationsPerWinding"][0])
    second["name"] = "secondary"
    op["excitationsPerWinding"].append(second)
    magnetic = {"core": designed["magnetic"]["core"], "coil": wound.structuredContent["document"],
                "manufacturerInfo": {"name": "test", "reference": "two-winding test transformer"}}
    return {"wound": wound, "magnetic": magnetic, "op": op}


def _js(module: str, function: str, payload: dict) -> dict:
    """Run one of the views' own readers (the JS the widget ships) over a live payload."""
    path = (MCP_DIR / "src" / module).as_uri()
    script = (f"import {{ {function} }} from {json.dumps(path)};"
              "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{"
              f"const m={function}(JSON.parse(s));"
              "if (m.drawing) m.drawing = {painter: m.drawing.painter, level: m.drawing.level, svgLength: m.drawing.svg.length};"
              "process.stdout.write(JSON.stringify(m));});")
    done = subprocess.run(["node", "--input-type=module", "-e", script], input=json.dumps(payload),
                          capture_output=True, text=True, timeout=60)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


def _stable(svg: str) -> str:
    """The drawing with each class name replaced by the style it stands for.

    The Painter names its per-call style classes at random (`.BcehdEWT`) and sorts the rules by
    name, so two drawings of the same coil differ textually while drawing the same thing. What
    must match is every element and the style each one is painted with.
    """
    style, _, body = svg.partition("</style>")
    rules = {name: " ".join(rule.split()) for name, rule in re.findall(r"\.([\w-]+)\s*\{([^}]*)\}", style)}
    assert rules and body, "the Painter's SVG has no style block or no body"
    return re.sub(r'class="([^"]*)"',
                  lambda m: 'style="' + "; ".join(rules[c] for c in m.group(1).split()) + '"', body)


def _cross_section(result) -> dict:
    sc = result.structuredContent
    assert sc["mode"] == "document" and sc["view"] == server.UI_COIL_URI
    return sc["companions"]["crossSection"]


def test_a_coil_by_handle_is_drawn_by_mkfs_painter_on_its_own_core(designed):
    result = _call("wind_coil", {"coil": designed["ref"]})
    companion = _cross_section(result)
    document = result.structuredContent["document"]
    assert companion["document"]["level"] == "turns"
    assert companion["document"]["painter"] == "MKF Painter (plot_magnetic)"
    # The SAME picture the Painter draws when asked directly: nothing here redraws it.
    direct = om.plot_magnetic({"core": designed["magnetic"]["core"], "coil": document})
    assert direct["success"]
    assert _stable(companion["document"]["svg"]) == _stable(direct["svg"])
    assert companion["document"]["svg"].count("<circle") >= len(document["turnsDescription"])
    model = _js("coilView.js", "readCoilResult", result.structuredContent)
    assert model["drawing"]["level"] == "turns"
    assert model["counts"] == {"sections": len(document["sectionsDescription"]),
                               "layers": len(document["layersDescription"]),
                               "turns": len(document["turnsDescription"])}
    assert "primary section 0" in result.content[0].text


def test_each_winding_depth_gets_the_painter_that_can_draw_it(designed):
    core = designed["magnetic"]["core"]
    sections = _call("wind_by_sections", {"coil": designed["bare"], "core": designed["ref"]})
    assert _cross_section(sections)["document"]["level"] == "sections"
    layers = _call("wind_by_layers", {"coil": sections.structuredContent["document"], "core": core})
    assert _cross_section(layers)["document"]["level"] == "layers"
    turns = _call("wind_by_turns", {"coil": layers.structuredContent["document"], "core": core})
    assert _cross_section(turns)["document"]["level"] == "turns"
    planar = _call("wind_planar", {"coil": designed["bare"], "stack_up": [0, 0], "core": core})
    assert _cross_section(planar)["document"]["svg"].lstrip().startswith("<svg")
    for result in (sections, layers, turns, planar):
        _js("coilView.js", "readCoilResult", result.structuredContent)


def test_an_inline_coil_without_a_core_says_why_there_is_no_drawing(designed):
    result = _call("wind_coil", {"coil": designed["bare"]})
    sc = result.structuredContent
    assert "companions" not in sc
    assert sc["diagnostics"] and "no core was given" in sc["diagnostics"][0]
    assert "no core was given" in result.content[0].text
    model = _js("coilView.js", "readCoilResult", sc)
    assert model["drawing"] is None and model["sections"]


def test_core_losses_carry_the_engines_figures_and_the_operating_point(designed):
    sc = _call("core_losses", {"magnetic": designed["ref"], "operating_point": designed["op"],
                               "temperature": 80}).structuredContent
    assert sc["mode"] == "quantity" and sc["model"] == "iGSE"
    assert sc["quantities"]["coreLosses"]["unit"] == "W" and sc["quantities"]["coreLosses"]["value"] > 0
    assert sc["conditions"]["temperature"]["value"] == 80.0
    assert sc["conditions"]["primary.frequency"] == {"value": 100000.0, "unit": "Hz",
                                                     "label": "primary frequency"}
    model = _js("resultView.js", "readQuantityResult", sc)
    assert [q["key"] for q in model["quantities"]][0] == "coreLosses"


def test_winding_losses_split_per_winding_and_add_up_to_the_engines_total(transformer):
    sc = _call("winding_losses", {"magnetic": transformer["magnetic"],
                                  "operating_point": transformer["op"]}).structuredContent
    q = sc["quantities"]
    for key in ("ohmicLosses", "skinEffectLosses", "proximityEffectLosses"):
        assert set(q[key]["breakdown"]) == {"primary", "secondary"}, key
        assert q[key]["unit"] == "W"
    split = q["ohmicLosses"]["value"] + q["skinEffectLosses"]["value"] + q["proximityEffectLosses"]["value"]
    assert split == pytest.approx(q["windingLosses"]["value"], rel=1e-3)
    assert q["dcResistancePerWinding"]["unit"] == "ohm" and q["dcResistancePerWinding"]["value"] is None
    assert "skin: " in sc["model"] and "proximity: " in sc["model"]
    _js("resultView.js", "readQuantityResult", sc)


def test_leakage_is_a_square_matrix_in_winding_order(transformer):
    sc = _call("leakage_inductance", {"magnetic": transformer["magnetic"]}).structuredContent
    leakage = sc["quantities"]["leakageInductance"]
    assert len(leakage["matrix"]) == 2 and all(len(r) == 2 for r in leakage["matrix"])
    assert leakage["label"].endswith("primary, secondary")
    assert leakage["matrix"][0][1] > 0
    _js("resultView.js", "readQuantityResult", sc)


def test_peak_current_and_temperature_reach_the_panel(designed):
    peak = _call("peak_winding_current", {"magnetic": designed["ref"],
                                          "operating_point": designed["op"]}).structuredContent
    assert peak["quantities"]["peakWindingCurrent"]["unit"] == "A"
    assert "primary.current.offset" in peak["conditions"]
    temperature = _call("core_temperature", {"magnetic": designed["ref"],
                                             "total_losses": 1.5}).structuredContent
    assert temperature["quantities"]["coreTemperature"]["unit"] == "degC"
    assert temperature["model"].startswith("core thermal resistance (")
    for sc in (peak, temperature):
        _js("resultView.js", "readQuantityResult", sc)


def test_an_operating_point_without_excitations_is_refused():
    with pytest.raises(ValueError, match="no excitationsPerWinding"):
        server._operating_point_conditions({"conditions": {"ambientTemperature": 25}})

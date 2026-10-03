"""The picker widget's server side (ABT #652): registration, the ui:// resource, the startup
refusal, and the four advise_* tools producing payloads the shared picker accepts.

    python3 -m pytest mcp/tests/test_server_widgets.py

Needs the built bundles (cd mcp && npm run build) and PyOpenMagnetics: the last test runs the
real advisers, because a widget that renders a hand-written fixture says nothing about whether
it renders what the engine actually returns.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

MCP_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(MCP_DIR))

import server  # noqa: E402

ADVISERS = ("advise_magnetics", "advise_cores", "advise_coil", "advise_from_catalog")
PICKER_JS = MCP_DIR.parent / "WebSharedComponents" / "mcpApps" / "candidatePicker.js"
INPUTS = json.loads((Path(__file__).parent / "fixtures" / "inductor_inputs.json").read_text())


def _tools() -> dict:
    return {t.name: t for t in asyncio.run(server.mcp.list_tools())}


def test_every_adviser_advertises_the_picker():
    tools = _tools()
    expected = {"ui/resourceUri": server.UI_PICKER_URI, "ui": {"resourceUri": server.UI_PICKER_URI}}
    for name in ADVISERS:
        assert tools[name].meta == expected, f"{name} meta is {tools[name].meta}"


def test_the_picker_meta_is_on_the_advisers_only():
    carriers = sorted(n for n, t in _tools().items()
                      if (t.meta or {}).get("ui/resourceUri") == server.UI_PICKER_URI)
    assert carriers == sorted(ADVISERS)


def test_every_advertised_ui_uri_is_a_registered_resource():
    advertised = {(t.meta or {}).get("ui/resourceUri") for t in _tools().values()} - {None}
    resources = {str(r.uri): r for r in asyncio.run(server.mcp.list_resources())}
    assert advertised <= set(resources), advertised - set(resources)
    assert resources[server.UI_PICKER_URI].mimeType == "text/html;profile=mcp-app"


def test_the_picker_resource_serves_the_built_bundle():
    contents = list(asyncio.run(server.mcp.read_resource(server.UI_PICKER_URI)))
    assert len(contents) == 1
    assert contents[0].mime_type == "text/html;profile=mcp-app"
    bundle = (MCP_DIR / "dist" / "picker.html").read_text(encoding="utf-8")
    assert contents[0].content == bundle
    # Single file: a deny-by-default CSP iframe fetches nothing, so nothing may be external.
    assert '<script type="module" src=' not in bundle
    assert "cp-root" in bundle and "updateModelContext" in bundle


def test_startup_refuses_when_the_picker_bundle_is_missing(tmp_path, monkeypatch):
    (tmp_path / "dist").mkdir()
    shutil.copy(MCP_DIR / "dist" / "curves.html", tmp_path / "dist" / "curves.html")
    monkeypatch.setattr(server, "__file__", str(tmp_path / "server.py"))
    with pytest.raises(RuntimeError, match=r"ui://openmagnetics/picker\.html -> dist/picker\.html"):
        server.assert_widgets_resolve()
    with pytest.raises(FileNotFoundError, match="picker.html"):
        server.picker_widget()


def test_startup_passes_with_both_bundles():
    server.assert_widgets_resolve()


def _picker_accepts(structured: dict) -> dict:
    """Run the SHARED picker's normaliser (the JS the widget ships) over a live payload."""
    script = (
        f"import {{ normalisePayload, buildSelection }} from {json.dumps(PICKER_JS.as_uri())};"
        "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{"
        "const m=normalisePayload(JSON.parse(s));"
        "const sel=buildSelection(m,m.rows[0]);"
        "process.stdout.write(JSON.stringify({rows:m.rows.length,selected:sel.structuredContent.selected}));});"
    )
    done = subprocess.run(["node", "--input-type=module", "-e", script], input=json.dumps(structured),
                          capture_output=True, text=True, timeout=60)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


def _call(name: str, args: dict):
    result = asyncio.run(server.mcp.call_tool(name, args))
    assert not result.isError, result.content
    sc = result.structuredContent
    assert sc["mode"] == "design" and sc["designs"], sc
    for design in sc["designs"]:
        assert design["ref"].startswith("mas://")
        assert design["properties"]["shape"]
    return sc


def test_all_four_advisers_return_what_the_picker_renders():
    fast = _call("advise_magnetics", {"inputs": INPUTS, "count": 2, "mode": "standard cores",
                                      "fast": True, "detail": True})
    assert fast["tiebreaker"] == server.FAST_ADVISER_ORDER
    cores = _call("advise_cores", {"inputs": INPUTS, "count": 2, "mode": "standard cores"})
    coil = _call("advise_coil", {"mas": fast["designs"][0]["ref"]})
    catalog = _call("advise_from_catalog", {
        "inputs": INPUTS, "count": 2,
        "catalog": [d["document"]["magnetic"] for d in fast["designs"]]})
    assert catalog["tiebreaker"] == server.MAGNETIC_ADVISER_ORDER
    for sc in (fast, cores, coil, catalog):
        sc = {k: v for k, v in sc.items()}
        sc["designs"] = [{k: v for k, v in d.items() if k != "document"} for d in sc["designs"]]
        accepted = _picker_accepts(sc)
        assert accepted["rows"] == len(sc["designs"])
        assert accepted["selected"]["ref"] == sc["designs"][0]["ref"]

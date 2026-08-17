# OpenMagnetics as an MCP App

Exposes the OpenMagnetics engine — through the `PyOpenMagnetics` pybind11 module — as
[MCP](https://modelcontextprotocol.io) tools over streamable HTTP, with the sweep charts as an
[MCP Apps](https://modelcontextprotocol.io/extensions/apps/build) (SEP-1865) UI resource.

Companion to the Kirchhoff server: Kirchhoff emits a magnetic's MAS Inputs
(`magnetic_inputs`), this advises real core+coil designs for them, and the chosen MAS goes back
to Kirchhoff's `bind_part`. The model brokers that handoff across the two connectors, replacing
the cross-origin postMessage round-trip the web apps use — which exists only because a browser
cannot run this engine.

## Run

```bash
cd mcp && npm install && npm run build      # the sweep widget
python3 mcp/server.py                       # streamable HTTP on 127.0.0.1:8402/mcp
```

**In the Moebius pool it runs on 8409**, because 8402 is Kelvin's port and Kelvin had it
first — the two could never run together until the port became configurable:

```bash
OPENMAGNETICS_MCP_PORT=8409 python3 mcp/server.py
```

The host allowlist is built from the port actually bound, so moving it does not produce the
bare `421 Invalid Host header` that hosts routinely surface as a sign-in failure.

| Variable | Meaning | Default |
|---|---|---|
| `OPENMAGNETICS_MCP_PORT` / `OPENMAGNETICS_MCP_HOST` | where the transport binds | `8402` / `127.0.0.1` |
| `OPENMAGNETICS_PUBLIC_HOST` / `OPENMAGNETICS_ALLOW_ANY_HOST` / `OPENMAGNETICS_ALLOWED_ORIGINS` | tunnel allowlisting | — |

## Tools

Twenty-nine, in five groups. Every payload is a result under the **Moebius pipeline contract**
(`contracts/pipeline_result.json`), so an orchestrator, a widget and the next server can read
this engine without learning its private shapes.

| Group | Tools | Result |
|---|---|---|
| Advisers | `advise_magnetics`, `advise_cores`, `advise_from_catalog` | design |
| | `advise_coil` | document |
| Analysis | `core_losses`, `winding_losses`, `leakage_inductance`, `peak_winding_current`, `core_temperature` | quantity |
| Sweeps | `sweep_impedance`, `sweep_core_losses`, `sweep_winding_losses`, `sweep_inductance_vs_dc_bias`, `sweep_inductance_vs_frequency`, `sweep_inductance_vs_temperature`, `sweep_q_factor`, `sweep_resistance` | curves |
| Winding & export | `wind_coil`, `wind_by_turns`, `wind_by_sections`, `wind_by_layers`, `wind_planar`, `export_spice_subcircuit`, `export_symbol` | document |
| Catalogue | `list_core_materials`, `list_core_shapes`, `list_shape_families`, `list_core_manufacturers`, `list_core_loss_models` | catalogue |

Two things the contract made explicit, and both are load-bearing:

- **Every computed number names the model that produced it.** Steinmetz, iGSE and Roshen
  disagree by more than most thermal margins, so a bare `{"coreLosses": 0.39}` is not a result
  anyone can check. The `quantity` branch carries the model, the unit beside the value, and the
  operating point it holds at.
- **Leakage inductance travels as a MATRIX**, labelled with the winding order, rather than
  flattened to a headline number that has lost which pair it belonged to.

`advise_magnetics(fast=True)` stops at the core and does NOT describe the coil. Every loss,
impedance, SPICE-export and winding tool refuses such a magnetic by name rather than returning
`Energy cannot be nan` from deep inside the engine — re-run with `fast=false` (~70 s), or pass
it through `advise_coil`.

## Checking it

```bash
python3 ~/wuerth/moebius-orchestrator/scripts/conformance.py \
    http://127.0.0.1:8409/mcp \
    --calls ~/wuerth/moebius-orchestrator/contracts/calls/openmagnetics.json
```

About 2.5 minutes, most of it the real adviser: every downstream tool needs a magnetic with a
fully described coil, and there is no honest shortcut to one.

That run is also what caught **seven call sites broken against the installed PyOpenMagnetics** —
`calculate_core_losses` takes (core, coil, inputs, models) and was being called with
(magnetic, operatingPoint, models, temperature); `calculate_temperature_from_core_thermal_resistance`
takes a core and the losses and no ambient at all; two sweeps were missing a required argument;
`wind_by_sections` takes an insulation THICKNESS where an insulation object was passed. Each
failed with `incompatible function arguments` on every call, so those tools existed and
answered nothing.

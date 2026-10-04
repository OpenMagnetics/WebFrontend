// Usage: node scripts/record-engine-manifest.mjs <MKF tree the engines were built from>
//
// Run after copying rebuilt WASM engines into src/assets/js (and MagneticBuilder). Writes
// src/assets/js/engineManifest.json: the MKF commit, its pinned MAS / PEAS commits and the
// sha256 of every engine file. The mas-regen plugin (vite.config.js) then regenerates MAS.ts
// and masSchemas.json from those MAS / PEAS commits (set OM_MAS_SCHEMAS_DIR=<MKF>/MAS/schemas,
// OM_PEAS_SCHEMAS_DIR=<MKF>/PEAS/schemas) and fails every build whose generated files or
// engine files do not match the manifest.
import { fileURLToPath } from 'node:url';
import { writeEngineManifest } from '../WebSharedComponents/build-tools/vite-plugin-mas-regen.js';

const mkfDir = process.argv[2];
if (!mkfDir) {
    console.error('usage: node scripts/record-engine-manifest.mjs <MKF dir>');
    process.exit(1);
}
const manifest = writeEngineManifest({
    manifestPath: fileURLToPath(new URL('../src/assets/js/engineManifest.json', import.meta.url)),
    mkfDir,
    engineFiles: [
        'libMKF.wasm.js',
        'libMKF.wasm.wasm',
        'libCrossReferencers.wasm.js',
        'libCrossReferencers.wasm.wasm',
        'libInsulationCoordinator.wasm.js',
        'libInsulationCoordinator.wasm.wasm',
        '../../../MagneticBuilder/src/assets/js/libMKF.wasm.js',
        '../../../MagneticBuilder/src/assets/js/libMKF.wasm.wasm',
    ],
});
console.log(JSON.stringify(manifest, null, 2));

/**
 * ABT #1417: the adviser entry points throw on bad inputs instead of
 * rewriting them (100 kHz frequency, 'standard cores' mode, cut harmonics).
 * Pure checks on the shared validator; the browser flows that feed it real
 * wizard inputs are covered by adviser-flows and the wizard F1 batteries.
 */
import { test, expect } from '@playwright/test';
import { requireAdviserExcitations, requireCoreAdviseMode } from '../WebSharedComponents/assets/js/adviserInputs.js';

function inputsWith(excitation) {
  return { operatingPoints: [{ name: 'Full load', excitationsPerWinding: [excitation] }] };
}

const GOOD = {
  frequency: 100000,
  current: {
    harmonics: { amplitudes: [1, 0.5, 0.1], frequencies: [0, 100000, 200000] },
    waveform: { time: [0, 5e-6, 1e-5], data: [0, 1, 0] },
  },
};

test('ADVIN-1: a well-formed excitation passes untouched', () => {
  const inputs = inputsWith(structuredClone(GOOD));
  const before = JSON.stringify(inputs);
  requireAdviserExcitations(inputs);
  expect(JSON.stringify(inputs)).toBe(before);
});

test('ADVIN-2: a bad frequency throws naming the operating point and winding', () => {
  for (const frequency of [0, -1, null, undefined, NaN]) {
    expect(() => requireAdviserExcitations(inputsWith({ ...structuredClone(GOOD), frequency })))
      .toThrow(/Operating point 1 \(Full load\), winding 1: frequency is/);
  }
});

test('ADVIN-3: null or misplaced-0 Hz harmonics throw instead of being cut', () => {
  const nullAmplitude = structuredClone(GOOD);
  nullAmplitude.current.harmonics.amplitudes[2] = null;
  expect(() => requireAdviserExcitations(inputsWith(nullAmplitude))).toThrow(/harmonic amplitudes has no number at index 2/);

  const zeroHarmonic = structuredClone(GOOD);
  zeroHarmonic.current.harmonics.frequencies[2] = 0;
  expect(() => requireAdviserExcitations(inputsWith(zeroHarmonic))).toThrow(/harmonic 2 is at 0 Hz/);

  const mismatched = structuredClone(GOOD);
  mismatched.current.harmonics.frequencies.pop();
  expect(() => requireAdviserExcitations(inputsWith(mismatched))).toThrow(/3 amplitudes but 2 frequencies/);
});

test('ADVIN-4: a null-padded waveform throws instead of being truncated', () => {
  const padded = structuredClone(GOOD);
  padded.current.waveform.time.push(null);
  padded.current.waveform.data.push(null);
  expect(() => requireAdviserExcitations(inputsWith(padded))).toThrow(/waveform time has no number at index 3/);
});

test('ADVIN-5: an unknown or object core-advise mode throws', () => {
  expect(requireCoreAdviseMode('available cores')).toBe('available cores');
  for (const mode of [{}, '[object Object]', 'all cores', null]) {
    expect(() => requireCoreAdviseMode(mode)).toThrow(/Core adviser mode must be one of/);
  }
});

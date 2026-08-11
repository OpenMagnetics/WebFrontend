/**
 * 2D real winding: the CONNECTIONS on screen.
 *
 * plot_turns draws core + bobbin + turns and stops there — it never draws how the turns are
 * connected. The inter-layer links, the dragbacks and the terminal leads only come out of
 * MKF's paint_magnetic, which libMKF did not expose at all, so none of it could reach the
 * browser. plot_magnetic(magnetic, projection) is that entry point: XY is the usual front
 * view WITH the connections drawn on it, YZ is the connection face, where the leads are seen
 * end-on (the projection the reference drawing shows).
 *
 * These run against the SERVED libMKF, so they fail if the engine is stale rather than
 * quietly testing an old one.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { BASE_URL, pause } from './utils.js';

const MAGNETIC = JSON.parse(
    readFileSync(new URL('./fixtures/etd49_wound_10uH_5T.json', import.meta.url), 'utf-8'),
).magnetic;

async function plots(page, magnetic) {
    return page.evaluate(async (m) => {
        const { waitForMkf } = await import('/WebSharedComponents/assets/js/mkfRuntime.js');
        const mkf = await waitForMkf();
        const json = JSON.stringify(m);

        // Real winding is a LAYOUT flag in MKF (it reserves the lead and dragback corridors
        // when the coil is wound), so it has to be set before painting or the picture would
        // be of a different coil from the one the 3D builder routes.
        const settings = JSON.parse(await mkf.get_settings());
        settings.coilUseRealWindingGeometry = true;
        await mkf.set_settings(JSON.stringify(settings));

        const grab = async (label, call) => {
            const svg = await call();
            return [label, { length: svg.length, isSvg: svg.trimStart().startsWith('<svg'), text: svg }];
        };
        return Object.fromEntries(await Promise.all([
            grab('turns', () => mkf.plot_turns(json)),
            grab('xy', () => mkf.plot_magnetic(json, 'XY')),
            grab('yz', () => mkf.plot_magnetic(json, 'YZ')),
            grab('bad', () => mkf.plot_magnetic(json, 'ZZ')),
        ]));
    }, magnetic);
}

test.describe('2D real winding', () => {
    test.describe.configure({ timeout: 180000 });

    test('2DRW-1: plot_magnetic draws the connections plot_turns leaves out, in both projections', async ({ page }) => {
        await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(
            () => !window.location.pathname.includes('engine_loader'), null, { timeout: 60000 });
        await pause(page, 800, 'mechanical: settle');

        const out = await plots(page, MAGNETIC);

        expect(out.turns.isSvg, 'plot_turns did not return an SVG').toBe(true);
        expect(out.xy.isSvg, 'plot_magnetic XY did not return an SVG').toBe(true);
        expect(out.yz.isSvg, 'plot_magnetic YZ did not return an SVG').toBe(true);

        // The XY projection is the turns view PLUS the connections, so it must carry strictly
        // more drawing than plot_turns. Equal output would mean the connections are missing —
        // which is the whole defect this exists to catch, and it looks fine to the eye.
        expect(out.xy.length, 'XY has no more drawing than plot_turns — connections missing')
            .toBeGreaterThan(out.turns.length);

        // The connection face is a different view of the same coil, not a re-render of the front.
        expect(out.yz.length).not.toBe(out.xy.length);
        expect(out.yz.length).toBeGreaterThan(1000);

        // An unknown projection is a caller bug and says so; silently returning XY would
        // hand back a view that is not the one asked for.
        expect(out.bad.isSvg, 'an unknown projection silently produced a drawing').toBe(false);
        expect(out.bad.text).toContain('unknown projection');
        expect(out.bad.text).toContain('XY');
        expect(out.bad.text).toContain('YZ');
    });
});

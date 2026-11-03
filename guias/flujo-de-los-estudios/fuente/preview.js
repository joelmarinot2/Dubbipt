const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const tl = JSON.parse(fs.readFileSync(path.join(process.env.VIDEO_SALIDA || path.join(__dirname, 'salida'), 'timeline.json'), 'utf8'));
  const outDir = path.join(process.env.VIDEO_SALIDA || path.join(__dirname, 'salida'), 'preview'); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'video.html'));
  await page.evaluate(t => window.setTimeline(t), tl);
  await page.evaluate(() => document.fonts.ready);
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  for (let i = 0; i < tl.scenes.length; i++) {
    const sc = tl.scenes[i];
    if (only && !only.includes(sc.id)) continue;
    const times = { end: sc.end - 400 };
    if (sc.beats.length > 2) times.mid = sc.beats[Math.floor(sc.beats.length / 2)].start + 1500;
    for (const [k, t] of Object.entries(times)) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: path.join(outDir, `${String(i).padStart(2, '0')}-${sc.id}-${k}.png`), type: 'png' });
    }
  }
  await browser.close();
  console.log('ok', fs.readdirSync(outDir).length, 'previews');
})().catch(e => { console.error(e); process.exit(1); });

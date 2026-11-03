const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { once } = require('events');
const fs = require('fs'); const path = require('path');

const FPS = 30;
const OUTDIR = process.env.VIDEO_SALIDA || path.join(__dirname, 'salida');
const tl = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'timeline.json'), 'utf8'));
const limitSec = process.argv[2] ? parseFloat(process.argv[2]) : null;       // render only the first N seconds (smoke test)
const outName = process.argv[3] || 'Flujo_de_los_estudios.mp4';
const totalMs = limitSec ? Math.min(tl.total, limitSec * 1000) : tl.total;
const nFrames = Math.ceil(totalMs / 1000 * FPS);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'video.html'));
  await page.evaluate(t => window.setTimeline(t), tl);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);

  const out = path.join(OUTDIR, outName);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-stats',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(FPS), '-i', '-',
    '-i', path.join(OUTDIR, 'narracion.wav'),
    '-t', String(totalMs / 1000),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  let last = null, prevDyn = true, prevKey = '', shots = 0;
  const t0 = Date.now();
  for (let f = 0; f < nFrames; f++) {
    const t = f * 1000 / FPS;
    const { dyn, key } = await page.evaluate(t => window.render(t), t);
    if (!last || dyn || prevDyn || key !== prevKey) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      last = Buffer.from(data, 'base64'); shots++;
    }
    prevDyn = dyn; prevKey = key;
    if (!ff.stdin.write(last)) await once(ff.stdin, 'drain');
    if (f % 300 === 0) process.stderr.write(`\n[render] frame ${f}/${nFrames} (${(t / 1000).toFixed(1)}s) shots=${shots} elapsed=${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  await browser.close();
  console.log(`\nDONE ${out} frames=${nFrames} screenshots=${shots} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file:///tmp/guide/guide.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(800);

  // Full PDF export
  await page.pdf({
    path: '/tmp/guide/Guide-Onae.pdf',
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  // Screenshot each .page individually for preview
  const pages = await page.$$('.page');
  console.log('pages found:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    await pages[i].screenshot({ path: `/tmp/guide/page-${n}.png` });
  }

  await browser.close();
  console.log('done');
})();

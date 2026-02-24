/* global document */
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const inputFile  = path.resolve('C:/Users/VijayBandaru/Claude_Cars_Flow_Architecture.html');
  const outputFile = path.resolve('C:/Users/VijayBandaru/Claude_Cars_Flow_Architecture.pdf');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto('file:///' + inputFile.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  // Get full page height so nothing is clipped
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1100, height: bodyHeight });

  console.log(`Page height: ${bodyHeight}px — generating PDF...`);

  await page.pdf({
    path: outputFile,
    width: '1100px',
    height: (bodyHeight + 60) + 'px',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  await browser.close();
  console.log('PDF saved to:', outputFile);
})();

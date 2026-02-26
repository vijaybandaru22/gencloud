const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  const htmlPath = 'file:///' + path.resolve('C:/Users/VijayBandaru/ORS_Flow_Diagram.html').replace(/\\/g, '/');
  console.log('Loading:', htmlPath);
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Set viewport wide enough for the 1100px layout
  await page.setViewport({ width: 1180, height: 900 });

  const pdfPath = 'C:/Users/VijayBandaru/ORS_Flow_Diagram.pdf';
  await page.pdf({
    path: pdfPath,
    format: 'A3',
    landscape: false,
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
  });

  await browser.close();
  console.log('PDF saved:', pdfPath);
})();

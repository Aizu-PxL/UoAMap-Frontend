import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Using fs.promises for async file operations
const fsPromises = fs.promises;

async function main() {
  const rootDir = process.cwd();
  
  // Paths
  const mappingsPath = path.join(rootDir, 'uoamap-qr-mappings.json');
  const pdfTemplatePath = path.join(rootDir, 'Poster', 'Sample', 'CampusQR.pdf');
  const fontPath = path.join(rootDir, 'Poster', 'Sample', 'Noto_Sans_JP', 'static', 'NotoSansJP-Bold.ttf');
  const outDir = path.join(rootDir, 'Poster');

  // Load mappings
  console.log('Loading mappings...');
  const mappingsRaw = await fsPromises.readFile(mappingsPath, 'utf8');
  const mappings = JSON.parse(mappingsRaw);

  // Load PDF Template
  console.log('Loading PDF template...');
  const pdfBytes = await fsPromises.readFile(pdfTemplatePath);
  
  // Load Font
  console.log('Loading font...');
  const fontBytes = await fsPromises.readFile(fontPath);

  // Process just the first one for testing, or all if we remove the slice
  const testMode = process.argv.includes('--test');
  const targets = testMode ? mappings.slice(0, 1) : mappings;
  
  console.log(`Generating ${targets.length} PDF(s)...`);

  // Prepare a document to merge all pages
  const mergedPdf = await PDFDocument.create();

  for (const item of targets) {
    const { qrId, installationNote } = item;
    const url = `https://aizu-pxl.github.io/UoAMap-Frontend/q/${qrId}`;
    console.log(`Processing ${qrId}... (${url})`);

    // 1. Generate QR Code image (PNG data URI)
    const qrDataUri = await QRCode.toDataURL(url, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    // Convert Data URI to Buffer
    const qrImageBytes = Buffer.from(qrDataUri.split(',')[1], 'base64');

    // 2. Load the template for this iteration
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    // Embed QR image
    const qrImage = await pdfDoc.embedPng(qrImageBytes);

    // 3. Draw on the first page
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();
    console.log(`Page size: ${width}x${height}`);
    
    // We need to fine-tune these coordinates
    // Assuming A4 (595.28 x 841.89)
    const qrSize = 275; // Shrunk by ~80%
    const qrX = (width - qrSize) / 2;
    // Set QR code position to middle
    const qrY = 183;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // 4. Draw a white box over the existing text at the bottom
    // We'll try to find the exact coordinates.
    const textBgWidth = 290; // Shrink width more so it fits inside rounded corners
    const textBgHeight = 45;
    const textBgX = (width - textBgWidth) / 2;
    const textBgY = 96; // Move it slightly up further
    
    page.drawRectangle({
      x: textBgX,
      y: textBgY,
      width: textBgWidth,
      height: textBgHeight,
      color: rgb(245/255, 245/255, 246/255), // #F5F5F6
    });

    // 5. Draw the new text
    const prefix = `ID: ${qrId} `;
    const defaultFontSize = 24;
    const prefixWidth = helveticaFont.widthOfTextAtSize(prefix, defaultFontSize);
    
    const maxTextWidth = 280;
    let noteFontSize = defaultFontSize;
    let noteWidth = customFont.widthOfTextAtSize(installationNote, noteFontSize);
    
    // Scale down installationNote if it's too long
    while (prefixWidth + noteWidth > maxTextWidth && noteFontSize > 10) {
      noteFontSize -= 1;
      noteWidth = customFont.widthOfTextAtSize(installationNote, noteFontSize);
    }
    
    const totalWidth = prefixWidth + noteWidth;
    const startX = (width - totalWidth) / 2;

    // Draw prefix with Helvetica Bold to avoid kerning issues
    page.drawText(prefix, {
      x: startX,
      y: textBgY + 12,
      size: defaultFontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    // Draw installationNote with custom Japanese font
    // If font size was scaled down, adjust Y to center it vertically
    // Dividing by 2 shifted it too high (superscript look), dividing by 4 is a better middle ground
    const yOffset = (defaultFontSize - noteFontSize) / 4;
    page.drawText(installationNote, {
      x: startX + prefixWidth,
      y: textBgY + 12 + yOffset,
      size: noteFontSize,
      font: customFont,
      color: rgb(0, 0, 0),
    });

    // Save
    const outPdfBytes = await pdfDoc.save();
    const outPath = path.join(outDir, testMode ? `${qrId}_test3.pdf` : `${qrId}.pdf`);
    await fsPromises.writeFile(outPath, outPdfBytes);
    
    console.log(`Saved ${outPath}`);
    // Copy page to merged PDF
    const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [0]);
    mergedPdf.addPage(copiedPage);
  }
  
  // Save merged PDF
  console.log('Saving merged PDF...');
  const mergedPdfBytes = await mergedPdf.save();
  const mergedOutPath = path.join(outDir, testMode ? 'All_Posters_test.pdf' : 'All_Posters.pdf');
  await fsPromises.writeFile(mergedOutPath, mergedPdfBytes);
  console.log(`Saved merged PDF to ${mergedOutPath}`);

  console.log('Done!');
}

main().catch(console.error);

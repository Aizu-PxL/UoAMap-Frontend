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
  const pdfTemplatePath = path.join(rootDir, 'Poster', 'Sample', 'CampusQR2.pdf');
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
  const targets = testMode ? mappings.slice(0, 1) : [...mappings];
  
  if (!testMode) {
    // Determine the maximum ID currently in the mappings
    const existingIds = new Set(mappings.map((m: any) => m.qrId));
    let maxIdNum = 0;
    for (const id of existingIds) {
      if (id.startsWith('Q')) {
        const num = parseInt(id.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      }
    }

    // Add extra blank posters for any missing numbers, plus 3 spares at the end
    const targetMax = maxIdNum + 3;
    for (let i = 1; i <= targetMax; i++) {
      const qrId = `Q${String(i).padStart(3, '0')}`;
      if (!existingIds.has(qrId)) {
        targets.push({
          qrId,
          installationNote: ''
        });
      }
    }
    
    // Sort targets by qrId so that missing ones (like Q018) are in the correct order
    targets.sort((a, b) => a.qrId.localeCompare(b.qrId));
  }
  
  console.log(`Generating ${targets.length} PDF(s)...`);

  // Prepare a document to merge all pages
  const mergedPdf = await PDFDocument.create();

  for (const item of targets) {
    const { qrId, installationNote } = item;
    const url = `https://uoa-ocmap.com/UoAMap-Frontend/q/${qrId}`;
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
    // Set QR code position (moved down for CampusQR2.pdf)
    const qrY = 171;

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
    const textBgY = 88; // Move it down to match the new template
    
    page.drawRectangle({
      x: textBgX,
      y: textBgY,
      width: textBgWidth,
      height: textBgHeight,
      color: rgb(245/255, 245/255, 246/255), // #F5F5F6
    });

    // 5. Draw the new text
    const defaultFontSize = 24;
    
    const maxTextWidth = 280;
    let noteFontSize = defaultFontSize;
    let noteWidth = customFont.widthOfTextAtSize(installationNote, noteFontSize);
    
    // Scale down installationNote if it's too long
    while (noteWidth > maxTextWidth && noteFontSize > 10) {
      noteFontSize -= 1;
      noteWidth = customFont.widthOfTextAtSize(installationNote, noteFontSize);
    }
    
    const startX = (width - noteWidth) / 2;

    // Draw installationNote with custom Japanese font
    // If font size was scaled down, adjust Y to center it vertically
    // Dividing by 2 shifted it too high (superscript look), dividing by 4 is a better middle ground
    const yOffset = (defaultFontSize - noteFontSize) / 4;
    page.drawText(installationNote, {
      x: startX,
      y: textBgY + 9 + yOffset, // Decreased +12 to +9 to move text down slightly
      size: noteFontSize,
      font: customFont,
      color: rgb(0, 0, 0),
    });

    // 6. Draw small ID at bottom left
    page.drawText(qrId, {
      x: 30,
      y: 18, // Decreased to align with the bottom of the logo on the right
      size: 14,
      font: helveticaFont,
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

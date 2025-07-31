import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';

// Recursively scan a directory for PDFs and .tags files
export function scanDirectory(dir: string, pdfs: string[] = [], tags: string[] = []): { pdfs: string[], tags: string[] } {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, pdfs, tags);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      } else if (entry.name.toLowerCase().endsWith('.tags')) {
        tags.push(fullPath);
      }
    }
  }
  return { pdfs, tags };
}

// Compute SHA256 hash of a file
export function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return 'sha256:' + hashSum.digest('hex');
}

// Read tags from a .tags file
export function readTagsFile(tagsFilePath: string): string[] {
  const content = fs.readFileSync(tagsFilePath, 'utf-8');
  return content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

// Extract metadata and text from a PDF file using pdf-parse
export async function extractPdfMetadata(pdfPath: string) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return {
    title: data.info.Title || '',
    author: data.info.Author || '',
    subject: data.info.Subject || '',
    keywords: data.info.Keywords || '',
    pages: data.numpages,
    text: data.text
  };
}

import { extractManualMetadata } from './llmExtract';

// Example usage
if (require.main === module) {
  (async () => {
    const rootDir = process.argv[2] || path.resolve(__dirname, '../../../pdf');
    const { pdfs, tags } = scanDirectory(rootDir);
    console.log('PDFs found:', pdfs);
    console.log('.tags files found:', tags);
    if (pdfs.length > 0) {
      const meta = await extractPdfMetadata(pdfs[0]);
      console.log('First PDF metadata:', meta);
      const llmMeta = await extractManualMetadata(meta.text);
      console.log('LLM-extracted fields:', llmMeta);
    }
    if (tags.length > 0) {
      console.log('First .tags file contents:', readTagsFile(tags[0]));
    }
  })();
}

import fs from 'fs';
import path from 'path';
import { scanDirectory, computeFileHash, readTagsFile, extractPdfMetadata } from './index';
import { extractManualMetadata } from './llmExtract';

interface PdfIndexEntry {
  path: string;
  filename: string;
  hash: string;
  tags: string[];
  pages: number;
  lastModified: string;
}

export async function buildIndex(rootDir: string, outputPath: string) {
  const { pdfs, tags } = scanDirectory(rootDir);
  const tagMap: Record<string, string[]> = {};
  for (const tagFile of tags) {
    const base = tagFile.replace(/\.tags$/i, '.pdf');
    tagMap[path.resolve(base)] = readTagsFile(tagFile);
  }

  // Load LLM cache
  const cachePath = path.resolve(rootDir, 'llm-cache.json');
  let llmCache: Record<string, any> = {};
  if (fs.existsSync(cachePath)) {
    try {
      llmCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch (e) {
      console.warn('[CACHE] Failed to parse llm-cache.json, starting with empty cache.');
      llmCache = {};
    }
  }

  const pdfEntries: PdfIndexEntry[] = [];
  let cacheUpdated = false;
  for (const pdfPath of pdfs) {
    const stat = fs.statSync(pdfPath);
    const hash = computeFileHash(pdfPath);
    const relPath = path.relative(rootDir, pdfPath);
    const meta = await extractPdfMetadata(pdfPath); // always extract for title/pages
    let llmMeta;
    if (llmCache[relPath] && llmCache[relPath].hash === hash) {
      llmMeta = {
        brand: llmCache[relPath].brand,
        model: llmCache[relPath].model,
        device: llmCache[relPath].device,
        manualType: llmCache[relPath].manualType
      };
      console.log(`[CACHE] Using cached LLM metadata for ${relPath}`);
    } else {
      llmMeta = await extractManualMetadata(meta.text);
      llmCache[relPath] = { hash, ...llmMeta };
      cacheUpdated = true;
      console.log(`[CACHE] Updated LLM metadata for ${relPath}`);
    }
    console.log(`[INDEX] Processed: ${pdfPath}`);
    console.log(`[INDEX] Extracted: brand='${llmMeta.brand}', model='${llmMeta.model}', device='${llmMeta.device}', manualType='${llmMeta.manualType}'`);
    const extraTags = tagMap[path.resolve(pdfPath)] || [];
    
    // Create auto-discovered tags from LLM metadata only
    const autoTags = [
      llmMeta.brand ? `brand=${llmMeta.brand}` : '',
      llmMeta.model ? `model=${llmMeta.model}` : '',
      llmMeta.device ? `device=${llmMeta.device}` : '',
      llmMeta.manualType ? `manualType=${llmMeta.manualType}` : ''
    ].filter(Boolean);
    
    // Merge tags with extraTags overriding auto-discovered tags
    const tagMap2: Record<string, string> = {};
    
    // First add auto-discovered tags
    autoTags.forEach(tag => {
      const [key, value] = tag.split('=', 2);
      tagMap2[key] = value;
    });
    
    // Then add extraTags, which will overwrite any matching keys
    extraTags.forEach(tag => {
      if (tag.includes('=')) {
        const [key, value] = tag.split('=', 2);
        tagMap2[key] = value;
      } else {
        // Non-key=value tags are added as-is
        tagMap2[tag] = tag;
      }
    });
    
    // Convert back to array format, handling non-key=value tags
    const mergedTags = Object.entries(tagMap2).map(([key, value]) => 
      key === value ? key : `${key}=${value}`
    );
    
    pdfEntries.push({
      path: relPath,
      filename: path.basename(pdfPath),
      hash,
      tags: mergedTags,
      pages: meta.pages,
      lastModified: stat.mtime.toISOString()
    });
  }
  const index = {
    generatedAt: new Date().toISOString(),
    pdfs: pdfEntries
  };
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf-8');
  if (cacheUpdated) {
    fs.writeFileSync(cachePath, JSON.stringify(llmCache, null, 2), 'utf-8');
    console.log(`[CACHE] llm-cache.json updated.`);
  }
}

// CLI usage
if (require.main === module) {
  const rootDir = process.argv[2] || path.resolve(__dirname, '../../../pdf');
  const outputPath = process.argv[3] || path.resolve(rootDir, 'index.json');
  buildIndex(rootDir, outputPath).then(() => {
    console.log('Index built at', outputPath);
  });
}

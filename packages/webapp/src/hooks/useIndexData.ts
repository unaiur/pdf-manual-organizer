import { useState, useEffect, useMemo } from 'react';
import type { IndexData, GroupedTags, TagSection, PdfIndexEntry } from '../types';

// Helper function to extract a value from tags array
function getTagValue(tags: string[], key: string): string | undefined {
  const tag = tags.find(t => t.startsWith(`${key}=`));
  return tag ? tag.split('=', 2)[1] : undefined;
}

// Helper function to parse page ranges from hide-page-range tag
// Format: "1-18,37-" means hide pages 1-18 and 37 to end
export function parseHiddenPageRanges(tags: string[], totalPages: number): number[] {
  const hideRangeTag = tags.find(t => t.startsWith('!hide-page-range='));
  if (!hideRangeTag) return [];
  
  const rangeString = hideRangeTag.split('=', 2)[1];
  const hiddenPages = new Set<number>();
  
  rangeString.split(',').forEach(range => {
    range = range.trim();
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(s => s.trim());
      const startPage = parseInt(start, 10);
      const endPage = end === '' ? totalPages : parseInt(end, 10);
      
      if (!isNaN(startPage)) {
        const actualEnd = isNaN(endPage) ? totalPages : Math.min(endPage, totalPages);
        for (let i = Math.max(1, startPage); i <= actualEnd; i++) {
          hiddenPages.add(i);
        }
      }
    } else {
      const page = parseInt(range, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        hiddenPages.add(page);
      }
    }
  });
  
  return Array.from(hiddenPages).sort((a, b) => a - b);
}

// Helper function to get visible pages (excluding hidden ones)
export function getVisiblePages(totalPages: number, hiddenPages: number[]): number[] {
  const hiddenSet = new Set(hiddenPages);
  const visiblePages: number[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    if (!hiddenSet.has(i)) {
      visiblePages.push(i);
    }
  }
  
  return visiblePages;
}

// Helper function to filter out option tags (starting with !)
function filterDisplayTags(tags: string[]): string[] {
  return tags.filter(tag => !tag.startsWith('!'));
}

// Helper function to get all tag values for display and filtering
export function getTagValues(pdf: PdfIndexEntry) {
  const displayTags = filterDisplayTags(pdf.tags);
  return {
    brand: getTagValue(displayTags, 'brand') || '',
    model: getTagValue(displayTags, 'model') || '',
    device: getTagValue(displayTags, 'device') || '',
    manualType: getTagValue(displayTags, 'manualType') || ''
  };
}

export function useIndexData() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/pdf/index.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load index.json');
        return res.json();
      })
      .then((data) => {
        setIndex(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { index, loading, error };
}

export function useGroupedTags(index: IndexData | null): GroupedTags | null {
  return useMemo(() => {
    if (!index) return null;
    
    const brand = new Set<string>();
    const model = new Set<string>();
    const device = new Set<string>();
    const manualType = new Set<string>();
    const other: Record<string, Set<string>> = {};

    index.pdfs.forEach((pdf) => {
      const values = getTagValues(pdf);
      
      if (values.brand) brand.add(values.brand);
      if (values.model) model.add(values.model);
      if (values.device) device.add(values.device);
      if (values.manualType) manualType.add(values.manualType);
      
      // Filter out option tags (starting with !) from UI display
      const displayTags = filterDisplayTags(pdf.tags);
      
      displayTags.forEach((t) => {
        const match = t.match(/^([a-zA-Z0-9_-]+)=(.*)$/);
        if (match) {
          const key = match[1];
          const value = match[2];
          if (["brand","model","device","manualType"].includes(key)) {
            return;
          }
          if (!other[key]) other[key] = new Set<string>();
          other[key].add(value);
        } else {
          if (!other["other"]) other["other"] = new Set<string>();
          other["other"].add(t);
        }
      });
    });
    
    return { brand, model, device, manualType, other };
  }, [index]);
}

export function useTagSections(groupedTags: GroupedTags | null): TagSection[] {
  return useMemo(() => {
    if (!groupedTags) return [];
    
    const sections: TagSection[] = [];
    const mainTypes = ["brand", "model", "device", "manualType"];
    
    mainTypes.forEach((type) => {
      const set = groupedTags[type as keyof typeof groupedTags] as Set<string>;
      if (set && set.size > 0) {
        sections.push({ key: type, tags: Array.from(set).sort() });
      }
    });
    
    if (groupedTags.other) {
      const mainTypeValues = new Set<string>();
      [groupedTags.brand, groupedTags.model, groupedTags.device, groupedTags.manualType].forEach((set) => {
        set?.forEach((v) => mainTypeValues.add(v));
      });
      
      Object.keys(groupedTags.other)
        .sort()
        .forEach((key) => {
          if (mainTypes.includes(key)) return;
          if (groupedTags.other[key] && groupedTags.other[key].size > 0) {
            let filtered: string[];
            if (key === "other") {
              filtered = Array.from(groupedTags.other[key]).filter((tag) => {
                const eqIdx = tag.indexOf('=');
                if (eqIdx !== -1) {
                  const tagKey = tag.slice(0, eqIdx);
                  if (mainTypes.includes(tagKey)) return false;
                  return true;
                }
                return true;
              });
            } else {
              filtered = Array.from(groupedTags.other[key]);
            }
            
            if (filtered.length > 0) {
              sections.push({ key, tags: filtered.sort() });
            }
          }
        });
    }
    
    return sections;
  }, [groupedTags]);
}

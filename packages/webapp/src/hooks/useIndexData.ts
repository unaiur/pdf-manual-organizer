import { useState, useEffect, useMemo } from 'react';
import type { IndexData, GroupedTags, TagSection } from '../types';

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
      if (pdf.brand) brand.add(pdf.brand);
      if (pdf.model) model.add(pdf.model);
      if (pdf.device) device.add(pdf.device);
      if (pdf.manualType) manualType.add(pdf.manualType);
      
      [...pdf.tags, ...pdf.extraTags].forEach((t) => {
        const match = t.match(/^([a-zA-Z0-9_-]+):(.*)$/);
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
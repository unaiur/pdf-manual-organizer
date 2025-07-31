export interface PdfIndexEntry {
  path: string;
  filename: string;
  hash: string;
  title: string;
  brand: string;
  model: string;
  device: string;
  manualType: string;
  tags: string[];
  extraTags: string[];
  pages: number;
  lastModified: string;
}

export interface IndexData {
  generatedAt: string;
  pdfs: PdfIndexEntry[];
}

export interface GroupedTags {
  brand: Set<string>;
  model: Set<string>;
  device: Set<string>;
  manualType: Set<string>;
  other: Record<string, Set<string>>;
}

export interface TagSection {
  key: string;
  tags: string[];
}
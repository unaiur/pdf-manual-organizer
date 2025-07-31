import { useState, useMemo, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FixedSizeList as List } from 'react-window';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { PdfIndexEntry } from '../types';
import { parseHiddenPageRanges, getVisiblePages } from '../hooks/useIndexData';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  pdf: PdfIndexEntry;
  scale: number;
  initialPage?: number;
}

interface PageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    visiblePages: number[];
    pageScale: number;
    isMobile: boolean;
  };
}

function PageItem({ index, style, data }: PageItemProps) {
  const { visiblePages, pageScale, isMobile } = data;
  const pageNumber = visiblePages[index]; // Get the actual page number from visible pages array

  return (
    <div style={style}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        p: 1,
        height: '100%'
      }}>
        <Box sx={{ boxShadow: 2, bgcolor: 'white' }}>
          <Page
            pageNumber={pageNumber}
            scale={pageScale}
            renderAnnotationLayer={true}
            renderTextLayer={!isMobile}
            loading={
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 800 * pageScale,
                width: 600 * pageScale
              }}>
                <CircularProgress />
              </Box>
            }
            error=""
          />
        </Box>
      </Box>
    </div>
  );
}

export default function PdfViewer({ pdf, scale, initialPage }: PdfViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [numPages, setNumPages] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageHeight, setPageHeight] = useState(800);
  const [pageWidth, setPageWidth] = useState(600);
  const [containerHeight, setContainerHeight] = useState(600);
  
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible pages (excluding hidden ranges)
  const visiblePages = useMemo(() => {
    if (!numPages) return [];
    const hiddenPages = parseHiddenPageRanges(pdf.tags, numPages);
    return getVisiblePages(numPages, hiddenPages);
  }, [pdf.tags, numPages]);

  const options = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error): void {
    setError(error.message);
    setLoading(false);
  }

  // Handle window resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(window.innerHeight - rect.top - 16); // 16px for padding
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, []);

  // Handle initial page scrolling
  useEffect(() => {
    if (initialPage && initialPage > 0 && visiblePages.length > 0 && listRef.current) {
      // Find the index of the initial page in the visible pages array
      const visibleIndex = visiblePages.findIndex(pageNum => pageNum === initialPage);
      if (visibleIndex !== -1) {
        // Small delay to ensure the list is rendered
        setTimeout(() => {
          listRef.current?.scrollToItem(visibleIndex, 'start');
        }, 100);
      }
    }
  }, [initialPage, visiblePages]);

  // Update page dimensions when scale changes
  useEffect(() => {
    const baseHeight = 800; // Approximate PDF page height
    const baseWidth = 600;  // Approximate PDF page width
    const pageScale = isMobile ? Math.min(scale, 1.5) : scale;
    
    setPageHeight(baseHeight * pageScale + 32); // Add padding
    setPageWidth(baseWidth * pageScale);
  }, [scale, isMobile]);

  const pageScale = isMobile ? Math.min(scale, 1.5) : scale;

  const itemData = useMemo(() => ({
    visiblePages,
    pageScale,
    isMobile
  }), [visiblePages, pageScale, isMobile]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load PDF: {error}
        </Alert>
      )}

      <Document
        file={`/pdf/${pdf.path}`}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        options={options}
        loading=""
        error=""
      >
        {visiblePages.length > 0 && !loading && (
          <Box 
            ref={containerRef}
            sx={{ 
              flex: 1, 
              bgcolor: '#f5f5f5',
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <List
              ref={listRef}
              height={containerHeight}
              width={Math.min(pageWidth + 64, window.innerWidth)} // Add padding and constrain to window
              itemCount={visiblePages.length} // Use visible pages count instead of total pages
              itemSize={pageHeight}
              itemData={itemData}
              overscanCount={1} // Render 1 page above/below viewport for smooth scrolling while keeping memory usage low
            >
              {PageItem}
            </List>
          </Box>
        )}
      </Document>
    </Box>
  );
}
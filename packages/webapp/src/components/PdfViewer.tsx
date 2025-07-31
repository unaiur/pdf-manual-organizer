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
  onFitScalesChange?: (fitWidthScale: number, fitHeightScale: number) => void;
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
  const pageNumber = visiblePages[index];

  return (
    <div style={{...style, overflow: 'visible'}}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        p: isMobile ? 0.25 : 0.5,
        height: '100%',
        minWidth: 'max-content'
      }}>
        <Box sx={{ boxShadow: 0, bgcolor: 'white' }}>
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
                minHeight: 200,
                minWidth: 200
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

export default function PdfViewer({ pdf, scale, initialPage, onFitScalesChange }: PdfViewerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [numPages, setNumPages] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);
  const [pdfViewport, setPdfViewport] = useState<{width: number, height: number} | null>(null);
  
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

  // Get actual PDF dimensions from first page
  useEffect(() => {
    if (!numPages || pdfViewport) return;
    console.log('📄 Getting PDF dimensions for:', pdf.filename);

    const getPdfDimensions = async () => {
      try {
        const pdfDoc = await pdfjs.getDocument(`/pdf/${pdf.path}`).promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        
        console.log('📏 PDF dimensions:', { width: viewport.width, height: viewport.height });
        setPdfViewport({
          width: viewport.width,
          height: viewport.height
        });
      } catch (err) {
        console.error('Failed to get PDF dimensions:', err);
      }
    };

    getPdfDimensions();
  }, [numPages, pdf.path, pdfViewport, pdf.filename]);

  // Calculate scale factors when container or PDF dimensions change
  useEffect(() => {
    if (!pdfViewport || containerWidth === 0 || containerHeight === 0) return;

    const padding = isMobile ? 8 : 16;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    const newFitWidthScale = availableWidth / pdfViewport.width;
    const newFitHeightScale = availableHeight / pdfViewport.height;

    // Notify parent component of the calculated fit scales
    if (onFitScalesChange) {
      onFitScalesChange(newFitWidthScale, newFitHeightScale);
    }
  }, [pdfViewport, containerWidth, containerHeight, isMobile, onFitScalesChange]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error): void {
    setError(error.message);
    setLoading(false);
  }

  // Calculate current scale and item height
  const { pageScale, itemHeight, pageWidth } = useMemo(() => {
    if (!pdfViewport) {
      return { pageScale: 1, itemHeight: 800, pageWidth: 600 };
    }

    const padding = isMobile ? 8 : 16;
    const currentScale = scale;

    // Calculate exact item height and width based on actual PDF viewport dimensions and current scale
    const calculatedItemHeight = (pdfViewport.height * currentScale) + padding;
    const calculatedPageWidth = (pdfViewport.width * currentScale) + padding;

    return {
      pageScale: currentScale,
      itemHeight: calculatedItemHeight,
      pageWidth: calculatedPageWidth
    };
  }, [pdfViewport, scale, isMobile]);

  // Handle container resize
  useEffect(() => {
    if (visiblePages.length === 0 || loading) {
      return;
    }

    const updateContainerDimensions = (reason: string) => {
      if (!containerRef.current) {
        return;
      }
      
      const rect = containerRef.current.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 16;
      const availableWidth = rect.width;
      
      const minHeight = 400;
      const finalHeight = Math.max(availableHeight, minHeight);
      
      // Update dimensions and log changes
      setContainerHeight(prevHeight => {
        if (availableHeight !== prevHeight || finalHeight !== prevHeight) {
          console.log('📐 Container dimensions changing:', { 
            reason,
            from: { width: containerWidth, height: prevHeight },
            to: { width: availableWidth, height: finalHeight }
          });
        }
        return finalHeight;
      });
      
      setContainerWidth(prevWidth => {
        if (availableWidth !== prevWidth) {
          // Logging is handled in setContainerHeight above to avoid duplicate logs
        }
        return availableWidth;
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      updateContainerDimensions('ResizeObserver');
    });

    // Set up ResizeObserver only, no timeout needed since ref callback handles initial measurement
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    const handleResize = () => updateContainerDimensions('window-resize');
    window.addEventListener('resize', handleResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [visiblePages.length, loading, containerWidth, containerHeight]);

  // Handle initial page scrolling
  useEffect(() => {
    if (initialPage && initialPage > 0 && visiblePages.length > 0 && listRef.current) {
      const visibleIndex = visiblePages.findIndex(pageNum => pageNum === initialPage);
      if (visibleIndex !== -1) {
        setTimeout(() => {
          listRef.current?.scrollToItem(visibleIndex, 'start');
        }, 100);
      }
    }
  }, [initialPage, visiblePages]);

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
        {visiblePages.length > 0 && !loading && pdfViewport && (
          <Box 
            ref={(el: HTMLDivElement | null) => {
              containerRef.current = el;
              if (el) {
                // Measure dimensions immediately when ref is set, but only if they're different
                const rect = el.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 16;
                const availableWidth = rect.width;
                const minHeight = 400;
                const finalHeight = Math.max(availableHeight, minHeight);
                
                // Only update if dimensions actually changed
                if (availableWidth !== containerWidth || finalHeight !== containerHeight) {
                  console.log('📦 Container ref set, updating dimensions:', {
                    from: { width: containerWidth, height: containerHeight },
                    to: { width: availableWidth, height: finalHeight }
                  });
                  setContainerHeight(finalHeight);
                  setContainerWidth(availableWidth);
                }
              }
            }}
            sx={{ 
              flex: 1, 
              bgcolor: '#f5f5f5',
              display: 'flex',
              justifyContent: 'center',
              overflow: 'auto',
              minHeight: 400,
              height: '100%'
            }}
          >
            <List
              ref={listRef}
              height={containerHeight}
              width={Math.max(containerWidth, pageWidth)}
              itemCount={visiblePages.length}
              itemSize={itemHeight}
              itemData={itemData}
              overscanCount={1}
            >
              {PageItem}
            </List>
          </Box>
        )}
      </Document>
    </Box>
  );
}
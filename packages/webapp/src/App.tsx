import { useEffect, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import HeightIcon from '@mui/icons-material/Height';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useTheme, alpha, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputBase from '@mui/material/InputBase';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';

import { useIndexData, useGroupedTags, useTagSections } from './hooks/useIndexData';
import Sidebar from './components/Sidebar';
import ManualList from './components/ManualList';
import PdfViewer from './components/PdfViewer';
import type { PdfIndexEntry } from './types';
import './App.css';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(2),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '20ch',
      '&:focus': {
        width: '28ch',
      },
    },
  },
}));

function App() {
  const { index, loading, error } = useIndexData();
  const groupedTags = useGroupedTags(index);
  const tagSections = useTagSections(groupedTags);
  

  const [showLoadedAlert, setShowLoadedAlert] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfIndexEntry | null>(null);
  const [selectedTags, setSelectedTags] = useState<Record<string, Set<string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfScale, setPdfScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<'fit-width' | 'fit-height' | 'manual'>('fit-width');
  const [initialPage, setInitialPage] = useState<number | undefined>(undefined);
  const [hasProcessedUrlParams, setHasProcessedUrlParams] = useState(false);
  const [fitWidthScale, setFitWidthScale] = useState(1);
  const [fitHeightScale, setFitHeightScale] = useState(1);
  
  const [qrPdf, setQrPdf] = useState<PdfIndexEntry | null>(null);
  const [qrDownloadLoading, setQrDownloadLoading] = useState(false);
  const [qrCopyLoading, setQrCopyLoading] = useState(false);
  const [qrPage, setQrPage] = useState(1);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPhone = /iPhone/i.test(navigator.userAgent);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevSelectedPdf = useRef<PdfIndexEntry | null>(null);

  // Detect Web Share API availability
  const hasShareAPI = navigator.share !== undefined;

  useEffect(() => {
    setShowLoadedAlert(true);
  }, [index]);

  useEffect(() => {
    if (prevSelectedPdf.current && !selectedPdf && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    prevSelectedPdf.current = selectedPdf;
  }, [selectedPdf]);

  // Handle URL parameters to open PDF directly
  useEffect(() => {
    if (!index) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const pdfPath = urlParams.get('pdf');
    const pageParam = urlParams.get('page');
    
    if (pdfPath) {
      const pdf = index.pdfs.find(p => p.path === pdfPath);
      if (pdf) {
        setSelectedPdf(pdf);
        // Set initial page if provided
        if (pageParam) {
          const pageNum = parseInt(pageParam, 10);
          if (pageNum > 0) {
            setInitialPage(pageNum);
          }
        }
      }
    }
    
    // Mark that we have processed URL parameters
    setHasProcessedUrlParams(true);
  }, [index]);

  // Update URL when PDF is selected/deselected
  useEffect(() => {
    // Don't clear URL parameters until we've had a chance to process them
    if (!hasProcessedUrlParams && !selectedPdf) {
      return;
    }
    
    const url = new URL(window.location.href);
    if (selectedPdf) {
      url.searchParams.set('pdf', selectedPdf.path);
    } else {
      url.searchParams.delete('pdf');
      url.searchParams.delete('page');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedPdf, hasProcessedUrlParams]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleTagClick = (sectionKey: string, tag: string) => {
    setSelectedTags((prev) => {
      const prevSet: Set<string> = prev[sectionKey] ? new Set<string>(Array.from(prev[sectionKey])) : new Set<string>();
      if (prevSet.has(tag)) {
        prevSet.delete(tag);
      } else {
        prevSet.add(tag);
      }
      return { ...prev, [sectionKey]: prevSet };
    });
    if (isMobile) handleDrawerToggle();
  };

  const handleClearAllTags = () => {
    setSelectedTags({});
  };

  const handleSelectPdf = (pdf: PdfIndexEntry) => {
    setSelectedPdf(pdf);
    setPdfScale(1);
    // Auto-select zoom mode based on viewport aspect ratio
    const viewportRatio = window.innerWidth / window.innerHeight;
    // We'll let the PdfViewer component handle the actual scale calculation
    // based on real PDF dimensions, but we can still auto-select the mode
    const autoMode = viewportRatio > 1.3 ? 'fit-width' : 'fit-height';
    setZoomMode(autoMode);
    setInitialPage(undefined);
  };

  const handleFitScalesChange = (newFitWidthScale: number, newFitHeightScale: number) => {
    setFitWidthScale(newFitWidthScale);
    setFitHeightScale(newFitHeightScale);
    
    // Always set the scale when PDF loads based on the current zoom mode, not just conditionally
    if (zoomMode === 'fit-width') {
      setPdfScale(newFitWidthScale);
    } else if (zoomMode === 'fit-height') {
      setPdfScale(newFitHeightScale);
    }
    // If in manual mode, keep the current scale
  };

  // Ensure proper scale initialization when zoom mode and fit scales are available
  useEffect(() => {
    // Only trigger if we have a selected PDF, valid calculated fit scales (not default 1), and scale is still at default
    if (selectedPdf && fitWidthScale !== 1 && fitHeightScale !== 1 && pdfScale === 1) {
      if (zoomMode === 'fit-width') {
        setPdfScale(fitWidthScale);
      } else if (zoomMode === 'fit-height') {
        setPdfScale(fitHeightScale);
      }
    }
  }, [selectedPdf, zoomMode, fitWidthScale, fitHeightScale, pdfScale]);

  const handleZoomIn = () => {
    setZoomMode('manual');
    // Limit zoom to 3x (300%) on iPhone due to performance/memory constraints, 10x on other devices
    const maxZoom = isIPhone ? 3 : 10;
    setPdfScale(prev => Math.min(prev * 1.2, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomMode('manual');
    setPdfScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleFitToWidth = () => {
    setZoomMode('fit-width');
    setPdfScale(fitWidthScale);
  };

  const handleFitToHeight = () => {
    setZoomMode('fit-height');
    setPdfScale(fitHeightScale);
  };

  const handleShowQR = (pdf: PdfIndexEntry) => {
    setQrPdf(pdf);
    setQrPage(1);
  };

  const handleCloseQR = () => {
    setQrPdf(null);
    setQrPage(1);
    setQrCopyLoading(false);
  };

  const qrUrl = qrPdf ? `${window.location.origin}?pdf=${encodeURIComponent(qrPdf.path)}&page=${qrPage}` : '';
  const drawerWidth = 240;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          top: 0,
          left: 0,
          right: 0,
          position: 'fixed !important'
        }}
      >
        <Toolbar>
          {isMobile && !selectedPdf && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          {isIPhone && selectedPdf && (
            <IconButton
              color="inherit"
              aria-label="back"
              edge="start"
              onClick={() => setSelectedPdf(null)}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Manuals Library
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {selectedPdf ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleZoomOut}
                  disabled={pdfScale <= 0.1}
                  aria-label="Zoom out"
                >
                  <ZoomOutIcon />
                </IconButton>
                <Typography 
                  variant="body2" 
                  color="inherit" 
                  sx={{ 
                    minWidth: 50, 
                    textAlign: 'center',
                    opacity: pdfScale >= (isIPhone ? 3 : 10) ? 0.7 : 1
                  }}
                  title={isIPhone && pdfScale >= 3 ? 'Maximum zoom reached on iPhone' : undefined}
                >
                  {Math.round(pdfScale * 100)}%
                </Typography>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleZoomIn}
                  disabled={pdfScale >= (isIPhone ? 3 : 10)}
                  aria-label="Zoom in"
                >
                  <ZoomInIcon />
                </IconButton>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleFitToWidth}
                  aria-label="Fit to width"
                  sx={{ 
                    bgcolor: zoomMode === 'fit-width' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  <FitScreenIcon />
                </IconButton>
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleFitToHeight}
                  aria-label="Fit to height"
                  sx={{ 
                    bgcolor: zoomMode === 'fit-height' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  <HeightIcon />
                </IconButton>
                {!isIPhone && (
                  <IconButton
                    color="inherit"
                    aria-label="close pdf"
                    edge="end"
                    onClick={() => setSelectedPdf(null)}
                    sx={{ ml: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </Box>
            ) : (
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search manuals…"
                  inputProps={{ 'aria-label': 'search' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ minWidth: isMobile ? 120 : 200 }}
                  inputRef={searchInputRef}
                />
              </Search>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {!selectedPdf && (
        <Sidebar
          open={drawerOpen}
          onClose={handleDrawerToggle}
          tagSections={tagSections}
          selectedTags={selectedTags}
          onTagClick={handleTagClick}
          onClearAllTags={handleClearAllTags}
          isMobile={isMobile}
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: selectedPdf ? 0 : 3, // Remove all padding when viewing PDF
          width: !selectedPdf ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
          mt: { xs: 7, sm: 8 }, // Reduce top margin on mobile (iPhone)
        }}
      >
        {selectedPdf ? (
          <PdfViewer 
            pdf={selectedPdf} 
            scale={pdfScale}
            initialPage={initialPage}
            onFitScalesChange={handleFitScalesChange}
          />
        ) : (
          <>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {index && (
              <>
                {showLoadedAlert && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowLoadedAlert(false)}>
                    Loaded {index.pdfs.length} manuals.
                    {Object.keys(selectedTags).some((section) => selectedTags[section]?.size > 0) && (
                      <span style={{ marginLeft: 8 }}>
                        (Filtered by tag:
                        {Object.entries(selectedTags)
                          .filter(([, set]) => set.size > 0)
                          .map(([section, set]) =>
                            ` ${section}: [${Array.from(set).join(', ')}]`
                          ).join(';')}
                        )
                      </span>
                    )}
                    {searchQuery && (
                      <span style={{ marginLeft: 8 }}>
                        (Search: <b>{searchQuery}</b>)
                      </span>
                    )}
                  </Alert>
                )}
                <ManualList
                  pdfs={index.pdfs}
                  tagSections={tagSections}
                  selectedTags={selectedTags}
                  searchQuery={searchQuery}
                  onSelectPdf={handleSelectPdf}
                  onShowQR={handleShowQR}
                />
              </>
            )}
          </>
        )}
      </Box>

      <Dialog open={!!qrPdf} onClose={handleCloseQR} maxWidth="xs" fullWidth>
        <DialogTitle>QR Code for PDF</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          {qrPdf && (
            <>
              <Box id="qr-download-container" sx={{ bgcolor: 'white', p: 2, borderRadius: 2, mb: 2 }}>
                <QRCode value={qrUrl} size={220} />
              </Box>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <label htmlFor="qr-page-input" style={{ fontSize: 14 }}>Page:</label>
                <input
                  id="qr-page-input"
                  type="number"
                  min={1}
                  max={qrPdf.pages || undefined}
                  value={qrPage}
                  onChange={(e) => {
                    let val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 1) val = 1;
                    if (qrPdf.pages && val > qrPdf.pages) val = qrPdf.pages;
                    setQrPage(val);
                  }}
                  style={{ width: 60, fontSize: 16, padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc' }}
                  aria-label="Page number for QR code"
                />
                <span style={{ fontSize: 12, color: '#888' }}>/ {qrPdf.pages}</span>
              </Box>
            </>
          )}
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1, 
              wordBreak: 'break-all', 
              textAlign: 'center',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            {qrUrl}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
          <Button
            onClick={async () => {
              if (!qrPdf) return;
              setQrCopyLoading(true);
              try {
                await navigator.clipboard.writeText(qrUrl);
                // Brief success indication (could be enhanced with a toast/snackbar)
                setTimeout(() => setQrCopyLoading(false), 500);
              } catch (err) {
                alert('Failed to copy URL to clipboard.');
                setQrCopyLoading(false);
              }
            }}
            color="primary"
            variant="outlined"
            size="small"
            disabled={qrCopyLoading}
            startIcon={qrCopyLoading ? <CircularProgress size={18} color="inherit" /> : <ContentCopyIcon />}
            aria-label="Copy URL to clipboard"
          >
            {qrCopyLoading ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            onClick={async () => {
              if (!qrPdf) return;
              setQrDownloadLoading(true);
              const qrNode = document.getElementById('qr-download-container');
              if (!qrNode) { setQrDownloadLoading(false); return; }
              try {
                const dataUrl = await toPng(qrNode, { backgroundColor: 'white' });
                
                if (hasShareAPI) {
                  // Use Web Share API if available
                  const response = await fetch(dataUrl);
                  const blob = await response.blob();
                  const file = new File([blob], `${qrPdf.filename.replace(/\.[^/.]+$/, '')}-qr.png`, { type: 'image/png' });
                  
                  await navigator.share({
                    title: `QR Code - ${qrPdf.filename}`,
                    text: `QR code for ${qrPdf.filename} - Page ${qrPage}`,
                    files: [file]
                  });
                } else {
                  // Fallback to download
                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = `${qrPdf.filename.replace(/\.[^/.]+$/, '')}-qr.png`;
                  link.click();
                }
              } catch (err) {
                alert(hasShareAPI ? 'Failed to share QR code.' : 'Failed to generate QR code image.');
              }
              setQrDownloadLoading(false);
            }}
            color="secondary"
            variant="contained"
            size="small"
            disabled={qrDownloadLoading}
            startIcon={qrDownloadLoading ? <CircularProgress size={18} color="inherit" /> : (hasShareAPI ? <ShareIcon /> : null)}
            aria-label={hasShareAPI ? "Share QR code" : "Download QR code as PNG"}
          >
            {qrDownloadLoading ? (hasShareAPI ? 'Sharing...' : 'Downloading...') : (hasShareAPI ? 'Share' : 'Download')}
          </Button>
          <Button onClick={handleCloseQR} color="primary" variant="outlined" size="small" aria-label="Close QR code dialog">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
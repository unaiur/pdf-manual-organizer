import React, { useEffect, useState, useRef } from 'react';
import './App.css';

import AppBar from '@mui/material/AppBar';
import Tooltip from '@mui/material/Tooltip';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useTheme, alpha, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';

// Styled components must come after all imports
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
    // vertical padding + font size from searchIcon
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

interface PdfIndexEntry {
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

interface IndexData {
  generatedAt: string;
  pdfs: PdfIndexEntry[];
}

function App() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [showLoadedAlert, setShowLoadedAlert] = useState(true);
  // Track expanded/collapsed tag state per manual
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Track the currently opened PDF (null = none open)
  const [selectedPdf, setSelectedPdf] = useState<PdfIndexEntry | null>(null);
  const prevSelectedPdf = useRef<PdfIndexEntry | null>(null);

  // QR code modal state
  const [qrPdf, setQrPdf] = useState<PdfIndexEntry | null>(null);
  const [qrDownloadLoading, setQrDownloadLoading] = useState(false);
  const [qrPage, setQrPage] = useState(1);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

   useEffect(() => {
     setShowLoadedAlert(true);
   }, [index]);
  const drawerWidth = 240;

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Tag filtering state (multiple tags per section)
  const [selectedTags, setSelectedTags] = useState<Record<string, Set<string>>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Compute grouped tags by type from index
  const groupedTags = React.useMemo(() => {
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
      // tags and extraTags may be of the form key:value or just value
      [...pdf.tags, ...pdf.extraTags].forEach((t) => {
        // Try to parse key:value
        const match = t.match(/^([a-zA-Z0-9_\-]+):(.*)$/);
        if (match) {
          const key = match[1];
          const value = match[2];
          if (["brand","model","device","manualType"].includes(key)) {
            // Already handled above
            return;
          }
          if (!other[key]) other[key] = new Set<string>();
          other[key].add(value);
        } else {
          // If not key:value, treat as a generic tag
          if (!other["other"]) other["other"] = new Set<string>();
          other["other"].add(t);
        }
      });
    });
    return { brand, model, device, manualType, other };
  }, [index]);


  // Toggle tag selection for a section
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

  // Focus search input when returning from PDF view
  useEffect(() => {
    if (prevSelectedPdf.current && !selectedPdf && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    prevSelectedPdf.current = selectedPdf;
  }, [selectedPdf]);

  
  // Prepare grouped tag sections for rendering
  const tagSections = React.useMemo(() => {
    if (!groupedTags) return [];
    const sections: { key: string, tags: string[] }[] = [];
    // Main types in order
    const mainTypes = ["brand", "model", "device", "manualType"];
    mainTypes.forEach((type) => {
      const set = groupedTags[type as keyof typeof groupedTags] as Set<string>;
      if (set && set.size > 0) {
        sections.push({ key: type, tags: Array.from(set).sort() });
      }
    });
    // Other user-defined tag types
    if (groupedTags.other) {
      // Gather all main type values for filtering
      const mainTypeValues = new Set<string>();
      [groupedTags.brand, groupedTags.model, groupedTags.device, groupedTags.manualType].forEach((set) => {
        set?.forEach((v) => mainTypeValues.add(v));
      });
      const mainTypes = ["brand", "model", "device", "manualType"];
      Object.keys(groupedTags.other)
        .sort()
        .forEach((key) => {
          // Skip keys that are main types
          if (mainTypes.includes(key)) return;
          if (groupedTags.other[key] && groupedTags.other[key].size > 0) {
            // For the 'other' key, filter out tags that are already in main type sets
            let filtered: string[];
            if (key === "other") {
              filtered = Array.from(groupedTags.other[key]).filter((tag) => {
                // If tag is key=value, parse it
                const eqIdx = tag.indexOf('=');
                if (eqIdx !== -1) {
                  const tagKey = tag.slice(0, eqIdx);
                  // Exclude if key is a main type
                  if (mainTypes.includes(tagKey)) return false;
                  return true;
                }
                // If not key=value, always show
                return true;
              });
            } else {
              filtered = Array.from(groupedTags.other[key]);
            }
            // console.log(`DEBUG section key: ${key}, filtered:`, filtered);
            if (filtered.length > 0) {
              sections.push({ key, tags: filtered.sort() });
            }
          }
        });
    }
    return sections;
  }, [groupedTags]);

  const drawer = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Toolbar />
      <List>
         <ListItem disableGutters sx={{ mb: 1 }}>
           <Box sx={{
             width: '100%',
             display: 'flex',
             alignItems: 'center',
             bgcolor: 'cyan.main',
             color: 'cyan.contrastText',
             fontWeight: 'bold',
             fontSize: 18,
             px: 2,
             py: 1.2,
             borderRadius: 2,
             boxShadow: 1,
             letterSpacing: 0.5,
             justifyContent: 'space-between',
           }}>
             <span style={{ flex: 1, textAlign: 'center' }}>Filter by tag</span>
             {Object.keys(selectedTags).some((section) => selectedTags[section]?.size > 0) && (
               <Tooltip title="Clear all tag filters">
                 <IconButton
                   size="small"
                   sx={{ color: 'cyan.contrastText', ml: 1 }}
                   onClick={() => setSelectedTags({})}
                   aria-label="Clear all tag filters"
                 >
                   <FilterAltOffIcon fontSize="small" />
                 </IconButton>
               </Tooltip>
             )}
           </Box>
         </ListItem>        {tagSections.length === 0 && (
          <ListItem>
            <ListItemText primary="No tags found" />
          </ListItem>
        )}
        {/* Accordion sections for tag filtering */}
        {tagSections.map((section, idx) => (
          <Accordion key={section.key} defaultExpanded={idx === 0}>
            <AccordionSummary
              expandIcon={<span>▼</span>}
              aria-controls={`panel-${section.key}-content`}
              id={`panel-${section.key}-header`}
            >
               <Typography sx={{ fontWeight: 600 }}>
                 {(() => {
                   const keyMap: Record<string, string> = {
                     manualType: 'Manual Type',
                     brand: 'Brand',
                     model: 'Model',
                     device: 'Device',
                     other: 'Other',
                   };
                   return keyMap[section.key] || section.key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
                 })()}
                 {selectedTags[section.key] && selectedTags[section.key].size > 0 && (
                   <span style={{ marginLeft: 8, color: '#888', fontWeight: 400 }}>
                     ({selectedTags[section.key].size} selected)
                   </span>
                 )}
               </Typography>            </AccordionSummary>
            <AccordionDetails>
              {section.tags.map((tag) => (
                <ListItemButton
                  key={tag}
                  selected={selectedTags[section.key]?.has(tag)}
                  onClick={() => handleTagClick(section.key, tag)}
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary={tag} />
                </ListItemButton>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </List>
     </Box>
   );

// QR Code Modal
    const qrUrl = qrPdf ? `${window.location.origin}/pdf/${qrPdf.path}#page=${qrPage}` : '';
   return (
     <Box sx={{ display: 'flex' }}>
       {/* AppBar always shown, but will add close button in next step */}
       <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
           <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
             Manuals Library
           </Typography>
           <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
             {selectedPdf ? (
               <IconButton
                 color="inherit"
                 aria-label="close pdf"
                 edge="end"
                 onClick={() => setSelectedPdf(null)}
                 sx={{ ml: 2 }}
               >
                 <CloseIcon />
               </IconButton>
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
                  />              </Search>
             )}
           </Box>        </Toolbar>
       </AppBar>
       {/* Hide Drawer when PDF is open */}
       {!selectedPdf && (
         <nav>
           <Drawer
             variant={isMobile ? 'temporary' : 'permanent'}
             open={isMobile ? drawerOpen : true}
             onClose={handleDrawerToggle}
             ModalProps={{ keepMounted: true }}
             sx={{
               width: drawerWidth,
               flexShrink: 0,
               '& .MuiDrawer-paper': {
                 width: drawerWidth,
                 boxSizing: 'border-box',
               },
               display: { xs: 'block', sm: 'block' },
             }}
           >
             {drawer}
           </Drawer>
         </nav>
       )}
       <Box
         component="main"
         sx={{
           flexGrow: 1,
           p: 3,
           width: !selectedPdf ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
           mt: 8,
         }}
       >
         {selectedPdf ? (
           // PDF viewer mode
           <Box sx={{ width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <Typography variant="h6" sx={{ mb: 2 }}>
   {selectedPdf.brand} {selectedPdf.model} — {selectedPdf.device} ({selectedPdf.manualType})
 </Typography>
 <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
   {selectedPdf.filename}
 </Typography>
             <iframe
               src={`/pdf/${selectedPdf.path}`}
               title={selectedPdf.title || selectedPdf.filename}
               style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
             />
           </Box>
         ) : (
           // Main page mode
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
                            .filter(([_, set]) => set.size > 0)
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
                 <List>
<>
{index.pdfs
  .filter((pdf) => {
    // Tag filter (multiple tags per section)
    for (const section of tagSections) {
      const selected = selectedTags[section.key];
      if (selected && selected.size > 0) {
        // For main types, check the field; for others, check tags/extraTags
        if (["brand","model","device","manualType"].includes(section.key)) {
          if (!selected.has((pdf as any)[section.key])) return false;
        } else {
          // For user-defined tags, check if any selected tag is present in tags/extraTags
          const allTags = [...pdf.tags, ...pdf.extraTags];
          let found = false;
          Array.from(selected).forEach((tag) => {
            if (allTags.includes(`${section.key}:${tag}`) || allTags.includes(tag)) {
              found = true;
            }
          });
          if (!found) return false;
        }
      }
    }
    // Search filter (case-insensitive, matches filename, title, brand, model, device, manualType, tags)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [
        pdf.filename,
        pdf.title,
        pdf.brand,
        pdf.model,
        pdf.device,
        pdf.manualType,
        ...pdf.tags,
        ...pdf.extraTags,
      ].join(' ').toLowerCase();
      if (!fields.includes(q)) return false;
    }
    return true;
  })
  .map((pdf) => (
    <ListItem key={pdf.hash} alignItems="flex-start" sx={{ mb: 1, borderRadius: 2, boxShadow: 1, bgcolor: 'background.paper', py: { xs: 1.5, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {pdf.brand} {pdf.model} — {pdf.device} ({pdf.manualType})
        </Typography>
<Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
           {pdf.filename}
         </Typography>         {/* Tag list with expand/collapse and custom tags first */}
         {(() => {
           const allTags = [...pdf.extraTags, ...pdf.tags];
            // Default: expanded on desktop, collapsed on mobile
            const isExpanded =
              expandedTags[pdf.hash] !== undefined
                ? expandedTags[pdf.hash]
                : !isMobile;           const shownTags = isExpanded ? allTags : allTags.slice(0, 2);
           const hasMore = allTags.length > 2;
           return (
             <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, overflowX: 'visible' }}>
               {shownTags.map((tag) => (
<Box key={tag} sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', px: 0.5, py: 0.2, borderRadius: 1, fontSize: 11, whiteSpace: 'nowrap', mb: 0.5, height: 20, display: 'flex', alignItems: 'center', minWidth: 20 }}>
                    {tag}
                  </Box>               ))}
               {hasMore && !isExpanded && (
<Box
                    role="button"
                    tabIndex={0}
                    aria-label="Show all tags"
                    onClick={() => setExpandedTags((prev) => ({ ...prev, [pdf.hash]: true }))}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setExpandedTags((prev) => ({ ...prev, [pdf.hash]: true })); } }}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      px: 0.5,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      mb: 0.5,
                      border: 'none',
                      cursor: 'pointer',
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 0,
                      outline: 'none',
                      userSelect: 'none',
                    }}
                   >
                    <Box component="span" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }} aria-hidden="true">+</Box>
                  </Box>               )}               {hasMore && isExpanded && (
<Box
                    role="button"
                    tabIndex={0}
                    aria-label="Collapse tags"
                    onClick={() => setExpandedTags((prev) => ({ ...prev, [pdf.hash]: false }))}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setExpandedTags((prev) => ({ ...prev, [pdf.hash]: false })); } }}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      px: 0.5,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      mb: 0.5,
                      border: 'none',
                      cursor: 'pointer',
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 0,
                      outline: 'none',
                      userSelect: 'none',
                    }}
                   >
                    <Box component="span" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }} aria-hidden="true">-</Box>
                  </Box>               )}             </Box>
           );
         })()}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Pages: {pdf.pages} | Last modified: {pdf.lastModified}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          ml: { xs: 0, sm: 2 },
          mt: { xs: 1.5, sm: 0 },
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
        }}
      >
        <button
          onClick={() => setSelectedPdf(pdf)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 2,
                py: 1.2,
                minHeight: 44,
                borderRadius: 1,
                fontWeight: 500,
                fontSize: 14,
                textAlign: 'center',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <PictureAsPdfIcon sx={{ mr: 1 }} /> View
            </Box>        </button>
        <button
          onClick={() => { setQrPdf(pdf); setQrPage(1); }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          aria-label="Show QR code"
        >
          <Box
            sx={{
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              px: 2,
              py: 1.2,
              minHeight: 44,
              borderRadius: 1,
              fontWeight: 500,
              fontSize: 14,
              textAlign: 'center',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'secondary.dark' },
            }}
          >
            <QrCodeIcon sx={{ mr: 1 }} /> QR
          </Box>
        </button>
      </Box>
    </ListItem>
  ))}
{index.pdfs.filter((pdf) => {
  // Tag filter (multiple tags per section)
  for (const section of tagSections) {
    const selected = selectedTags[section.key];
    if (selected && selected.size > 0) {
      if (["brand","model","device","manualType"].includes(section.key)) {
        if (!selected.has((pdf as any)[section.key])) return false;
      } else {
        const allTags = [...pdf.tags, ...pdf.extraTags];
        let found = false;
        Array.from(selected).forEach((tag) => {
          if (allTags.includes(`${section.key}:${tag}`) || allTags.includes(tag)) {
            found = true;
          }
        });
        if (!found) return false;
      }
    }
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const fields = [
      pdf.filename,
      pdf.title,
      pdf.brand,
      pdf.model,
      pdf.device,
      pdf.manualType,
      ...pdf.tags,
      ...pdf.extraTags,
    ].join(' ').toLowerCase();
    if (!fields.includes(q)) return false;
  }
  return true;
}).length === 0 && (
  <ListItem>
    <ListItemText primary="No manuals found." />
  </ListItem>
)}
</>                </List>
              </>
            )}
          </>
        )}
      </Box>
      {/* QR Code Modal */}
<Dialog open={!!qrPdf} onClose={() => { setQrPdf(null); setQrPage(1); }} maxWidth="xs" fullWidth>
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
            onChange={e => {
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
    <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all', textAlign: 'center' }}>{qrUrl}</Typography>
  </DialogContent>
  <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
    <Button
      onClick={async () => {
        if (!qrPdf) return;
        setQrDownloadLoading(true);
        const qrNode = document.getElementById('qr-download-container');
        if (!qrNode) { setQrDownloadLoading(false); return; }
        try {
          const dataUrl = await toPng(qrNode, { backgroundColor: 'white' });
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${qrPdf.filename.replace(/\.[^/.]+$/, '')}-qr.png`;
          link.click();
        } catch (err) {
          alert('Failed to generate QR code image.');
        }
        setQrDownloadLoading(false);
      }}
      color="secondary"
      variant="contained"
      disabled={qrDownloadLoading}
      startIcon={qrDownloadLoading ? <CircularProgress size={18} color="inherit" /> : null}
      aria-label="Download QR code as PNG"
    >
      {qrDownloadLoading ? 'Downloading...' : 'Download QR'}
    </Button>
    <Button onClick={() => { setQrPdf(null); setQrPage(1); }} color="primary" variant="outlined" aria-label="Close QR code dialog">Close</Button>
  </DialogActions>
</Dialog>    </Box>
  );
}

export default App;


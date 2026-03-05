import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, 
  Upload, 
  Download, 
  Loader2, 
  Table as TableIcon, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { extractTextFromPDF, PDFPageData } from './services/pdfService';
import { processDialuxReport, DialuxData } from './services/geminiService';
import { cn } from './utils';

// Set worker source for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<PDFPageData[]>([]);
  const [extractedData, setExtractedData] = useState<DialuxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'pdf' | 'ai' | 'general' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [editingResult, setEditingResult] = useState<{ index: number; field: keyof DialuxData['lightingResults'][0] } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageTextContentRef = useRef<any>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      handleProcess(selectedFile);
    } else {
      setError({ message: 'Please upload a valid PDF file.', type: 'general' });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  } as any);

  const handleProcess = async (pdfFile: File) => {
    setIsLoading(true);
    setError(null);
    setExtractedData(null);
    setCurrentPage(1);

    try {
      let pages;
      try {
        pages = await extractTextFromPDF(pdfFile);
      } catch (pdfErr) {
        console.error('PDF Extraction Error:', pdfErr);
        setError({ 
          message: 'Could not read the PDF structure. The file might be corrupted or protected.', 
          type: 'pdf' 
        });
        setIsLoading(false);
        return;
      }

      setPdfData(pages);
      setNumPages(pages.length);

      const fullText = pages.map(p => p.text).join('\n');
      
      try {
        const data = await processDialuxReport(fullText);
        setExtractedData(data);
      } catch (aiErr) {
        console.error('AI Processing Error:', aiErr);
        setError({ 
          message: 'The AI failed to extract structured data from this report. This can happen with non-standard report formats.', 
          type: 'ai' 
        });
      }
    } catch (err) {
      console.error('General Processing Error:', err);
      setError({ 
        message: 'An unexpected error occurred while processing your file.', 
        type: 'general' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async (pageNo: number, currentScale: number) => {
    if (!file || !canvasRef.current) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNo);
      
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;

        // Store text content for highlighting
        const textContent = await page.getTextContent();
        pageTextContentRef.current = { textContent, viewport };
      }
    } catch (err) {
      console.error('Error rendering PDF page:', err);
    }
  };

  useEffect(() => {
    if (file) {
      renderPage(currentPage, 1.5);
    }
  }, [file, currentPage]);

  const highlightText = async (searchText: string) => {
    if (!canvasRef.current || !pageTextContentRef.current) return;
    
    // Re-render to clear previous highlights
    await renderPage(currentPage, 1.5);
    
    const { textContent, viewport } = pageTextContentRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clean search text (remove "Working plane" etc if present)
    const cleanSearch = searchText.replace(/Working plane\s*\(/i, '').replace(/\)/, '').trim().toLowerCase();

    textContent.items.forEach((item: any) => {
      if (item.str.toLowerCase().includes(cleanSearch) || cleanSearch.includes(item.str.toLowerCase())) {
        const tx = pdfjs.Util.transform(
          viewport.transform,
          item.transform
        );
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.lineWidth = 2;
        
        // PDF.js coordinates are bottom-up, canvas is top-down
        // The transform handles most of it, but we need the height
        const width = item.width * (viewport.scale);
        const height = item.height * (viewport.scale);
        
        ctx.fillRect(tx[4], tx[5] - height, width, height);
        ctx.strokeRect(tx[4], tx[5] - height, width, height);
        ctx.restore();
      }
    });
  };

  const updateExtractedData = (index: number, field: string, value: string) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    (newData.lightingResults[index] as any)[field] = value;
    setExtractedData(newData);
  };

  const exportToCSV = () => {
    if (!extractedData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Room Info
    csvContent += `Room Name,${extractedData.roomName}\n`;
    if (extractedData.spaceLPD) csvContent += `Space LPD,${extractedData.spaceLPD}\n`;
    csvContent += `\n`;
    
    // Luminaires
    csvContent += "LUMINAIRES\nModel,Quantity,Flux,Power\n";
    extractedData.luminaires.forEach(l => {
      csvContent += `"${l.model}",${l.quantity},"${l.flux || ''}","${l.power || ''}"\n`;
    });
    
    csvContent += "\nLIGHTING RESULTS\nSurface,Average Lux,LPD\n";
    extractedData.lightingResults.forEach(r => {
      csvContent += `"${r.surface}","${r.averageLux}","${r.lpd || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dialux_Report_${extractedData.roomName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-sm">
            <FileText className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">DIALux Report Extractor</h1>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">v1.0.0 // Technical Data Parser</p>
          </div>
        </div>
        
        {extractedData && (
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 rounded-sm hover:bg-[#333] transition-colors text-sm font-medium"
          >
            <Download size={16} />
            EXPORT TO CSV
          </button>
        )}
      </header>

      <main className="p-6 max-w-[1600px] mx-auto">
        {!file ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              {...getRootProps()}
              className={cn(
                "w-full max-w-2xl border-2 border-dashed border-[#141414] p-12 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all rounded-lg bg-white/30 backdrop-blur-sm",
                isDragActive ? "bg-white/60 scale-[1.02] border-solid" : "hover:bg-white/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-20 h-20 rounded-full border border-[#141414] flex items-center justify-center">
                <Upload size={32} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-serif italic mb-2">Drop your DIALux PDF here</h2>
                <p className="text-sm opacity-60 font-mono uppercase tracking-wider">Supports standard DIALux evo and 4.13 reports</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-180px)]">
            {/* Left Column: PDF Preview */}
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="opacity-50" />
                  <span className="text-xs font-mono uppercase tracking-widest">Original Reference</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-[#141414]/10">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 hover:bg-[#141414]/10 rounded disabled:opacity-20"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] font-mono min-w-[60px] text-center">
                      PAGE {currentPage} / {numPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                      disabled={currentPage === numPages}
                      className="p-1 hover:bg-[#141414]/10 rounded disabled:opacity-20"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div 
                ref={containerRef}
                className="flex-1 bg-white border border-[#141414] overflow-auto rounded-sm relative shadow-inner group"
              >
                <div className="min-w-full min-h-full flex justify-center p-8">
                  <canvas 
                    ref={canvasRef} 
                    className="shadow-2xl origin-top"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Extracted Data */}
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <TableIcon size={16} className="opacity-50" />
                  <span className="text-xs font-mono uppercase tracking-widest">Extracted Data Table</span>
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    ANALYZING...
                  </div>
                )}
              </div>

              <div className="flex-1 bg-white border border-[#141414] overflow-auto rounded-sm p-6 shadow-sm">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center gap-4"
                    >
                      <Loader2 className="animate-spin w-12 h-12 stroke-[1px]" />
                      <div className="text-center">
                        <p className="font-serif italic text-lg">Processing report data...</p>
                        <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-2">Gemini AI is structuring the technical parameters</p>
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <AlertCircle size={32} strokeWidth={1.5} />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-serif italic text-xl text-[#141414]">
                          {error.type === 'pdf' ? 'PDF Reading Failed' : 
                           error.type === 'ai' ? 'Analysis Incomplete' : 
                           'Processing Error'}
                        </h3>
                        <p className="text-sm text-[#141414]/60 leading-relaxed max-w-xs mx-auto">
                          {error.message}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button 
                          onClick={() => handleProcess(file!)}
                          className="bg-[#141414] text-[#E4E3E0] py-3 rounded-sm text-xs font-mono uppercase tracking-widest hover:bg-[#333] transition-colors"
                        >
                          Retry Analysis
                        </button>
                        <button 
                          onClick={() => setFile(null)}
                          className="border border-[#141414] text-[#141414] py-3 rounded-sm text-xs font-mono uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                        >
                          Upload Different File
                        </button>
                      </div>

                      {error.type === 'ai' && (
                        <p className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">
                          Tip: Ensure the PDF is a standard DIALux report with clear text tables.
                        </p>
                      )}
                    </motion.div>
                  ) : extractedData ? (
                    <motion.div 
                      key="content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      {/* Room Header */}
                      <div className="border-b border-[#141414] pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">Project Item</span>
                            </div>
                            <h3 className="text-3xl font-serif italic">{extractedData.roomName}</h3>
                          </div>
                          {extractedData.spaceLPD && (
                            <div className="text-right">
                              <span className="text-[10px] font-mono uppercase opacity-40 block">Space LPD</span>
                              <span className="text-xl font-mono font-bold">{extractedData.spaceLPD}</span>
                            </div>
                          )}
                        </div>
                        {extractedData.dimensions && (
                          <div className="mt-2 flex gap-4 text-[10px] font-mono uppercase tracking-widest opacity-70">
                            <span>L: {extractedData.dimensions.length}</span>
                            <span>W: {extractedData.dimensions.width}</span>
                            <span>H: {extractedData.dimensions.height}</span>
                          </div>
                        )}
                      </div>

                      {/* Luminaires Table */}
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-[0.2em] mb-4 opacity-50 border-l-2 border-[#141414] pl-2">01. Luminaire Schedule</h4>
                        <div className="border border-[#141414]">
                          <div className="grid grid-cols-[1fr_80px_100px_100px] bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase tracking-widest p-3">
                            <div>Model / Description</div>
                            <div className="text-center">Qty</div>
                            <div className="text-right">Flux</div>
                            <div className="text-right">Power</div>
                          </div>
                          {extractedData.luminaires.map((lum, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px] border-t border-[#141414] p-3 text-sm hover:bg-[#141414]/5 transition-colors group">
                              <div className="font-medium group-hover:italic transition-all">{lum.model}</div>
                              <div className="text-center font-mono">{lum.quantity}</div>
                              <div className="text-right font-mono text-xs opacity-70">{lum.flux}</div>
                              <div className="text-right font-mono text-xs opacity-70">{lum.power}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Results Table */}
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-[0.2em] mb-4 opacity-50 border-l-2 border-[#141414] pl-2">02. Calculation Results</h4>
                        <div className="border border-[#141414]">
                          <div className="grid grid-cols-[2fr_1fr_1fr] bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase tracking-widest p-3">
                            <div>Surface</div>
                            <div className="text-right">Avg (lx)</div>
                            <div className="text-right">LPD (W/m²)</div>
                          </div>
                          {extractedData.lightingResults.map((res, idx) => {
                            return (
                              <div 
                                key={idx} 
                                onMouseEnter={() => setHoveredRow(idx)}
                                onMouseLeave={() => setHoveredRow(null)}
                                className="grid grid-cols-[2fr_1fr_1fr] border-t border-[#141414] p-3 text-sm hover:bg-[#141414]/5 transition-colors items-center relative group"
                              >
                                <div className="font-medium truncate pr-2 flex items-center gap-2" title={res.surface}>
                                  {editingResult?.index === idx && editingResult.field === 'surface' ? (
                                    <input 
                                      autoFocus
                                      className="w-full bg-white border border-[#141414] px-1"
                                      value={res.surface}
                                      onChange={(e) => updateExtractedData(idx, 'surface', e.target.value)}
                                      onBlur={() => setEditingResult(null)}
                                    />
                                  ) : (
                                    <>
                                      <span className="truncate">{res.surface.replace(/Working plane\s*\(/i, '').replace(/\)/, '')}</span>
                                      {hoveredRow === idx && (
                                        <div className="flex gap-1 shrink-0">
                                          <button 
                                            onClick={() => highlightText(res.surface)}
                                            className="p-1 bg-[#141414] text-[#E4E3E0] rounded hover:bg-[#333] transition-colors"
                                            title="Highlight in PDF"
                                          >
                                            <Eye size={10} />
                                          </button>
                                          <button 
                                            onClick={() => setEditingResult({ index: idx, field: 'surface' })}
                                            className="p-1 bg-[#141414] text-[#E4E3E0] rounded hover:bg-[#333] transition-colors"
                                            title="Edit Row"
                                          >
                                            <Pencil size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                
                                {/* Avg Lux */}
                                <div className="text-right font-mono font-bold px-1 h-full flex items-center justify-end">
                                  {editingResult?.index === idx && editingResult.field === 'averageLux' ? (
                                    <input 
                                      autoFocus
                                      className="w-full text-right bg-white border border-[#141414]"
                                      value={res.averageLux}
                                      onChange={(e) => updateExtractedData(idx, 'averageLux', e.target.value)}
                                      onBlur={() => setEditingResult(null)}
                                    />
                                  ) : (
                                    res.averageLux
                                  )}
                                </div>

                                {/* LPD */}
                                <div className="text-right font-mono text-xs opacity-70">
                                  {editingResult?.index === idx && editingResult.field === 'lpd' ? (
                                    <input 
                                      autoFocus
                                      className="w-full text-right bg-white border border-[#141414]"
                                      value={res.lpd || ''}
                                      onChange={(e) => updateExtractedData(idx, 'lpd', e.target.value)}
                                      onBlur={() => setEditingResult(null)}
                                    />
                                  ) : (
                                    res.lpd || '-'
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-8 flex justify-center">
                        <button 
                          onClick={() => setFile(null)}
                          className="text-[10px] font-mono uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2"
                        >
                          <Upload size={10} />
                          Process another report
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20 italic font-serif">
                      Waiting for file analysis...
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-4 right-6 pointer-events-none">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30 rotate-90 origin-right translate-x-full">
          DIALUX PDF PARSER // SYSTEM ACTIVE
        </div>
      </footer>
    </div>
  );
}

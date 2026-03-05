import { useState, useCallback } from 'react';
import { extractTextFromPDF } from './services/pdfService';
import { processDialuxReport, DialuxRoom, parseValueUnit } from './services/geminiService';
import { getApiKey, setApiKey, removeApiKey, hasApiKey } from './utils';
import { ProcessingStep } from './components/ProgressIndicator';
import { usePdfDocument } from './hooks/usePdfDocument';

import ApiKeyInput from './components/ApiKeyInput';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import PdfViewer from './components/PdfViewer';
import DataTable from './components/DataTable';

export default function App() {
  const [apiKeyReady, setApiKeyReady] = useState(hasApiKey());
  const [file, setFile] = useState<File | null>(null);
  const [rooms, setRooms] = useState<DialuxRoom[] | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState<{ message: string; type: 'pdf' | 'ai' | 'general' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());

  const { numPages, getPage } = usePdfDocument(file);

  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
    setApiKeyReady(true);
  }, []);

  const handleChangeApiKey = useCallback(() => {
    removeApiKey();
    setApiKeyReady(false);
  }, []);

  const handleFileDrop = useCallback(async (pdfFile: File) => {
    setFile(pdfFile);
    setRooms(null);
    setError(null);
    setCurrentPage(1);
    setProcessingStep('reading-pdf');

    try {
      let pages;
      try {
        pages = await extractTextFromPDF(pdfFile);
      } catch (pdfErr) {
        console.error('PDF Extraction Error:', pdfErr);
        setError({
          message: 'Could not read the PDF. The file might be corrupted or protected.',
          type: 'pdf'
        });
        setProcessingStep('error');
        return;
      }

      // Include page markers so Gemini can map data to page numbers
      const textWithPageMarkers = pages
        .map(p => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
        .join('\n\n');

      setProcessingStep('analyzing');

      try {
        const apiKey = getApiKey();
        if (!apiKey) {
          throw new Error('API key not found. Please configure your Gemini API key.');
        }
        const data = await processDialuxReport(textWithPageMarkers, apiKey);
        setRooms(data);
        setProcessingStep('done');
      } catch (aiErr: any) {
        console.error('AI Processing Error:', aiErr);
        setError({
          message: aiErr.message || 'The AI failed to extract structured data from this report.',
          type: 'ai'
        });
        setProcessingStep('error');
      }
    } catch (err) {
      console.error('General Processing Error:', err);
      setError({
        message: 'An unexpected error occurred while processing your file.',
        type: 'general'
      });
      setProcessingStep('error');
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (file) handleFileDrop(file);
  }, [file, handleFileDrop]);

  const handleReset = useCallback(() => {
    setFile(null);
    setRooms(null);
    setError(null);
    setProcessingStep('idle');
    setCurrentPage(1);
    setModifiedCells(new Set());
  }, []);

  const handleUpdateRoom = useCallback((roomIndex: number, field: keyof DialuxRoom, value: string) => {
    if (!rooms) return;
    const newRooms = [...rooms];
    newRooms[roomIndex] = { ...newRooms[roomIndex], [field]: value };
    setRooms(newRooms);
    setModifiedCells(prev => {
      const next = new Set(prev);
      next.add(`${roomIndex}:${field}`);
      return next;
    });
  }, [rooms]);

  const handleNavigateToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const exportToCSV = useCallback(() => {
    if (!rooms || rooms.length === 0) return;

    // Start with a BOM (Byte Order Mark) for proper UTF-8 handling in Excel
    let csvContent = "\uFEFF";

    // Updated header labels with standard ASCII characters for maximum compatibility
    csvContent += "Room Name,Lux Target,Lux Target Unit,Area,Area Unit,Lux Workplane,Lux WP Unit,LPD Space,LPD Space Unit,LPD Working Plane,LPD WP Unit\n";

    rooms.forEach(room => {
      // Helper to clean unit strings (e.g., m² -> m2)
      const cleanUnit = (unit: string) => unit.replace('m²', 'm2');

      const eTarget = parseValueUnit(room.eTarget);
      const aRoom = parseValueUnit(room.aRoom);
      const eWP = parseValueUnit(room.eWorkplane);
      const lpdS = parseValueUnit(room.lpdSpace);
      const lpdWP = parseValueUnit(room.lpdWorkingPlane);

      csvContent += [
        `"${room.roomName}"`,
        `"${eTarget.value}"`, `"${cleanUnit(eTarget.unit)}"`,
        `"${aRoom.value}"`, `"${cleanUnit(aRoom.unit)}"`,
        `"${eWP.value}"`, `"${cleanUnit(eWP.unit)}"`,
        `"${lpdS.value}"`, `"${cleanUnit(lpdS.unit)}"`,
        `"${lpdWP.value}"`, `"${cleanUnit(lpdWP.unit)}"`,
      ].join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Dialux_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms]);

  // Show API key input if no key configured
  if (!apiKeyReady) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <div className="min-h-screen bg-white text-[#141414] selection:bg-[#141414] selection:text-[#E4E3E0]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header
        rooms={rooms}
        onExportCSV={exportToCSV}
        onReset={handleReset}
      />

      <main className="px-4 py-3 mx-auto">
        {!file ? (
          <UploadZone onFileDrop={handleFileDrop} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-dashed divide-[#141414]/20 gap-0 h-[calc(100vh-52px)]">
            {/* Left: PDF Preview */}
            <div className="pr-4">
              <PdfViewer
                getPage={getPage}
                numPages={numPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>

            {/* Right: Extracted Data */}
            <div className="pl-4 overflow-hidden">
              <DataTable
                rooms={rooms}
                processingStep={processingStep}
                error={error}
                onRetry={handleRetry}
                onUpdateRoom={handleUpdateRoom}
                onNavigateToPage={handleNavigateToPage}
                modifiedCells={modifiedCells}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

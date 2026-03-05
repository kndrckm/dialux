import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

interface PdfViewerProps {
    getPage: (pageNo: number) => Promise<pdfjs.PDFPageProxy | null>;
    numPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export default function PdfViewer({ getPage, numPages, currentPage, onPageChange }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1.2);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const renderPage = async () => {
            if (!canvasRef.current) return;

            const page = await getPage(currentPage);
            if (!page) return;

            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                } as any).promise;
            }
        };

        renderPage();
    }, [getPage, currentPage, scale]);

    // Scroll-to-zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(prev => Math.max(0.3, Math.min(4, prev + delta)));
        }
    }, []);

    // Click-drag to pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only left click, ignore if clicking controls
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        const container = containerRef.current;
        if (container) {
            setScrollStart({ x: container.scrollLeft, y: container.scrollTop });
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        containerRef.current.scrollLeft = scrollStart.x - dx;
        containerRef.current.scrollTop = scrollStart.y - dy;
    }, [isDragging, dragStart, scrollStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetZoom = useCallback(() => setScale(1.2), []);

    return (
        <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye size={14} className="opacity-40" />
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">Original Reference</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => setScale(s => Math.max(0.3, s - 0.2))}
                            className="p-1 hover:bg-[#141414]/10 rounded"
                            title="Zoom out"
                        >
                            <ZoomOut size={12} className="opacity-50" />
                        </button>
                        <button
                            onClick={resetZoom}
                            className="px-1 text-[9px] font-mono opacity-40 hover:opacity-70"
                            title="Reset zoom"
                        >
                            {Math.round(scale * 100)}%
                        </button>
                        <button
                            onClick={() => setScale(s => Math.min(4, s + 0.2))}
                            className="p-1 hover:bg-[#141414]/10 rounded"
                            title="Zoom in"
                        >
                            <ZoomIn size={12} className="opacity-50" />
                        </button>
                    </div>
                    <div className="w-px h-4 bg-[#141414]/10" />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-1 hover:bg-[#141414]/10 rounded disabled:opacity-20"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-mono min-w-[50px] text-center">
                            {currentPage} / {numPages}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
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
                className="flex-1 overflow-auto select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="flex justify-center p-2 min-h-full">
                    <canvas
                        ref={canvasRef}
                        className="shadow-md origin-top pointer-events-none"
                    />
                </div>
            </div>
        </div>
    );
}

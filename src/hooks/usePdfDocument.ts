import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface UsePdfDocumentReturn {
    pdfDocument: pdfjs.PDFDocumentProxy | null;
    numPages: number;
    isLoading: boolean;
    error: string | null;
    getPage: (pageNo: number) => Promise<pdfjs.PDFPageProxy | null>;
}

export function usePdfDocument(file: File | null): UsePdfDocumentReturn {
    const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const documentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

    useEffect(() => {
        if (!file) {
            setPdfDocument(null);
            setNumPages(0);
            documentRef.current = null;
            return;
        }

        let cancelled = false;

        const loadDocument = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const doc = await loadingTask.promise;

                if (!cancelled) {
                    documentRef.current = doc;
                    setPdfDocument(doc);
                    setNumPages(doc.numPages);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load PDF');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadDocument();

        return () => {
            cancelled = true;
        };
    }, [file]);

    const getPage = useCallback(async (pageNo: number): Promise<pdfjs.PDFPageProxy | null> => {
        if (!documentRef.current) return null;
        try {
            return await documentRef.current.getPage(pageNo);
        } catch {
            return null;
        }
    }, []);

    return { pdfDocument, numPages, isLoading, error, getPage };
}

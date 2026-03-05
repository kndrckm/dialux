import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PDFPageData {
  pageNumber: number;
  text: string;
}

export async function extractTextFromPDF(file: File): Promise<PDFPageData[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('The uploaded file is empty.');
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    if (pdf.numPages === 0) {
      throw new Error('The PDF has no pages.');
    }

    const pages: PDFPageData[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      pages.push({
        pageNumber: i,
        text
      });
    }
    
    return pages;
  } catch (error: any) {
    console.error('PDF Extraction Service Error:', error);
    if (error.name === 'PasswordException') {
      throw new Error('This PDF is password protected and cannot be processed.');
    }
    if (error.name === 'InvalidPDFException') {
      throw new Error('The file is not a valid PDF or is corrupted.');
    }
    throw error;
  }
}

import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Document } from "langchain/document";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";

async function deletePages(
  pdfBuffer: Buffer,
  pageToDelete: number[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  let numToOffsetBy = 1;
  for (const pageNum of pageToDelete) {
    pdfDoc.removePage(pageNum - numToOffsetBy);
    numToOffsetBy++;
  }
  const pdfBytes = await pdfDoc.save();
  return await Buffer.from(pdfBytes);
}

async function loadPdfFromUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });
  return response.data;
}

async function convertPdfToDocuments(
  pdfBuffer: Buffer
): Promise<Array<Document>> {
  if (!process.env.UNSTRUCTURED_API_KEY) {
    throw new Error("Unstructured API key not found");
  }
  const randomName = Math.random().toString(36).substring(7);
  await writeFile(`pdfs/${randomName}.pdf`, pdfBuffer, "binary");
  const loader = new UnstructuredLoader(`pdfs/${randomName}.pdf`, {
    apiKey: process.env.UNSTRUCTURED_API_KEY,
    strategy: "high_res",
  });
  const documents = await loader.load();
  await unlink(`pdfs/${randomName}.pdf`);
  return documents;
}

async function main({
  paperUrl,
  name,
  pageToDelete,
}: {
  paperUrl: string;
  name: string;
  pageToDelete?: number[];
}) {
  if (!paperUrl.endsWith(".pdf")) {
    throw new Error("Not a PDF file");
  }
  let pdfAsBuffer = await loadPdfFromUrl(paperUrl);
  if (pageToDelete && pageToDelete.length > 0) {
    // To delete pages
    pdfAsBuffer = await deletePages(pdfAsBuffer, pageToDelete);
  }
  const documents = await convertPdfToDocuments(pdfAsBuffer);
  console.log(documents);
  console.log("length", documents.length);
}

main({
  paperUrl: "https://arxiv.org/pdf/2305.15334.pdf",
  name: "test",
});

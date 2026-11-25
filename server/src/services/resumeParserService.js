import path from 'node:path';
import yauzl from 'yauzl';

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCX_ARCHIVE_ENTRIES = 1000;
export const MAX_DOCX_UNCOMPRESSED_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_DOCX_ENTRY_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_DOCX_COMPRESSION_RATIO = 100;
const MIN_DOCX_RATIO_CHECK_BYTES = 1024 * 1024;

const EXPECTED_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
};

const PDF_HEADER = Buffer.from('%PDF-');
const DOC_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const CRC32_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return crc >>> 0;
});

function uploadError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function inspectDocxArchive(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, {
      lazyEntries: true,
      validateEntrySizes: true,
    }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(uploadError('The uploaded document could not be parsed.'));
        return;
      }

      let entryCount = 0;
      let totalUncompressedSize = 0;
      let settled = false;
      let activeStream;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        activeStream?.destroy();
        zipFile.close();
        reject(error);
      };

      zipFile.on('error', () => fail(uploadError('The uploaded document could not be parsed.')));
      zipFile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      zipFile.on('entry', (entry) => {
        entryCount += 1;
        if (entryCount > MAX_DOCX_ARCHIVE_ENTRIES
            || !Number.isSafeInteger(entry.uncompressedSize)
            || !Number.isSafeInteger(entry.compressedSize)
            || entry.uncompressedSize < 0
            || entry.compressedSize < 0
            || entry.uncompressedSize > MAX_DOCX_ENTRY_SIZE_BYTES) {
          fail(uploadError('The DOCX archive exceeds supported processing limits.', 413));
          return;
        }

        totalUncompressedSize += entry.uncompressedSize;
        if (!Number.isSafeInteger(totalUncompressedSize)
            || totalUncompressedSize > MAX_DOCX_UNCOMPRESSED_SIZE_BYTES) {
          fail(uploadError('The DOCX archive exceeds supported processing limits.', 413));
          return;
        }

        if (entry.generalPurposeBitFlag & 0x1) {
          fail(uploadError('The uploaded document could not be parsed.'));
          return;
        }

        if (entry.uncompressedSize >= MIN_DOCX_RATIO_CHECK_BYTES
            && (entry.compressedSize === 0
              || entry.uncompressedSize / entry.compressedSize > MAX_DOCX_COMPRESSION_RATIO)) {
          fail(uploadError('The DOCX archive exceeds supported processing limits.', 413));
          return;
        }

        try {
          zipFile.openReadStream(entry, {
            decompress: entry.isCompressed() ? true : null,
          }, (streamError, stream) => {
            if (streamError || !stream) {
              fail(uploadError('The uploaded document could not be parsed.'));
              return;
            }
            activeStream = stream;
            let entrySize = 0;
            let crc = 0xffffffff;
            stream.once('error', () => fail(uploadError('The uploaded document could not be parsed.')));
            stream.on('data', (chunk) => {
              entrySize += chunk.length;
              if (entrySize > entry.uncompressedSize
                  || entrySize > MAX_DOCX_ENTRY_SIZE_BYTES
                  || totalUncompressedSize - entry.uncompressedSize + entrySize > MAX_DOCX_UNCOMPRESSED_SIZE_BYTES) {
                fail(uploadError('The DOCX archive exceeds supported processing limits.', 413));
                return;
              }
              for (const byte of chunk) {
                crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
              }
            });
            stream.once('end', () => {
              if (settled) return;
              if (entrySize !== entry.uncompressedSize || ((crc ^ 0xffffffff) >>> 0) !== entry.crc32) {
                fail(uploadError('The uploaded document could not be parsed.'));
                return;
              }
              activeStream = undefined;
              zipFile.readEntry();
            });
          });
        } catch {
          fail(uploadError('The uploaded document could not be parsed.'));
        }
      });
      zipFile.readEntry();
    });
  });
}

function detectContentType(buffer) {
  const pdfSearchEnd = Math.min(buffer.length, 1024);
  if (buffer.subarray(0, pdfSearchEnd).indexOf(PDF_HEADER) !== -1) {
    return 'application/pdf';
  }
  if (buffer.subarray(0, DOC_HEADER.length).equals(DOC_HEADER)) {
    return 'application/msword';
  }
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b
      && [0x03, 0x05, 0x07].includes(buffer[2]) && [0x04, 0x06, 0x08].includes(buffer[3])) {
    return 'application/zip';
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    if (!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      return 'text/plain';
    }
  } catch {
    return 'application/octet-stream';
  }
  return 'application/octet-stream';
}

function safeFileName(originalName) {
  if (typeof originalName !== 'string') {
    return 'resume';
  }
  return path.posix.basename(originalName.replaceAll('\\', '/')) || 'resume';
}

async function extractPdf(buffer) {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer) {
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default ?? mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractDoc(buffer) {
  const wordExtractorModule = await import('word-extractor');
  const WordExtractor = wordExtractorModule.default ?? wordExtractorModule;
  const document = await new WordExtractor().extract(buffer);
  return document.getBody();
}

export function createResumeParserService({
  extractors = { pdf: extractPdf, docx: extractDocx, doc: extractDoc },
} = {}) {
  return {
    async extractText(file) {
      if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        throw uploadError('Uploaded file is empty or missing.');
      }
      if (file.buffer.length > MAX_RESUME_SIZE_BYTES) {
        throw uploadError('Uploaded file exceeds the 10 MB size limit.', 413);
      }

      const fileName = safeFileName(file.originalname);
      const extension = path.posix.extname(fileName).toLowerCase();
      const expectedType = EXPECTED_TYPES[extension];
      if (!expectedType) {
        throw uploadError('Invalid file format. Only PDF, DOCX, DOC, and TXT files are supported.');
      }

      const detectedType = detectContentType(file.buffer);
      const isDocxArchive = extension === '.docx' && detectedType === 'application/zip';
      if (detectedType !== expectedType && !isDocxArchive) {
        throw uploadError('The uploaded file content does not match its file extension.');
      }

      let extractedText;
      try {
        if (extension === '.docx') {
          await inspectDocxArchive(file.buffer);
        }
        if (extension === '.txt') {
          extractedText = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
        } else {
          extractedText = await extractors[extension.slice(1)](file.buffer);
        }
      } catch (error) {
        if (error?.status === 413) throw error;
        throw uploadError('The uploaded document could not be parsed.');
      }

      const text = typeof extractedText === 'string' ? extractedText.trim() : '';
      if (!text) {
        throw uploadError('Could not extract any text from the provided document.');
      }

      return {
        text,
        fileName,
        fileType: file.mimetype || expectedType,
      };
    },
  };
}
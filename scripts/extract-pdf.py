"""Extract text from a PDF file using pdfplumber. Outputs JSON to stdout."""
import sys
import json
import pdfplumber

def main():
    path = sys.argv[1]
    with pdfplumber.open(path) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        result = {
            "text": "\n".join(pages),
            "pageCount": len(pdf.pages)
        }
        print(json.dumps(result))

if __name__ == "__main__":
    main()

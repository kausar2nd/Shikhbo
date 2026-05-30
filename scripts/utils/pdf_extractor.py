import os
import re
import fitz  # Requires: pip install PyMuPDF


def extract_text_from_pdf_stream(pdf_stream):
    """
    Extracts and cleans text from a PDF file stream (e.g., from Flask request.files).
    """
    try:
        # fitz.open(stream=..., filetype="pdf") allows reading from memory
        doc = fitz.open(stream=pdf_stream.read(), filetype="pdf")
    except Exception as e:
        print(f"❌ Error: Could not open the PDF stream. ({e})")
        return None

    full_text = "\n".join(page.get_text("text") for page in doc)
    doc.close()

    # Cleaning text
    full_text = re.sub(r"(?m)^\s*\d+\s*$", "", full_text)
    full_text = re.sub(r"\s+", " ", full_text)
    full_text = re.sub(r"\s+।", "।", full_text)
    full_text = re.sub(r"\s+,", ",", full_text)

    clean_text = full_text.strip()
    return clean_text

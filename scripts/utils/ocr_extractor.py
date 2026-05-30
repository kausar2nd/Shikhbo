import os
import tempfile
import uuid
from paddleocr import PaddleOCR

try:
    ocr = PaddleOCR(use_textline_orientation=False, lang="en")
except Exception as e:
    print(f"Warning: Failed to initialize PaddleOCR: {e}")
    ocr = None


def extract_text_with_ocr(file_obj):
    if ocr is None:
        return "OCR is not initialized properly."

    temp_dir = tempfile.gettempdir()
    filename = file_obj.filename if file_obj.filename else "temp_uploaded_file"
    ext = os.path.splitext(filename)[1]
    temp_path = os.path.join(temp_dir, f"ocr_temp_{uuid.uuid4().hex}{ext}")

    extracted_text = []

    try:
        file_obj.save(temp_path)

        results = ocr.predict(temp_path)

        if results:
            for res in results:
                # Check for the correct key 'rec_texts'
                if res and "rec_texts" in res:
                    for text in res["rec_texts"]:
                        if text:
                            extracted_text.append(text)

        if not extracted_text:
            return "No text detected."

        return "\n".join(extracted_text).strip()

    except Exception as e:
        print(f"❌ Error during OCR extraction: {e}")
        return None

    finally:
        # Cleanup
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file '{temp_path}': {e}")

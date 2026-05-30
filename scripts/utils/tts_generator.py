import os
import wave
import io

try:
    from piper import PiperVoice
except ImportError:
    PiperVoice = None

MODEL_PATH = os.path.join(os.getcwd(), "models", "tts", "en_US-lessac-medium.onnx")
voice = None

if PiperVoice and os.path.exists(MODEL_PATH):
    try:
        voice = PiperVoice.load(MODEL_PATH)
    except Exception as e:
        print(f"Warning: Failed to load PiperVoice: {e}")
else:
    print("Warning: piper package not installed or ONNX model not found.")


def generate_audio(text):
    if not voice:
        return None
    # Piper synthesize_wav requires a file-like object to write a WAV stream.
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        voice.synthesize_wav(text, wav_file)

    buf.seek(0)
    return buf

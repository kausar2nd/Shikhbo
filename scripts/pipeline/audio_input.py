from faster_whisper import WhisperModel
from banglaspeech2text import Speech2Text


class Transcriber:
    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
    ):
        self.model_size = model_size
        self.device = device

    def transcribe(self, audio_file: str, lang: str):
        if lang == "en":
            model = WhisperModel("base", device="cpu")
            segments, info = model.transcribe(audio_file, beam_size=5)
            text = ""
            for segment in segments:
                text += segment.text
            return text.strip()

        if lang == "bn":
            stt = Speech2Text("base")
            transcription = stt.recognize(audio_file)
            return transcription.strip()


if __name__ == "__main__":
    lang = "en"
    # lang = "bn"
    audio_file = "b.wav"
    transcriber = Transcriber()
    transcriber.transcribe(audio_file, lang)

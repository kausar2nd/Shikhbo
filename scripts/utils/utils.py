from langdetect import detect, DetectorFactory


def get_language(query: str) -> str:
    DetectorFactory.seed = 0
    lang = detect(query)
    if lang == "en":
        return "English"
    elif lang == "bn":
        return "বাংলা"
    else:
        return "unknown"

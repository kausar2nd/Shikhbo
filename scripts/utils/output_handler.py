class OutputHandler:
    def deliver(self, answer: str, mode: str = "text") -> None:
        if mode == "text":
            print(answer)

        elif mode == "tts":
            print(f"[TTS Triggered in Terminal... Audio would play for: {answer}]")

        else:
            raise ValueError(f"Unknown output mode: '{mode}'. Use 'text' or 'tts'.")

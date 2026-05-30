class InputHandler:

    def process(self, raw_input) -> str:
        if isinstance(raw_input, str):
            return raw_input.strip()

        raise NotImplementedError(
            f"InputHandler stub received unsupported type: {type(raw_input)}. "
            "Please provide string text."
        )

    def get_input(self) -> str:

        raw_input = input("Enter your query: ")
        return self.process(raw_input)

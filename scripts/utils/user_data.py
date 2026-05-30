import json

class UserData:
    """
    Simulates user data retrieval. In a real application, this would interface
    with a database or user management system.
    """
    def __init__(self):
        # Simulated user data
        self.data = {
            "user_id": "12345",
            "name": "Alice",
            "class_level": "Grade 10",
            "subjects": ["Biology", "Chemistry"],
            "curriculum": "Cambridge IGCSE",
            "preferred_mode": "simple"
        }
    
    def get_user(self, key: str):

        # reurn a json object containing all user data
        return json.dumps(self.data)
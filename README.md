# শিখবো (Shikhbo) - AI Educational Assistant

Shikhbo is an intelligent, multi-modal educational chatbot designed to help students with their studies. It provides tailored guidance based on the student's curriculum, class, and subject, featuring advanced capabilities like Voice interactions (Speech-To-Text and Text-To-Speech) and optical character recognition (OCR) for PDFs and images.

## 🚀 Features

- **Personalized Learning**: Customizes responses based on the user's Grade, Curriculum (National/Cambridge/IB), and Subject.
- **Multimodal Inputs**:
  - **Text Chat**: Standard chat interface.
  - **Audio (Speech-To-Text)**: Speak your questions directly through your microphone.
  - **File Analysis (OCR)**: Upload PDFs and Images. The system will use PaddleOCR to extract text and consider it alongside your prompt.
- **Audio Answers (Text-To-Speech)**: Features an integrated TTS engine using Piper, allowing Shikhbo to read answers aloud seamlessly.
- **Streaming Responses**: Smooth, real-time typing effect powered by Ollama integration under the hood.
- **Multi-lingual**: Fully supports Bengali and English UI/responses securely.

## 🛠️ Stack Architecture

- **Backend Framework**: Python (Flask)
- **Database**: MySQL (for user profiles and auth)
- **LLM Engine**: Ollama, using LangChain for RAG pipelines.
- **Information Retrieval**: FAISS & rank-bm25 (Dense & Sparse Hybrid Search).
- **Computer Vision**: PaddleOCR for robust text extraction.
- **Speech Capabilities**:
  - **TTS**: [Piper](https://github.com/rhasspy/piper) ONNX framework.
  - **STT**: Underlying Whisper/Wav2Vec integrations via Transcriber.
- **Frontend**: Vanilla Javascript, HTML, and CSS using modern UI paradigms.

---

## 📦 Setup & Installation

### 1. Prerequisites

Ensure you have the following installed on your machine:

- Python 3.10+
- MySQL Server
- [Ollama](https://ollama.com/) (Ensure your base LLM, e.g., llama3 or custom model is pulled)

### 2. Clone the Repository

```bash
git clone <your-repository-url>
cd Shikhbo
```

### 3. Install Dependencies

Install all the required Python libraries using `pip`:

```bash
pip install -r requirements.txt
```

### 4. Database Setup

Make sure your MySQL database is initialized:

1. Create a database named `sikhbo`.
2. Inside `sikhbo`, ensure there is a `students` table:

   ```sql
   CREATE TABLE students (
       uid INT AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(255),
       email VARCHAR(255) UNIQUE,
       password VARCHAR(255),
       class VARCHAR(50),
       curriculum VARCHAR(50)
   );
   ```

*(Modify the `DB_CONFIG` inside `app.py` if your database uses a custom password/username)*

### 5. Download Piper TTS Model

1. Obtain the `en_US-lessac-medium.onnx` model (and its `.json` configuration file) from Piper's official releases.
2. Place both files in the structure:
   `Shikhbo/models/tts/en_US-lessac-medium.onnx`

### 6. Run the Application

```bash
python app.py
```

Open your browser and navigate to `http://localhost:5000`.

---

## 📂 Project Structure

```bash
Shikhbo/
├── app.py                      
├── requirements.txt            
├── models/
│   └── tts/                    
├── knowledge_base/             
├── raw_data/                   
├── scripts/
│   ├── pipeline/              
│   └── utils/                  
├── static/
│   ├── css/                    
│   └── js/                     
└── templates/                  
```

## 📝 Notes

- **File Uploads**: The OCR module handles PDF & Images silently securely discarding them post-transaction. Images with text will be seamlessly interpreted.
- **RAG Generation**: Data pipelines dynamically load `.faiss` vector stores mapping relevant knowledge bases to the user queries.

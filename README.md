# শিখবো (Shikhbo) - AI Educational Assistant

Shikhbo is an intelligent, multi-modal educational chatbot designed to help students with their studies. It provides tailored guidance based on the student's curriculum, class, and subject, featuring advanced capabilities like Voice interactions (Speech-To-Text and Text-To-Speech) and optical character recognition (OCR) for PDFs and images.

## 🚀 Features

- **Personalized Learning**: Customizes responses based on the user's Grade, Curriculum (National/Cambridge/IB), and Subject.
- **Multimodal Inputs**:
  - **Text Chat**: Standard chat interface.
  - **Audio (Speech-To-Text)**: Speak your questions directly through your microphone.
  - **File Analysis (OCR)**: Upload PDFs and Images. The system uses **PaddleOCR** to extract text and consider it alongside your prompt.
- **Audio Answers (Text-To-Speech)**: Features an integrated TTS engine using **Piper TTS** (`en_US-lessac-medium.onnx`), allowing Shikhbo to read answers aloud seamlessly.
- **Advanced RAG Pipeline**: Intelligent document retrieval utilizing:
  - **Dense Search**: **FAISS** vector store powered by `BAAI/bge-m3` embedding model.
  - **Sparse Search**: **BM25** (BM25Okapi) lexical search.
  - **Hybrid Search**: Fuses dense & sparse outputs utilizing **Reciprocal Rank Fusion (RRF)**.
  - **Reranking**: **FlagReranker** (`BAAI/bge-reranker-v2-m3`) guarantees that the most contextually relevant resources are prioritized correctly.
- **LLM Response Generation**: Streaming response formulation with the **Gemma 2 (2B)** (`gemma2:2b`) model running under the hood with Ollama, enabling an ultra-fast smooth typing effect.
- **Multi-lingual**: Fully supports Bengali and English UI/responses securely.

## 🛠️ Stack Architecture

- **Backend Framework**: Python (Flask)
- **Database**: MySQL (for user profiles and auth)
- **LLM Engine**: **Ollama** running `gemma2:2b`, alongside **LangChain** for robust integration.
- **Information Retrieval**: Hybrid structure utilizing **FAISS** & **rank-bm25**, supplemented by **FlagEmbedding** models (`BAAI/bge-m3`, `BAAI/bge-reranker-v2-m3`).
- **Computer Vision**: **PaddleOCR** for robust text extraction.
- **Speech Capabilities**:
  - **TTS**: [Piper](https://github.com/rhasspy/piper) ONNX framework (`en_US-lessac-medium.onnx` local inferencing).
  - **STT**: Underlying Whisper/Wav2Vec integrations via Transcriber/Browser WebSpeech integrations.
- **Frontend**: Vanilla Javascript, HTML, and CSS using modern UI paradigms.

---

## 📦 Setup & Installation

### 1. Prerequisites

Ensure you have the following installed on your machine:

- Python 3.10+
- MySQL Server
- [Ollama](https://ollama.com/) (Ensure `gemma2:2b` is pulled: `ollama run gemma2:2b`)

### 2. Clone the Repository

```bash
git clone https://github.com/kausar2nd/Shikhbo.git
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

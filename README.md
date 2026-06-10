# শিখবো (Shikhbo) — AI Educational Assistant

Shikhbo is an intelligent educational chatbot designed to help students with their studies. It provides tailored guidance based on the student's curriculum, class, and subject, featuring advanced capabilities like voice interactions (browser-based STT and TTS) and an intelligent RAG (Retrieval-Augmented Generation) pipeline.

## 🚀 Features

- **Personalized Learning**: Customizes responses based on the user's Grade, Curriculum (National/Cambridge/IB), and Subject.
- **Multimodal Inputs**:
  - **Text Chat**: Standard chat interface.
  - **Voice Input (Speech-To-Text)**: Speak your questions directly through your microphone using browser-native `SpeechRecognition` API.
  - **File Upload**: Attach images (PNG, JPG, WebP, GIF) or documents (PDF, TXT) for the AI to analyze.
- **Audio Answers (Text-To-Speech)**: Uses browser-based Speech Synthesis (Web Speech API) for quick playback.
- **Advanced RAG Pipeline**: Intelligent document retrieval utilizing:
  - **Dense Search**: **FAISS** vector store powered by `BAAI/bge-m3` embedding model (via HuggingFace Inference API).
  - **Sparse Search**: **BM25** (BM25Okapi) lexical search.
  - **Hybrid Search**: Fuses dense & sparse outputs utilizing **Reciprocal Rank Fusion (RRF)**.
- **LLM Response Generation**: Streaming response generation via Google Generative AI API using **Gemma 4 31B IT** model.
- **Multi-lingual**: Fully supports Bengali and English UI/responses.
- **Multiple Teaching Modes**: Normal, Simple, Quiz, and Step-by-Step explanation modes.

## 🛠️ Tech Stack

| Layer              | Technology                                                   |
| ------------------ | ------------------------------------------------------------ |
| **Backend**        | Python (Flask), deployed on **Vercel** (serverless)          |
| **Database**       | PostgreSQL via **NeonDB** (user auth & profiles)             |
| **Auth**           | Session-based authentication with bcrypt password hashing    |
| **LLM Engine**     | Google Generative AI API (`gemma-4-31b-it`)                  |
| **Embeddings**     | HuggingFace Inference API (`BAAI/bge-m3`)                   |
| **Retrieval**      | Hybrid — **FAISS** (dense) + **BM25** (sparse) + RRF fusion |
| **TTS**            | Browser Speech Synthesis (Web Speech API)                    |
| **STT**            | Browser Speech Recognition (Web Speech API)                  |
| **Frontend**       | Vanilla JavaScript, HTML, and CSS                            |

---

## 📦 Setup & Installation

### 1. Prerequisites

- **Python 3.10+**
- **Git**
- A **Google Generative AI (Gemini) API key** — [Get one here](https://aistudio.google.com/apikey)
- A **HuggingFace Access Token** — [Get one here](https://huggingface.co/settings/tokens)
- A **PostgreSQL database** (e.g., [NeonDB](https://neon.tech/) free tier)

### 2. Clone the Repository

```bash
git clone https://github.com/kausar2nd/Shikhbo.git
cd Shikhbo
```

### 3. Create a Virtual Environment (Recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# Flask session encryption key — use any random string
SECRET_KEY=your_flask_secret_key_here

# PostgreSQL connection string (NeonDB or any Postgres provider)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Google Generative AI API key (for Gemma-4 31B IT model)
GEMINI_API_KEY=your_gemini_api_key_here

# HuggingFace Access Token (for embeddings)
HF_ACCESS_TOKEN=your_hf_access_token_here
```

### 6. Set Up the Database

Create a `students` table in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS students (
    uid SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    class VARCHAR(50),
    curriculum VARCHAR(100)
);
```

### 7. Set Up the Knowledge Base

Place your JSONL data files in the `raw_data/` directory, then run:

```bash
python -m scripts.nb_creation.create_nb
```

This will generate the FAISS index files in `knowledge_base/`.

### 8. Run the Application

```bash
python app.py
```

Open your browser and navigate to **<http://localhost:5000>**.

### 9. Deploy to Vercel (Optional)

```bash
vercel --prod
```

Make sure to configure the same environment variables (`SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, `HF_ACCESS_TOKEN`) in your Vercel project settings under **Settings → Environment Variables**.

---

## 📂 Project Structure

```bash
Shikhbo/
├── app.py                        # Flask app (API routes + page routes)
├── requirements.txt              # Python dependencies
├── vercel.json                   # Vercel deployment config
├── .env.example                  # Environment variable template
├── .gitignore
│
├── knowledge_base/               # FAISS index files (generated, gitignored)
│   ├── index.faiss
│   └── index.pkl
│
├── raw_data/                     # Source JSONL data files (gitignored)
│   └── *.jsonl
│
├── uploads/                      # Temporary file uploads (gitignored)
│
├── scripts/
│   ├── db.py                     # Database operations (NeonDB/Postgres)
│   ├── pipeline/
│   │   ├── pipeline.py           # Main RAG pipeline orchestrator
│   │   ├── generator.py          # Google Gemini API streaming generator
│   │   └── retriever.py          # Hybrid retriever (FAISS + BM25 + RRF)
│   ├── utils/
│   │   ├── prompts.py            # Prompt templates by mode
│   │   ├── context_builder.py    # Document context formatter
│   │   └── utils.py              # Language detection
│   └── nb_creation/
│       └── create_nb.py          # Knowledge base builder (offline tool)
│
├── static/
│   ├── css/
│   │   ├── chat.css              # Chat page styles (dark theme)
│   │   └── landing.css           # Landing page styles
│   └── js/
│       ├── chat.js               # Chat logic, STT/TTS, file upload
│       ├── landing.js            # Login/signup handler
│       └── lang.js               # Bengali/English language toggle
│
└── templates/
    ├── index.html                # Landing/login page
    └── chat.html                 # Chat interface
```

---

## 📝 Notes

- **Authentication**: Real user registration & login with bcrypt-hashed passwords stored in PostgreSQL.
- **Speech Input**: Uses browser-native `SpeechRecognition` API (best supported in Chrome/Edge).
- **Speech Output**: Uses browser-native `SpeechSynthesis` API.
- **RAG Pipeline**: Dense → Sparse → Hybrid Fusion (RRF) → Top-K.
- **File Upload**: Supports images and documents up to 20 MB. Files are uploaded to the Gemini API for analysis, then cleaned up automatically.
- **Dark Theme Only**: The app uses a single dark theme for a consistent experience.

## 📄 License

This project is for educational purposes.

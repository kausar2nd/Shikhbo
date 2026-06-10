import os
from dotenv import load_dotenv

load_dotenv()

from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    session,
    redirect,
    url_for,
    Response,
    stream_with_context,
)
from flask_cors import CORS
import json
from functools import wraps
from werkzeug.utils import secure_filename
from scripts.db import create_user, authenticate_user, update_user_profile
from scripts.pipeline.pipeline import run_pipeline_stream

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "edubot_secret_key_2024")
CORS(app)

# ─── File upload config
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "pdf", "txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated


# ─── Page Routes
@app.route("/")
def index():
    if "user" in session:
        return redirect(url_for("chat_route"))
    return render_template("index.html")


@app.route("/chat")
def chat_route():
    if "user" not in session:
        return redirect(url_for("index"))
    return render_template("chat.html")


@app.route("/api/me", methods=["GET"])
@login_required
def get_me():
    return jsonify({"user": session.get("user")})


# ─── Auth: Login
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required."}), 400

    user = authenticate_user(email, password)
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    session["user"] = user
    return jsonify({"message": "Login successful.", "user": user}), 200


# ─── Auth: Sign Up
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    class_ = data.get("class", "").strip()
    curriculum = data.get("curriculum", "").strip()

    if not all([name, email, password, class_, curriculum]):
        return jsonify({"error": "All fields are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    user = create_user(name, email, password, class_, curriculum)
    if user is None:
        return jsonify({"error": "An account with this email already exists."}), 409

    session["user"] = user
    return jsonify({"message": "Account created successfully.", "user": user}), 201


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out."}), 200


# ─── Profile Update (persists to NeonDB)
@app.route("/api/update_profile", methods=["POST"])
@login_required
def update_profile_route():
    data = request.get_json()
    user = session["user"]

    name = data.get("name", "").strip() or user["name"]
    class_ = data.get("class", "").strip() or user["class"]
    curriculum = data.get("curriculum", "").strip() or user["curriculum"]

    updated_user = update_user_profile(user["uid"], name, class_, curriculum)
    if not updated_user:
        return jsonify({"error": "Failed to update profile."}), 500

    session["user"] = updated_user
    session.modified = True

    return (
        jsonify({"message": "Profile updated successfully.", "user": updated_user}),
        200,
    )


# ─── Chat API (supports both JSON and multipart/form-data with file upload)
@app.route("/api/query", methods=["POST"])
@login_required
def query():
    user = session.get("user")
    file_path = None

    # Determine if this is a multipart form (file upload) or JSON request
    if request.content_type and "multipart/form-data" in request.content_type:
        # Multipart: extract fields from form data
        try:
            messages = json.loads(request.form.get("messages", "[]"))
        except (json.JSONDecodeError, TypeError):
            messages = []

        subject = request.form.get("subject", "")
        mode = request.form.get("mode", "normal")
        latest_query = request.form.get("query", "").strip()

        if not messages and not latest_query:
            return jsonify({"error": "Query or messages are required."}), 400

        if not messages and latest_query:
            messages = [{"role": "user", "content": latest_query}]

        if not latest_query and messages:
            latest_query = messages[-1].get("content", "")

        # Handle file upload
        uploaded_file = request.files.get("file")
        if uploaded_file and uploaded_file.filename:
            if not allowed_file(uploaded_file.filename):
                return (
                    jsonify(
                        {
                            "error": f"File type not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
                        }
                    ),
                    400,
                )

            filename = secure_filename(uploaded_file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            uploaded_file.save(file_path)

    else:
        # JSON request (no file)
        data = request.get_json()
        messages = data.get("messages", [])
        subject = data.get("subject", "")
        mode = data.get("mode", "normal")

        if not messages:
            latest_query = data.get("query", "").strip()
            if not latest_query:
                return jsonify({"error": "Query or messages are required."}), 400
            messages = [{"role": "user", "content": latest_query}]

        latest_query = messages[-1]["content"] if messages else ""

    user_json = {
        "uid": user["uid"],
        "name": user["name"],
        "class_level": user["class"],
        "curriculum": user["curriculum"],
        "subject": subject,
        "mode": mode,
        "query": latest_query,
        "messages": messages,
        "file_path": file_path,
    }

    def generate():
        try:
            for payload in run_pipeline_stream(user_json):
                yield json.dumps(payload) + "\n"
        except Exception as e:
            yield json.dumps({"chunk": f"\n[Error: {str(e)}]"}) + "\n"
        finally:
            # Clean up uploaded file after processing
            if file_path and os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

    return Response(stream_with_context(generate()), mimetype="application/x-ndjson")


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")

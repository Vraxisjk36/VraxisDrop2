import os
import sqlite3
import secrets
import hashlib
import time
from pathlib import Path
from flask import Flask, request, render_template, redirect, url_for, abort, send_file
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
data = Path(os.environ.get("VRAXIS_DATA", "data")).resolve()
data.mkdir(parents=True, exist_ok=True)
(data / "files").mkdir(exist_ok=True)
db_path = data / "drops.db"
alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def connect():
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    return db

with connect() as db:
    db.execute("CREATE TABLE IF NOT EXISTS drops (code_hash TEXT PRIMARY KEY, kind TEXT NOT NULL, body TEXT, filename TEXT, storage TEXT, expires INTEGER NOT NULL)")

def digest(code):
    return hashlib.sha256(code.encode()).hexdigest()

def purge():
    with connect() as db:
        old = db.execute("SELECT storage FROM drops WHERE expires <= ?", (int(time.time()),)).fetchall()
        db.execute("DELETE FROM drops WHERE expires <= ?", (int(time.time()),))
    for row in old:
        if row["storage"]:
            Path(row["storage"]).unlink(missing_ok=True)

@app.get("/")
def home():
    return render_template("index.html")

@app.post("/drop")
def drop():
    purge()
    hours = 24 if request.form.get("expiry") == "24h" else 1
    file = request.files.get("file")
    body = request.form.get("content", "").strip()
    if file and file.filename:
        kind = "file"
        filename = secure_filename(file.filename)[:180] or "download"
    elif body and len(body.encode()) <= 100000:
        kind, filename = "text", None
    else:
        abort(400, "Enter text or select a file.")
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    path = None
    if kind == "file":
        path = str(data / "files" / secrets.token_hex(16))
        file.save(path)
    with connect() as db:
        db.execute("INSERT INTO drops VALUES (?,?,?,?,?,?)", (digest(code), kind, body if kind == "text" else None, filename, path, int(time.time()) + hours * 3600))
    return render_template("success.html", code=code, link=url_for("retrieve", code=code, _external=True))

@app.get("/retrieve")
def retrieve():
    return render_template("retrieve.html", code=request.args.get("code", ""))

@app.post("/pickup")
def pickup():
    purge()
    code = request.form.get("code", "").replace("-", "").replace(" ", "").upper()
    if len(code) != 8 or any(c not in alphabet for c in code):
        abort(404, "Invalid or expired code")
    with connect() as db:
        row = db.execute("SELECT * FROM drops WHERE code_hash=?", (digest(code),)).fetchone()
        if not row:
            abort(404, "Invalid or expired code")
        db.execute("DELETE FROM drops WHERE code_hash=?", (digest(code),))
    if row["kind"] == "text":
        return render_template("result.html", content=row["body"])
    path = Path(row["storage"])
    response = send_file(path, as_attachment=True, download_name=row["filename"])
    response.call_on_close(lambda: path.unlink(missing_ok=True))
    return response

if __name__ == "__main__":
    app.run(debug=True)

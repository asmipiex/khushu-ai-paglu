"""
Khushi AI Paglu - Local Development Server
Serves static files + handles API endpoints
(Replaces PHP backend for local testing)

Usage:
    python serve.py              -> runs on port 1111
    python serve.py 8080         -> runs on port 8080
"""

import http.server
import json
import os
import sys
import uuid
import urllib.parse
import io
import webbrowser
import threading
import re
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# -- Config --
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1111
BASE_DIR = Path(__file__).parent.resolve()
DATA_FILE = BASE_DIR / "data" / "messages.json"
MD_LOG = BASE_DIR / "memories" / "khushi.ani.md"

# -- Ensure directories & files exist --
(BASE_DIR / "data").mkdir(exist_ok=True)
(BASE_DIR / "memories" / "pics").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "memories" / "vids").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "memories" / "audios").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "music").mkdir(parents=True, exist_ok=True)

if not DATA_FILE.exists():
    DATA_FILE.write_text(json.dumps({"messages": []}, indent=2), encoding="utf-8")

if not MD_LOG.exists():
    MD_LOG.write_text("# Khushi & Anirudh - Chat Memories\n\n---\n\n", encoding="utf-8")


def load_messages():
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        return data.get("messages", [])
    except Exception:
        return []


def save_messages(messages):
    DATA_FILE.write_text(
        json.dumps({"messages": messages}, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


def generate_id():
    return f"{uuid.uuid4().hex[:16]}_{int(datetime.now().timestamp())}"


def append_md_log(sender, content, media_path=None, msg_type="text"):
    sender_name = "Khushi" if sender == "khushi" else "Anirudh"
    dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"**{sender_name}** - _{dt}_\n"
    if content:
        entry += f"> {content}\n"
    if media_path:
        entry += f"> [{msg_type}]({media_path})\n"
    entry += "\n"
    with open(MD_LOG, "a", encoding="utf-8") as f:
        f.write(entry)


def parse_multipart(rfile, content_type, content_length):
    """Parse multipart/form-data manually without cgi module."""
    # Read all data
    data = rfile.read(content_length)

    # Extract boundary from content type
    boundary_match = re.search(r'boundary=(.+?)(?:;|$)', content_type)
    if not boundary_match:
        return {}, {}

    boundary = boundary_match.group(1).strip()
    if boundary.startswith('"') and boundary.endswith('"'):
        boundary = boundary[1:-1]

    boundary_bytes = boundary.encode("utf-8")
    delimiter = b"--" + boundary_bytes
    end_delimiter = delimiter + b"--"

    fields = {}
    files = {}

    # Split by boundary
    parts = data.split(delimiter)
    for part in parts:
        part = part.strip(b"\r\n")
        if not part or part == b"--" or part == b"--\r\n":
            continue

        # Split headers from body
        if b"\r\n\r\n" in part:
            header_data, body = part.split(b"\r\n\r\n", 1)
        elif b"\n\n" in part:
            header_data, body = part.split(b"\n\n", 1)
        else:
            continue

        # Remove trailing boundary markers
        if body.endswith(b"\r\n"):
            body = body[:-2]
        if body.endswith(b"--"):
            body = body[:-2]
            if body.endswith(b"\r\n"):
                body = body[:-2]

        header_text = header_data.decode("utf-8", errors="replace")

        # Extract name
        name_match = re.search(r'name="([^"]*)"', header_text)
        if not name_match:
            continue
        name = name_match.group(1)

        # Check if it's a file
        filename_match = re.search(r'filename="([^"]*)"', header_text)
        if filename_match:
            filename = filename_match.group(1)
            if filename:
                # Get content type
                ct_match = re.search(r'Content-Type:\s*(.+?)(?:\r?\n|$)', header_text, re.IGNORECASE)
                file_ct = ct_match.group(1).strip() if ct_match else "application/octet-stream"
                files[name] = {
                    "filename": filename,
                    "data": body,
                    "content_type": file_ct
                }
            else:
                fields[name] = body.decode("utf-8", errors="replace")
        else:
            fields[name] = body.decode("utf-8", errors="replace")

    return fields, files


class KAPHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves static files AND handles API routes."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API Routes
        if path == "/api/chat.php":
            self.handle_chat_get(parsed)
        elif path == "/api/auth.php":
            self.handle_auth_get(parsed)
        elif path == "/api/music.php":
            self.handle_music_get()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/chat.php":
            self.handle_chat_post()
        elif path == "/api/auth.php":
            self.handle_auth_post()
        elif path == "/api/upload.php":
            self.handle_upload_post()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_post_data(self):
        """Parse POST data (multipart or url-encoded)."""
        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", 0))

        if "multipart/form-data" in content_type:
            return parse_multipart(self.rfile, content_type, content_length)
        elif "application/json" in content_type:
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                fields = json.loads(body)
            except Exception:
                fields = {}
            return fields, {}
        else:
            body = self.rfile.read(content_length).decode("utf-8")
            fields = dict(urllib.parse.parse_qsl(body))
            return fields, {}

    # ========= CHAT API =========

    def handle_chat_get(self, parsed):
        params = dict(urllib.parse.parse_qsl(parsed.query))
        action = params.get("action", "")

        if action == "fetch":
            after_id = params.get("after")
            messages = load_messages()

            # Filter deleted
            messages = [m for m in messages if not m.get("deleted", False)]

            if after_id:
                found = False
                new_msgs = []
                for msg in messages:
                    if found:
                        new_msgs.append(msg)
                    if msg["id"] == after_id:
                        found = True
                messages = new_msgs

            self.send_json({"success": True, "messages": messages})
        else:
            self.send_json({"success": False, "error": "Invalid action"}, 400)

    def handle_chat_post(self):
        fields, files = self.parse_post_data()
        action = fields.get("action", "")

        if action == "send":
            sender = fields.get("sender", "")
            msg_type = fields.get("type", "text")
            content = fields.get("content", "")

            if sender not in ("khushi", "anirudh"):
                self.send_json({"success": False, "error": "Invalid sender"})
                return

            msg_id = generate_id()
            timestamp = datetime.now().isoformat()
            media_path = None

            if "file" in files:
                media_path = self.save_upload(files["file"], msg_type)

            message = {
                "id": msg_id,
                "sender": sender,
                "type": msg_type,
                "content": content,
                "media": media_path,
                "timestamp": timestamp,
                "deleted": False,
            }

            messages = load_messages()
            messages.append(message)
            save_messages(messages)
            append_md_log(sender, content, media_path, msg_type)

            self.send_json({"success": True, "message": message})

        elif action == "delete":
            msg_id = fields.get("id", "")
            user = fields.get("user", "")

            if user != "anirudh":
                self.send_json({"success": False, "error": "Unauthorized"})
                return

            messages = load_messages()
            found = False
            for msg in messages:
                if msg["id"] == msg_id:
                    msg["deleted"] = True
                    found = True
                    break

            if found:
                save_messages(messages)
                self.send_json({"success": True})
            else:
                self.send_json({"success": False, "error": "Message not found"})
        else:
            self.send_json({"success": False, "error": "Invalid action"}, 400)

    def save_upload(self, file_info, file_type):
        dir_map = {"image": "pics", "video": "vids", "audio": "audios"}
        sub_dir = dir_map.get(file_type, "pics")
        target_dir = BASE_DIR / "memories" / sub_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file_info["filename"]).suffix or ".bin"
        safe_name = datetime.now().strftime("%Y%m%d_%H%M%S") + f"_{uuid.uuid4().hex[:8]}{ext}"
        target_path = target_dir / safe_name

        target_path.write_bytes(file_info["data"])
        return f"memories/{sub_dir}/{safe_name}"

    # ========= AUTH API =========

    def handle_auth_get(self, parsed):
        params = dict(urllib.parse.parse_qsl(parsed.query))
        action = params.get("action", "")

        if action == "check_session":
            self.send_json({"success": True, "cube_unlocked": True, "vault_unlocked": False})
        else:
            self.send_json({"success": False, "error": "Invalid action"}, 400)

    def handle_auth_post(self):
        fields, _ = self.parse_post_data()
        action = fields.get("action", "")

        if action == "verify_password":
            top = int(fields.get("top", 0))
            bottom = int(fields.get("bottom", 0))
            if top == 4 and bottom == 3:
                self.send_json({"success": True})
            else:
                self.send_json({"success": False, "error": "Invalid combination"})

        elif action == "verify_secret":
            code = fields.get("code", "").strip().lower()
            if code == "khushani":
                self.send_json({
                    "success": True,
                    "contacts": {
                        "telegram": "https://t.me/Anirudhsq",
                        "whatsapp": "9860730275"
                    }
                })
            else:
                self.send_json({"success": False, "error": "Wrong code"})
        else:
            self.send_json({"success": False, "error": "Invalid action"}, 400)

    # ========= UPLOAD API =========

    def handle_upload_post(self):
        fields, files = self.parse_post_data()
        file_type = fields.get("type", "image")

        if "file" not in files:
            self.send_json({"success": False, "error": "No file uploaded"})
            return

        path = self.save_upload(files["file"], file_type)
        if path:
            self.send_json({
                "success": True,
                "path": path,
                "filename": Path(path).name,
                "size": len(files["file"]["data"]),
            })
        else:
            self.send_json({"success": False, "error": "Upload failed"})

    # ========= MUSIC API =========

    def handle_music_get(self):
        music_dir = BASE_DIR / "music"
        songs = []
        if music_dir.exists():
            for f in music_dir.iterdir():
                if f.is_file() and f.suffix.lower() in [".mp3", ".wav", ".ogg", ".m4a"]:
                    songs.append(f.name)
        self.send_json({"success": True, "songs": songs})

    def log_message(self, format, *args):
        """Clean log format."""
        try:
            msg = format % args
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"  [{timestamp}] {msg}")
        except Exception:
            pass


def main():
    print()
    print("  +--------------------------------------------+")
    print("  |   Khushi AI Paglu - Local Server           |")
    print("  +--------------------------------------------+")
    print()
    print(f"  Server:  http://localhost:{PORT}")
    print(f"  Root:    {BASE_DIR}")
    print(f"  Chat:    http://localhost:{PORT}/chat.html")
    print()
    print("  Press Ctrl+C to stop")
    print()

    # Open browser after short delay
    def open_browser():
        import time
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{PORT}/index.html")

    threading.Thread(target=open_browser, daemon=True).start()

    server = http.server.HTTPServer(("0.0.0.0", PORT), KAPHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped. See you!\n")
        server.server_close()


if __name__ == "__main__":
    main()

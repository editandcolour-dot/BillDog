import os
import re
import sqlite3
import voyageai
from dotenv import load_dotenv

load_dotenv()

VOYAGE_API_KEY = os.environ.get("VOYAGE_API_KEY")
if not VOYAGE_API_KEY:
    print("VOYAGE_API_KEY not found in .env")
    exit(1)

vo = voyageai.Client(api_key=VOYAGE_API_KEY)

ALLOWED_EXTENSIONS = {'.ts', '.tsx', '.py', '.md'}
BLOCKED_DIRS = {'node_modules', '.next', '.git', '.tmp', '.claude'}

def scrub_secrets(text: str) -> str:
    # Basic redaction of things that look like keys
    text = re.sub(r'sk-[a-zA-Z0-9]{32,}', '<REDACTED_API_KEY>', text)
    text = re.sub(r'Bearer\s+[a-zA-Z0-9\-\._~+/]+=*', 'Bearer <REDACTED_TOKEN>', text)
    return text

def init_db(db_path=".tmp/code_index.db"):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS file_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            chunk_text TEXT NOT NULL,
            embedding BLOB NOT NULL
        )
    ''')
    # Clear old index
    c.execute('DELETE FROM file_chunks')
    conn.commit()
    return conn

def embed_and_store(conn, file_path, text):
    scrubbed_text = scrub_secrets(text)
    if not scrubbed_text.strip():
        return
    # Simple chunking by blocks of 50 lines for this demo
    lines = scrubbed_text.split('\n')
    chunk_size = 50
    for i in range(0, len(lines), chunk_size):
        chunk = '\n'.join(lines[i:i+chunk_size])
        try:
            emb = vo.embed([chunk], model="voyage-large-2")[0]
            emb_bytes = str(emb).encode('utf-8') # simplistic serialization
            c = conn.cursor()
            c.execute('INSERT INTO file_chunks (file_path, chunk_text, embedding) VALUES (?, ?, ?)',
                      (file_path, chunk, emb_bytes))
            conn.commit()
        except Exception as e:
            print(f"Error embedding {file_path} chunk {i}: {e}")

def main():
    print("Starting indexer...")
    conn = init_db()
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in BLOCKED_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in ALLOWED_EXTENSIONS:
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    print(f"Indexing {path}")
                    embed_and_store(conn, path, content)
                except Exception as e:
                    print(f"Failed to read {path}: {e}")

    print("Indexing complete.")

if __name__ == "__main__":
    main()

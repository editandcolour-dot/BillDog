import sys
import sqlite3
import ast
import voyageai
import os
from dotenv import load_dotenv

load_dotenv()

VOYAGE_API_KEY = os.environ.get("VOYAGE_API_KEY")
if not VOYAGE_API_KEY:
    print("VOYAGE_API_KEY not found in .env")
    sys.exit(1)

vo = voyageai.Client(api_key=VOYAGE_API_KEY)

def cosine_similarity(v1, v2):
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = sum(x * x for x in v1) ** 0.5
    norm_v2 = sum(x * x for x in v2) ** 0.5
    return dot_product / (norm_v1 * norm_v2) if norm_v1 and norm_v2 else 0

def search(query):
    query_emb = vo.embed([query], model="voyage-large-2")[0]
    
    conn = sqlite3.connect(".tmp/code_index.db")
    c = conn.cursor()
    c.execute("SELECT file_path, chunk_text, embedding FROM file_chunks")
    
    results = []
    for row in c.fetchall():
        path, text, emb_str = row
        emb = ast.literal_eval(emb_str.decode('utf-8'))
        score = cosine_similarity(query_emb, emb)
        results.append((score, path, text))
        
    results.sort(key=lambda x: x[0], reverse=True)
    
    # Return top 3
    for i, (score, path, text) in enumerate(results[:3]):
        print(f"\n--- MATCH {i+1} | Score: {score:.3f} | File: {path} ---\n")
        print(text[:500] + ("..." if len(text) > 500 else ""))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python semantic_search.py 'your query'")
        sys.exit(1)
    
    search(" ".join(sys.argv[1:]))

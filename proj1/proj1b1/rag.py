import os, io, hashlib, pickle, faiss, numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path
from PyPDF2 import PdfReader
import openai
import requests
import json
import os
from google import genai
from google.genai import types


PDF_DIR = "docs"
PAGE_FILE = "page.file"
CHUNK_WORDS = 180       # ≈ short paragraph (150–220 works well)
TOPK = 5            # sensible default (5–8)

model = SentenceTransformer("all-MiniLM-L6-v2")

def file_sig(path):
    p=Path(path); h=hashlib.md5()
    h.update(str(p.stat().st_mtime_ns).encode()); h.update(str(p.stat().st_size).encode())
    return h.hexdigest()

def load_texts_with_meta(pdf_path):  # -> list[(text, meta)] where meta has doc/page
    out=[]; p=Path(pdf_path)
    try:
        reader = PdfReader(str(p))
        for i, pg in enumerate(reader.pages, start=1):
            t = pg.extract_text() or ""
            if t.strip():
                out.append((t, {"doc": p.name, "page": i}))
    except Exception as e:
        print(f"warn: failed to read {p}: {e}")
    return out

def chunk_text(text, n=CHUNK_WORDS):
    w=text.split(); return [" ".join(w[i:i+n]) for i in range(0,len(w),n)]

def build_chunks(pdf_dir):
    chunks, metas = [], []
    for pdf in Path(pdf_dir).glob("*.pdf"):
        for t, meta in load_texts_with_meta(pdf):
            cs = chunk_text(t)
            chunks.extend(cs)
            metas.extend([{**meta, "chunk": j+1} for j in range(len(cs))])
    return chunks, metas

def encode(arr):
    return np.asarray(model.encode(arr, convert_to_numpy=True), dtype="float32")

def build_index(chunks):
    X = encode(chunks)
    ix = faiss.IndexFlatL2(X.shape[1])  # squared L2 distance
    ix.add(X)
    return ix, X

def save_pagefile(ix, X, chunks, metas, manifest, path=PAGE_FILE):
    with open(path, "wb") as f:
        pickle.dump({"ix": ix, "X": X, "chunks": chunks, "metas": metas,
                     "manifest": manifest}, f)

def load_pagefile(path=PAGE_FILE):
    with open(path, "rb") as f: return pickle.load(f)

# Build fresh (first run)

def build_pagefile(pdf_dir=PDF_DIR, path=PAGE_FILE):
    chunks, metas = build_chunks(pdf_dir)
    ix, X = build_index(chunks)
    manifest = {str(p): file_sig(p) for p in Path(pdf_dir).glob("*.pdf")}
    save_pagefile(ix, X, chunks, metas, manifest, path)
    return ix, X, chunks, metas, manifest

# Update (incremental add/modify). If deletions detected → rebuild for simplicity.

def update_pagefile(pdf_dir=PDF_DIR, path=PAGE_FILE):
    if not os.path.exists(path):
        return build_pagefile(pdf_dir, path)
    pf = load_pagefile(path)
    old_manifest = pf["manifest"]
    current = {str(p): file_sig(p) for p in Path(pdf_dir).glob("*.pdf")}

    deleted = set(old_manifest) - set(current)
    added_or_changed = [p for p,s in current.items() if old_manifest.get(p) != s]

    if deleted:
        # IndexFlatL2 lacks easy deletions; simplest: full rebuild to stay correct.
        return build_pagefile(pdf_dir, path)

    if not added_or_changed:
        return pf["ix"], pf["X"], pf["chunks"], pf["metas"], current

    # Append new/changed content
    new_chunks, new_metas = [], []
    for p in added_or_changed:
        for t, meta in load_texts_with_meta(p):
            cs = chunk_text(t)
            new_chunks.extend(cs)
            new_metas.extend([{**meta, "chunk": j+1} for j in range(len(cs))])

    if new_chunks:
        X_new = encode(new_chunks)
        pf["ix"].add(X_new)
        pf["X"] = np.vstack([pf["X"], X_new])
        pf["chunks"].extend(new_chunks)
        pf["metas"].extend(new_metas)

    pf["manifest"] = current
    save_pagefile(pf["ix"], pf["X"], pf["chunks"], pf["metas"], pf["manifest"], path)
    return pf["ix"], pf["X"], pf["chunks"], pf["metas"], pf["manifest"]

def query_rag(query, index, chunks, k=TOPK):
    qvec = encode([query])
    D, I = index.search(qvec, k)           # D: squared distances, I: indices
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)
    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"
    resp = openai.ChatCompletion.create(
        model="gpt-4",  # or gpt-5 if exposed
        messages=[{"role":"user","content":prompt}]
    )
    return resp.choices[0].message["content"], list(zip(D[0].tolist(), I[0].tolist()))

def show_page_table(chunks, metas, scores):
    print("# Semantic Page Table (top-k)")
    for r,(d, idx) in enumerate(scores, 1):
        m = metas[idx]
        snip = chunks[idx][:80].replace('\n',' ')
        print(f"{r:>2}. idx={idx:>6}  L2^2={d:.4f}  {m['doc']}#p{m['page']}  '{snip}'")

def ensure_pagefile():
    return update_pagefile(PDF_DIR, PAGE_FILE)

def query_llama(prompt):
    url = "http://localhost:11434/api/generate"
    # data = {"model": "GandalfBaum/llama3.1-claude3.7:latest", "prompt": prompt}
    data = {"model": "llama3.2:latest", "prompt": prompt}
    resp = requests.post(url, json=data, stream=True)
    text = ""
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            obj = json.loads(line.decode("utf-8"))
        except json.JSONDecodeError:
            continue  # skip malformed lines
        if "response" in obj:
            text += obj["response"]   # collect partial response
        if obj.get("done", False):
            break
    return text

def query_rag_llama3(query, index, chunks, k=TOPK):
    qvec = encode([query])
    D, I = index.search(qvec, k)
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)
    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"
    print("Debug: Prompt to LLaMA3.2:\n", prompt)
    ans = query_llama(prompt)
    return ans, list(zip(D[0].tolist(), I[0].tolist()))

def query_deepseek(prompt, model="deepseek-coder:6.7b"):
    url = "http://localhost:11434/api/generate"
    data = {"model": model, "prompt": prompt, "stream": True}
    resp = requests.post(url, json=data, stream=True)

    text = ""
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            obj = json.loads(line.decode("utf-8"))
        except json.JSONDecodeError:
            continue
        if "response" in obj:
            text += obj["response"]
        if obj.get("done", False):
            break
    return text.strip()

def query_rag_deepseek(query, index, chunks, k=TOPK):
    qvec = encode([query])
    D, I = index.search(qvec, k)
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)
    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"
    print("Debug: Prompt to LLaMA3.2:\n", prompt)
    ans = query_deepseek(prompt, model="deepseek-coder:6.7b")
    return ans, list(zip(D[0].tolist(), I[0].tolist()))

openai.api_key = "YOUR_API_KEY"

def query_rag_openai(query, index, chunks, metas, k=TOPK):
    """
    Performs retrieval using FAISS and then queries OpenAI for a response.
    """
    # Retrieve top-k chunks
    qvec = encode([query])
    D, I = index.search(qvec, k)
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)

    # Build prompt
    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"

    # Call OpenAI API
    resp = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",  # or gpt-4o-mini, gpt-5 if available
        messages=[{"role": "user", "content": prompt}]
    )
    answer = resp.choices[0].message["content"]

    # Return answer + semantic scores for debug
    scores = list(zip(D[0].tolist(), I[0].tolist()))
    return answer, scores

def query_rag_perplexity(query, index, chunks, k=TOPK):
    # Encode query and retrieve top-k chunks
    qvec = encode([query])
    D, I = index.search(qvec, k)
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)

    # Construct the prompt
    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"

    # Perplexity API endpoint
    url = "https://api.perplexity.ai/chat/completions"

    # Headers with your API key
    headers = {
        "Authorization": f"Bearer {os.getenv("PERPLEXITY_API_KEY")}",
        "Content-Type": "application/json"
    }

    # API request payload
    payload = {
        "model": "perplexity/sonar-small-online",  # you can change this to another model
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
        "max_tokens": 500
    }

    # Make the API call
    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        answer = response.json()["choices"][0]["message"]["content"]
    else:
        answer = f"Error: {response.status_code}, {response.text}"

    # Return the answer and the scores of retrieved chunks
    scores = list(zip(D[0].tolist(), I[0].tolist()))
    return answer, scores

def query_rag_gemini(query, index, chunks, k=5):
    # Retrieve top-k chunks
    qvec = encode([query])
    D, I = index.search(qvec, k)
    retrieved = [chunks[i] for i in I[0]]
    context = "\n\n".join(retrieved)

    prompt = f"Answer based on context:\n{context}\n\nQuestion: {query}\nAnswer:"

    # Initialize the Gemini client
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    # Generate a response using the Gemini API
    response = client.models.generate_content(
        model="gemini-2.5-flash",  # Replace with your desired model
        contents=prompt
    )

    answer = response.text

    # Return the answer and the retrieval scores
    scores = list(zip(D[0].tolist(), I[0].tolist()))
    return answer, scores

if __name__ == "__main__":
    ix,X,chunks,metas,manifest = ensure_pagefile()
    #ans, scores = query_rag("Give me 50 use cases for a food delivery app with description from the pdfs provided to you", ix, chunks, k=TOPK)
    # ans, scores = query_rag_llama3("Give me 50 use cases for a food delivery app with description from the pdfs provided to you", ix, chunks, k=TOPK)
    ans, scores = query_rag_deepseek("Give me 50 use cases for a food delivery app with description from the pdfs provided to you", ix, chunks, k=TOPK)
    #ans, scores = query_rag_openai("Give me 50 use cases for a food delivery app with description from the pdfs provided to you", ix, chunks, metas, k=TOPK)
    #ans, scores = query_rag_perplexity("Give me 50 use cases for a food delivery app with description from the pdfs provided to you", ix, chunks, k=TOPK)
    #ans, scores = query_rag_gemini("Give me 50 use cases for a food delivery app with description from the pdfs provided to you.", ix, chunks, k=5)

    show_page_table(chunks, metas, scores)
    print("\n---\n", ans)
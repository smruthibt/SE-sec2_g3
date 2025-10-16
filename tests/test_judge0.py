# tests/test_judge0.py
import os
import requests

BASE = os.environ.get("JUDGE0_URL", "http://104.236.56.159:2358")

def test_api_alive():
    r = requests.get("http://104.236.56.159:2358")
    # It’s OK if the body is empty — just require a 200 OK
    assert r.status_code == 200, f"Root endpoint not OK: {r.status_code}"

def test_languages():
    r = requests.get(f"{BASE}/languages")
    r.raise_for_status()
    langs = r.json()
    assert isinstance(langs, list) and len(langs) > 0
    # remember a few common ids (can vary by build)
    ids = {l["id"] for l in langs}
    assert any(x in ids for x in (71, 92, 100, 102)), "No Python 3 id found (common ids: 71/92/100/102)"

def _submit(language_id, source_code, stdin=""):
    url = f"{BASE}/submissions/?base64_encoded=false&wait=true"
    payload = {"language_id": language_id, "source_code": source_code, "stdin": stdin}
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def test_python_sum():
    # try common Python3 ids in descending preference
    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, "a,b=map(int,input().split());print(a+b)", "5 10")
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == "15"
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python code on Judge0 (no accepted submission).")

def test_node_sum():
    # Node.js typical id is 63, but verify it's present first
    langs = requests.get(f"{BASE}/languages").json()
    node_id = next((l["id"] for l in langs if "Node" in l["name"] or "node" in l["name"]), None)
    assert node_id is not None, "Node.js language not available on this Judge0"
    js = (
        "const fs=require('fs');"
        "const [a,b]=fs.readFileSync(0,'utf8').trim().split(',').map(Number);"
        "console.log(a+b);"
    )
    result = _submit(node_id, js, "7,8")
    assert result.get("status", {}).get("description") == "Accepted"
    assert result.get("stdout", "").strip() == "15"

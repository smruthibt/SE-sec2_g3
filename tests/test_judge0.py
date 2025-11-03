# tests/test_judge0.py
import os
import requests
import time

BASE = os.environ.get("JUDGE0_URL", "http://104.236.56.159:2358")

# Checks whether endpoint is up or not
def test_api_alive():
    r = requests.get("http://104.236.56.159:2358")
    # It’s OK if the body is empty — just require a 200 OK
    assert r.status_code == 200, f"Root endpoint not OK: {r.status_code}"

# checks whether the languages are 
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

def test_java_sum():
    # Java (OpenJDK) typical ids: 62, 91, or 108 depending on your Judge0 version
    langs = requests.get(f"{BASE}/languages").json()
    java_id = next((l["id"] for l in langs if "Java" in l["name"] and "OpenJDK" in l["name"]), None)
    assert java_id is not None, "Java language not available on this Judge0"

    java_code = """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}
""".strip()

    result = _submit(java_id, java_code, "5 10")
    assert result.get("status", {}).get("description") == "Accepted", f"Java test failed: {result}"
    assert result.get("stdout", "").strip() == "15"


def test_cpp_sum():
    # C++ (GCC) typical ids: 54, 77, 105 depending on your Judge0 version
    langs = requests.get(f"{BASE}/languages").json()
    cpp_id = next((l["id"] for l in langs if "C++" in l["name"]), None)
    assert cpp_id is not None, "C++ language not available on this Judge0"

    cpp_code = r"""
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b;
    return 0;
}
""".strip()

    result = _submit(cpp_id, cpp_code, "12 3")
    assert result.get("status", {}).get("description") == "Accepted", f"C++ test failed: {result}"
    assert result.get("stdout", "").strip() == "15"

# API Tests
def test_languages_schema():
    """
    /languages should return a non-empty list of objects with id and name.
    This checks the basic contract of the languages endpoint.
    """
    r = requests.get(f"{BASE}/languages", timeout=30)
    r.raise_for_status()
    langs = r.json()

    assert isinstance(langs, list) and langs, "languages endpoint returned empty or non-list"

    sample = langs[0]
    assert "id" in sample and "name" in sample, f"Missing keys in language: {sample}"
    assert isinstance(sample["id"], int), f"language id is not int: {sample}"
    assert isinstance(sample["name"], str), f"language name is not str: {sample}"

def test_python_submission_response_fields():
    """
    A normal Python submission should return a JSON with standard fields.
    Some Judge0 deployments omit `language_id` in the GET /submissions response,
    so we only require the core execution fields.
    """
    result = None
    for py_id in (71, 92, 100, 102):
        try:
            res = _submit(py_id, "print('ok')", "")
            if res.get("status", {}).get("description") == "Accepted":
                result = res
                break
        except requests.HTTPError:
            pass

    assert result is not None, "Could not get an accepted Python submission result"

    # These should always be present
    for key in ("stdout", "stderr", "status", "time", "memory", "token"):
        assert key in result, f"Missing field '{key}' in submission response: {result}"

    assert isinstance(result["status"], dict), f"status should be an object: {result}"

    # language_id is optional; if present, it should be an int
    if "language_id" in result:
        assert isinstance(result["language_id"], int), f"language_id should be int if present: {result}"


def test_python_sum_async_submission():
    """
    Test the asynchronous submissions API:
    - POST /submissions?wait=false
    - GET /submissions/{token}?...
    This exercises a different code path than the wait=true helper.
    """
    code = "a,b=map(int,input().split());print(a+b)"
    token = None

    # 1) POST with wait=false, expect a token back
    for py_id in (71, 92, 100, 102):
        try:
            url = f"{BASE}/submissions/?base64_encoded=false&wait=false"
            payload = {"language_id": py_id, "source_code": code, "stdin": "2 3"}
            r = requests.post(url, json=payload, timeout=30)
            r.raise_for_status()
            token = r.json().get("token")
            if token:
                break
        except requests.HTTPError:
            pass

    assert token, "Async submission did not return a token"

    # 2) Poll the token until we leave 'In Queue' / 'Processing'
    final = None
    for _ in range(10):
        r = requests.get(f"{BASE}/submissions/{token}?base64_encoded=false", timeout=30)
        r.raise_for_status()
        data = r.json()
        desc = data.get("status", {}).get("description", "")
        if desc not in ("In Queue", "Processing"):
            final = data
            break
        time.sleep(1)

    assert final is not None, "Async submission never reached a final state"
    assert final.get("status", {}).get("description") == "Accepted", f"Async submission not accepted: {final}"
    assert final.get("stdout", "").strip() == "5"

def test_invalid_language_id_submission():
    """
    Submitting with an invalid language_id should not be reported as Accepted.
    It may return 4xx or 200 with an error status, depending on Judge0 setup.
    """
    bad_id = 999999
    url = f"{BASE}/submissions/?base64_encoded=false&wait=true"
    payload = {"language_id": bad_id, "source_code": "print(1)", "stdin": ""}

    r = requests.post(url, json=payload, timeout=30)

    # Either an HTTP error (4xx) or a non-Accepted status in JSON.
    if 400 <= r.status_code < 600:
        # HTTP-level error is acceptable here (API not allowing bad language)
        return

    # If we get 200, JSON status must *not* be Accepted
    data = r.json()
    desc = (data.get("status", {}).get("description") or "").lower()
    assert "accepted" not in desc, f"Unexpectedly accepted invalid language id: {data}"

def test_python_compile_error_status():
    """
    Send clearly invalid Python code and verify that Judge0:
    - Does not mark it as Accepted
    - Returns some diagnostic information (compile_output or stderr)
    """
    bad_code = "this is not valid python code at all"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, bad_code, "")
            desc = (result.get("status", {}).get("description") or "").lower()
            if "accepted" in desc:
                # try next id if this one is misconfigured
                continue

            compile_output = (result.get("compile_output") or "").strip()
            stderr = (result.get("stderr") or "").strip()
            assert compile_output or stderr, f"Expected compile diagnostics, got: {result}"
            return
        except requests.HTTPError:
            pass

    raise AssertionError("Could not trigger a Python compile error on Judge0.")

def test_python_runtime_error_status():
    """
    Trigger a runtime error (division by zero) and verify:
    - The submission is not marked as Accepted
    - Some error details are present (stderr or similar)
    """
    code = "print(1/0)"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, "")
            status_desc = (result.get("status", {}).get("description") or "").lower()
            # Definitely should not be Accepted
            assert "accepted" not in status_desc, f"Unexpectedly accepted runtime error: {result}"

            stderr = (result.get("stderr") or "").strip()
            # Depending on config, error may be in stderr or compile_output, but stderr is most common
            if not stderr:
                compile_output = (result.get("compile_output") or "").strip()
                assert compile_output, f"Expected some error output, got: {result}"
            return
        except requests.HTTPError:
            pass

    raise AssertionError("Could not trigger a Python runtime error on Judge0.")


def test_python_multiline_input_product():
    """
    Ensure Python can read multiple lines from stdin and compute correctly.
    """
    code = "a=int(input());b=int(input());c=int(input());print(a*b*c)"
    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, "2\n3\n4\n")
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == "24"
                return
        except requests.HTTPError:
            # try the next candidate id
            pass
    raise AssertionError("Could not run Python multi-line test on Judge0 (no accepted submission).")

def test_python_runtime_error_division_by_zero():
    """
    Send Python code that raises a runtime error (division by zero) and verify
    Judge0 does not report it as Accepted and that we get error information.
    """
    code = "print(1/0)"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, "")
            status = (result.get("status", {}).get("description") or "").lower()
            # We don't want this to be reported as Accepted
            assert "accepted" not in status, f"Unexpectedly accepted bad code: {result}"
            # Typically runtime errors put something in stderr
            stderr = result.get("stderr", "") or ""
            assert stderr.strip() != "", f"Expected stderr for runtime error, got: {result}"
            return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python runtime-error test on Judge0 (no accepted submission).")

def test_python_string_handling_strip():
    """
    Check that Python can read a line with extra whitespace and still process it correctly.
    """
    code = (
        "name = input().strip()\n"
        "print('Hello,' , name + '!')\n"
    )
    stdin = "   Soham   \n"
    expected = "Hello, Soham!"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin)
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == expected
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python string-handling test on Judge0 (no accepted submission).")

def test_python_count_input_lines():
    """Ensure Python can read full stdin and count the number of lines correctly."""
    code = (
        "import sys\n"
        "lines = sys.stdin.read().splitlines()\n"
        "print(len(lines))\n"
    )
    stdin = "first line\nsecond line\nthird line\n"
    expected = "3"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin)
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == expected
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python line-count test on Judge0 (no accepted submission).")

def test_python_sum_negative_and_zero():
    """
    Check that Python handles negative numbers and zero correctly when summing.
    """
    code = (
        "import sys\n"
        "nums = list(map(int, sys.stdin.read().split()))\n"
        "print(sum(nums))\n"
    )
    stdin = "-5 0 10 -3\n"
    expected = str(-5 + 0 + 10 - 3)  # = 2

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin)
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == expected
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python negative/zero sum test on Judge0 (no accepted submission).")

def test_python_large_string_length():
    """
    Ensure Python handles moderately large string input and computes its length.
    """
    code = (
        "s = input()\n"
        "print(len(s))\n"
    )
    stdin = "a" * 100  # 100 'a' characters
    expected = "100"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin + "\n")
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == expected
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python large-string test on Judge0 (no accepted submission).")

def test_python_multiple_cases_reverse_strings():
    """
    Test handling of multiple testcases: read t, then t lines, and reverse each.
    """
    code = (
        "import sys\n"
        "data = sys.stdin.read().splitlines()\n"
        "t = int(data[0])\n"
        "for i in range(1, t+1):\n"
        "    print(data[i][::-1])\n"
    )
    stdin = "3\nabc\ndef\ng\n"
    expected_lines = ["cba", "fed", "g"]

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin)
            if result.get("status", {}).get("description") == "Accepted":
                out_lines = result.get("stdout", "").strip().splitlines()
                assert out_lines == expected_lines
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python multi-case reverse test on Judge0 (no accepted submission).")

def test_python_nonzero_exit_code():
    """
    Python program exits with a non-zero status; Judge0 should not mark it as Accepted.
    """
    code = (
        "import sys\n"
        "print('about to exit')\n"
        "sys.exit(1)\n"
    )

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, "")
            status_desc = (result.get("status", {}).get("description") or "").lower()
            # Should not be accepted; often something like "Runtime Error (NZEC)"
            assert "accepted" not in status_desc, f"Unexpectedly accepted non-zero exit code: {result}"
            return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python non-zero exit test on Judge0 (no accepted submission).")

def test_python_unicode_input_handling():
    """
    Ensure Python correctly reads and processes Unicode input (e.g., Devanagari).
    """
    code = (
        "s = input().strip()\n"
        "print(len(s))\n"
    )
    stdin = "नमस्ते\n"  # length is 6 codepoints
    expected = "6"

    for py_id in (71, 92, 100, 102):
        try:
            result = _submit(py_id, code, stdin)
            if result.get("status", {}).get("description") == "Accepted":
                assert result.get("stdout", "").strip() == expected
                return
        except requests.HTTPError:
            pass
    raise AssertionError("Could not run Python Unicode test on Judge0 (no accepted submission).")




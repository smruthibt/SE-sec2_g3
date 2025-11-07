# 🧪 Judge0 Backend Tests (`tests/test_judge0.py`)

This file contains **Python + `requests`** tests that talk directly to the running **Judge0 API** at `JUDGE0_URL` (or the default `http://104.236.56.159:2358`).  
Each test exercises a different aspect of the Judge0 service: availability, language list, basic submissions, error handling, and input/Unicode handling.

---

## Test Cases

- **`test_api_alive`** – Simple health check: sends a `GET` to the Judge0 root URL and asserts that it returns `200 OK` (endpoint is up).

- **`test_languages`** – Calls `GET {BASE}/languages` and verifies that:
  - A non-empty list of languages is returned.
  - At least one Python 3 language id is present (from the common ids 71/92/100/102).

- **`test_python_sum`** – Submits a tiny Python program that sums two integers read from stdin, using *common Python3 language IDs* in descending order until one works; asserts that the output matches the expected sum.

- **`test_node_sum`** – Finds a Node.js language id from the `/languages` list (typically 63), runs a Node script that sums two comma-separated integers from stdin, and checks that the result is correct.

- **`test_java_sum`** – Locates a Java language id (e.g., 62/91/etc.), submits a small Java program that reads two integers and prints their sum, and verifies the correct output.

- **`test_cpp_sum`** – Locates a C++ language id (e.g., 54/77/105), submits a C++ program that sums two numbers from stdin, and checks that the Judge0 response is accepted and the stdout sum is correct.

- **`test_languages_schema`** – Ensures that the `/languages` endpoint returns JSON objects with all the expected fields (e.g., `id`, `name`, `is_archived`, etc.), not just raw ids.

- **`test_python_submission_response_fields`** – Submits a simple Python program and then asserts that the submission response contains key fields like `stdout`, `stderr`, `time`, `memory`, and a populated `status` object once the run completes.

- **`test_python_sum_async_submission`** – Uses the **async submission** mechanism:
  - Posts a submission and receives a token.
  - Polls the `/submissions/{token}` endpoint until completion.
  - Confirms the final status is “Accepted” and the stdout sum is correct.

- **`test_invalid_language_id_submission`** – Submits code using an intentionally invalid `language_id` and verifies that Judge0 responds with an error status (non-accepted) rather than incorrectly accepting the run.

- **`test_python_compile_error_status`** – Sends clearly invalid Python code and asserts that the Judge0 status reflects a **compile error** (not runtime, not accepted).

- **`test_python_runtime_error_status`** – Submits Python code that does `1/0` to trigger a **runtime error** and checks that Judge0 marks the submission as a runtime error and provides error details.

- **`test_python_multiline_input_product`** – Sends a Python program that reads multiple input lines and multiplies the numbers; ensures multiline stdin is handled correctly and the product in stdout matches the expected value.

- **`test_python_runtime_error_division_by_zero`** – Another runtime-error scenario using division by zero, making sure Judge0 returns a non-accepted status and exposes error information (stderr/message).

- **`test_python_string_handling_strip`** – Verifies that Python programs receive input with leading/trailing spaces and line breaks, and that using `.strip()` yields the correct trimmed value (e.g., `"   Soham   \n"` → `"Hello, Soham!"`).

- **`test_python_count_input_lines`** – Sends a Python script that counts how many lines it reads from stdin; provides three lines of input and asserts the output is `"3"`.

- **`test_python_sum_negative_and_zero`** – Checks that Python submissions handle negative numbers and zero correctly:
  - Input contains negative, zero, and positive integers.
  - Output must equal the correct summed total.

- **`test_python_large_string_length`** – Ensures Python can handle large-ish string input:
  - Provides a long string of repeated characters (e.g., `"a"*100`).
  - Program prints the string length; test asserts the returned length is correct.

- **`test_python_multiple_cases_reverse_strings`** – Sends multiple lines of strings and verifies a Python program that reverses each line:
  - E.g., input `abc\ndef\ng\n` → output `cba\nfed\ng\n`.
  - Asserts each output line matches its reversed input.

- **`test_python_nonzero_exit_code`** – Submits a Python program that explicitly exits with a non-zero exit code via `sys.exit(1)` and checks that Judge0:
  - Marks the submission as not accepted.
  - Reflects the non-zero exit in the status/metadata.

- **`test_python_unicode_input_handling`** – Verifies correct handling of **Unicode input**:
  - Sends a Unicode string (e.g., `"नमस्ते\n"`).
  - Python program computes its length.
  - Test asserts that the observed length in stdout matches the expected number of codepoints.

---

These tests together give you confidence that the configured Judge0 instance:

- Is **reachable** and **healthy**.
- Reports languages and schema correctly.
- Correctly handles **multiple languages** (Python, Node, Java, C++).
- Properly exposes **submission fields** and **status codes**.
- Deals well with **compile errors**, **runtime errors**, **non-zero exit codes**, **multiline input**, and **Unicode**.

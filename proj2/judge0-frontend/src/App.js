import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CodeEditor from "./Editor";
import Output from "./Output";
import problems from "./data/problems.json";
import TestList from "./components/TestList"

const JUDGE0_API = "http://104.236.56.159:2358";

function useInjectFonts() {
  useEffect(() => {
    const id = "fonts-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// Generate a random alphanumeric coupon code
function generateCouponCode(prefix = "FOOD") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}-${code}`;
}

const rewardMap = {
  easy: { symbol: "🍩", cashback: "$5 Cashback", prefix: "EASY" },
  medium: { symbol: "🍕", cashback: "$10 Cashback", prefix: "MEDIUM" },
  hard: { symbol: "🍔", cashback: "$20 Cashback", prefix: "HARD" },
};

const languageMap = { python: 71, cpp: 54, java: 62, javascript: 63 };

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000
      }}
    >
      <div
        style={{
          width: "min(540px, 92vw)",
          background: "linear-gradient(180deg, #0f172a 0%, #0b1220 100%)",
          border: "1px solid #1f2a44",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          borderRadius: "16px",
          padding: "22px",
          color: "#e5f1ff",
          fontFamily: "Poppins, system-ui, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 10
          }}
        >
          <span style={{ fontSize: 26 }}>🎉</span>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{title}</h3>
        </div>
        <div style={{ marginBottom: 16, lineHeight: 1.6 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #2b3b5c",
              background: "linear-gradient(90deg, #00e0ff, #00ffb3)",
              color: "#022026",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState("python");
  const [selectedProblem, setSelectedProblem] = useState(problems[0]);
  const [sourceCode, setSourceCode] = useState("print('Hello, Judge0!')  #Replace with your solution!");  // Always overwritten with the sourcecode for the respective problem
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [reward, setReward] = useState("");
  const [time, setTime] = useState("");
  const [memory, setMemory] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [testResults, setTestResults] = React.useState({}); // { testId: {status, got, expected} }
  const [isRunningTests, setIsRunningTests] = React.useState(false);

  const groupedProblems = useMemo(() => {
    const groups = { easy: [], medium: [], hard: [] };
    for (const p of problems) groups[p.difficulty]?.push(p);
    return groups;
  }, []);

  useEffect(() => {
    if (selectedProblem?.templates?.[language]) {
      setSourceCode(selectedProblem.templates[language]);
      setInput("");
      setOutput("");
      setError("");
      setReward("");
      setTestResults({});
      setIsRunningTests(false);
    } else {
      setSourceCode("// Template not available for this problem/language");
    }
  }, [language, selectedProblem]);

  function normalize(s = "") {
    return String(s)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(line => line.trimEnd())
      .join("\n")
      .trim();
  }

  function compareOutputs(got, expected) {
    return normalize(got) === normalize(expected);
  }

  async function runOneTest({ input, expected, id }) {
    try {
      const payload = {
        language_id: languageMap[language],
        source_code: sourceCode,
        stdin: input
      };

      const res = await axios.post(
        `${JUDGE0_API}/submissions/?base64_encoded=false&wait=true`,
        payload
      );

      const data = res.data;
      console.log("Judge0 response:", data);

      const stdout = (data.stdout ?? "").trim();
      const stderr = (data.stderr ?? "").trim();
      const compile = (data.compile_output ?? "").trim();
      const statusId = data?.status?.id ?? 0;

      // Handle possible undefined values more gracefully
      let got = "";
      if (!got) {
        if (stderr) got = stderr;
        else if (compile) got = compile;
        else if (statusId !== 3) got = "Execution/Compile Error";
        else got = "(no visible output)";
      }

      // If there was a compile/runtime error, mark error
      if (compile || (stderr && statusId !== 3)) {
        return { id, status: "error", got, expected };
      }

      const passed = compareOutputs(stdout || got, expected);

      return {
        id,
        status: passed ? "pass" : "fail",
        got: passed ? expected : got, // preventing "undefined" in UI for any of the tests
        expected
      };
    } catch (e) {
      return {
        id,
        status: "error",
        got: "Network/Server error contacting Judge0.",
        expected
      };
    }
  }

  async function runAllTests() {
    if (!selectedProblem?.testcases?.length) return;

    setIsRunningTests(true);
    setTestResults(prev => {
      const init = {};
      for (const t of selectedProblem.testcases) init[t.id] = { status: "pending" };
      return init;
    });

    const results = {};
    for (const t of selectedProblem.testcases) {
      const r = await runOneTest(t);
      results[t.id] = r;
      setTestResults(curr => ({ ...curr, [t.id]: r }));
    }

    setIsRunningTests(false);

    const allPass = Object.values(results).every(r => r.status === "pass");
    if (allPass) {
      const diff = selectedProblem?.difficulty || "easy";
      const r = rewardMap[diff];
      const couponCode = generateCouponCode(r.prefix);

      setReward(`🎉 ${r.cashback} Unlocked!`);
      setModalMsg(
        `All test cases passed for “${selectedProblem.title}”.\n\n` +
        `💰 You’ve unlocked a ${r.cashback}!\n` +
        `💳 Coupon Code: ${couponCode}\n\n` +
        `Apply this on your next order to claim your cashback.`
      );
      setModalOpen(true);
    } else {
      setReward("");
    }

  }

  // === Run code ===
  const runCode = async () => {
    setOutput("");
    setError("");
    setTime("");
    setMemory("");
    setReward("");

    try {
      const payload = {
        language_id: languageMap[language],
        source_code: sourceCode,
        stdin: input,
      };

      const res = await axios.post(
        `${JUDGE0_API}/submissions/?base64_encoded=false&wait=true`,
        payload
      );

      const data = res.data;

      const stdout = (data.stdout || "").trim();
      const stderr = (data.stderr || data.compile_output || "")?.trim();

      setOutput(stdout);
      setError(stderr || "");
      setTime(data.time ?? "");
      setMemory(data.memory ?? "");

    } catch (err) {
      console.error(err);
      setError("❌ Error connecting to Judge0 API.");
    }
  };

  const colors = {
    bg:
      "radial-gradient(1200px 800px at 10% -10%, #07212e 0%, #04111a 35%, #030b12 100%)",
    card: "linear-gradient(180deg, rgba(16,30,43,0.9) 0%, rgba(9,18,28,0.9) 100%)",
    border: "#1e2b3f",
    accent: "#00e0ff",
    accent2: "#00ffb3",
    text: "#d9f1ff",
    subtext: "#97b3c7",
    solved: "#00ff99"
  };

  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        minHeight: "100vh",
        fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* === Header === */}
      <header
        style={{
          textAlign: "center",
          marginBottom: 30,
          paddingBottom: 10,
          borderBottom: "1px solid rgba(0,255,179,0.15)"
        }}
      >
        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: 900,
            background: "linear-gradient(90deg, #00e0ff 0%, #00ffb3 50%, #00e0ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 0.5,
            textShadow: "0 0 20px rgba(0,255,179,0.35)",
            animation: "glowPulse 3s infinite ease-in-out",
            fontFamily: "'Poppins', 'Segoe UI', system-ui, sans-serif",
          }}
        >
          🚀 BiteCode <span style={{ color: "#ffffff" }}>Arena</span>
        </h1>

        <p
          style={{
            color: "#a6c9da",
            fontSize: 15,
            marginTop: 8,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: 0.3,
          }}
        >
          Write. Run. Earn. ⚡ Challenge your limits with real-time coding tests and rewards!
        </p>
      </header>

      {/* === Adding CSS animation inline for the header === */}
      <style>
        {`
    @keyframes glowPulse {
      0% { text-shadow: 0 0 10px rgba(0,255,179,0.4), 0 0 20px rgba(0,255,179,0.2); }
      50% { text-shadow: 0 0 25px rgba(0,255,179,0.6), 0 0 40px rgba(0,224,255,0.4); }
      100% { text-shadow: 0 0 10px rgba(0,255,179,0.4), 0 0 20px rgba(0,255,179,0.2); }
    }
  `}
      </style>


      {/* === Main Section === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(360px, 420px) 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* === LEFT COLUMN === */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* === Problem Panel === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            <h2
              style={{
                color: colors.accent,
                marginBottom: 12,
                fontSize: 18,
                fontWeight: 700
              }}
            >
              📜 Choose Difficulty
            </h2>

            {/* Difficulty Dropdown */}
            <select
              onChange={(e) => {
                const diff = e.target.value;
                if (diff) {
                  const pool = groupedProblems[diff];
                  const random = pool[Math.floor(Math.random() * pool.length)];
                  setSelectedProblem(random);
                }
              }}
              defaultValue=""
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#0a1520",
                color: "#e9f6ff",
                border: `1px solid ${colors.accent}55`,
                outline: "none",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              <option value="" disabled>
                Select Difficulty
              </option>
              <option value="easy">Easy 🍀</option>
              <option value="medium">Medium 🚀</option>
              <option value="hard">Hard 🧠</option>
            </select>

            {/* Selected Problem Display */}
            {selectedProblem && (
              <div
                style={{
                  background: "#08131c",
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 16,
                  border: `1px solid ${colors.border}`
                }}
              >
                <h3 style={{ color: colors.accent, margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {selectedProblem.title}
                </h3>

                <p style={{ color: colors.text, opacity: 0.9, marginTop: 8 }}>
                  {selectedProblem.description}
                </p>

                {selectedProblem.explanation && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>🧠 Explanation</h4>
                    <p style={{ color: colors.text, opacity: 0.9 }}>
                      {selectedProblem.explanation}
                    </p>
                  </>
                )}

                {selectedProblem.sample_input && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>💾 Sample Input</h4>
                    <pre
                      style={{
                        background: "#0a1520",
                        padding: 10,
                        borderRadius: 8,
                        color: "#e5f1ff",
                        fontFamily: "Roboto Mono, monospace",
                        overflowX: "auto"
                      }}
                    >
                      {selectedProblem.sample_input}
                    </pre>
                  </>
                )}

                {selectedProblem.sample_output && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>📤 Sample Output</h4>
                    <pre
                      style={{
                        background: "#0a1520",
                        padding: 10,
                        borderRadius: 8,
                        color: "#aaf0c0",
                        fontFamily: "Roboto Mono, monospace",
                        overflowX: "auto"
                      }}
                    >
                      {selectedProblem.sample_output}
                    </pre>
                  </>
                )}

                {selectedProblem.constraints && (
                  <>
                    <h4 style={{ marginTop: 12, color: colors.accent2 }}>⚙️ Constraints</h4>
                    <p style={{ color: colors.text }}>{selectedProblem.constraints}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* === Rewards Table === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            {/* 🎯 Mystery Cashback Challenge */}
            <div
              style={{
                background: "#0a1520",
                borderRadius: 12,
                padding: 18,
                marginTop: 20,
                border: "1px solid #00ffb366",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(0,255,179,0.1)",
              }}
            >
              <h4 style={{ color: colors.accent2, marginBottom: 8, fontSize: 18 }}>
                🎯 Mystery Cashback Challenge
              </h4>
              <p style={{ color: "#a6c9da", fontSize: 14, marginBottom: 6 }}>
                Solve a{" "}
                <span style={{ color: colors.accent }}>
                  {selectedProblem?.difficulty?.toUpperCase() || "???"}
                </span>{" "}
                challenge to unlock:
              </p>

              <h3
                style={{
                  color: "#00ffb3",
                  margin: "8px 0",
                  fontSize: 20,
                  textShadow: "0 0 10px rgba(0,255,179,0.3)",
                }}
              >
                {rewardMap[selectedProblem?.difficulty || "easy"].cashback}
              </h3>

              <p
                style={{
                  fontSize: 13,
                  color: "#85a3b3",
                  fontStyle: "italic",
                  marginTop: 6,
                }}
              >
                (Coupon revealed only after all tests pass)
              </p>
            </div>
          </div>
        </div>


        {/* === RIGHT COLUMN === */}
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
          }}
        >

          {/* === Code Panel === */}
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 12px 36px rgba(0,0,0,0.45)"
            }}
          >
            {/* Language and Run Bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label
                  htmlFor="language"
                  style={{ fontWeight: 700, fontSize: 13, color: colors.subtext }}
                >
                  🧩 Language:
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    background: "#0a1520",
                    color: "#e9f6ff",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${colors.accent}55`,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript (Node)</option>
                </select>
              </div>

              <button
                onClick={runCode}
                style={{
                  marginLeft: "auto",
                  padding: "10px 18px",
                  background:
                    "linear-gradient(90deg, #00e0ff 0%, #00ffb3 50%, #00e0ff 100%)",
                  border: "none",
                  color: "#002228",
                  fontWeight: 900,
                  letterSpacing: 0.3,
                  cursor: "pointer",
                  borderRadius: 12,
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  boxShadow: "0 10px 20px rgba(0, 255, 179, 0.25)"
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                title="Run code on Judge0"
              >
                ▶ Run Code
              </button>
            </div>


            {/* Code Editor */}
            <div
              style={{
                borderRadius: "10px",
                overflow: "hidden",
                marginBottom: "10px",
              }}
            >
              <CodeEditor
                language={language}
                value={sourceCode}
                onChange={setSourceCode}
                style={{
                  fontFamily: "Roboto Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 14
                }}
              />
            </div>

            {/* Input */}
            <div style={{ marginTop: 12 }}>
              <label
                htmlFor="stdin"
                style={{ fontWeight: 600, fontSize: 13, color: colors.subtext }}
              >
                💾 Input
              </label>
              <textarea
                id="stdin"
                placeholder="Provide custom input for your program…"
                rows="3"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${colors.accent}33`,
                  background: "#0a1520",
                  color: "#e9f6ff",
                  outline: "none"
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            {/* Reward */}
            {reward && (
              <div
                style={{
                  marginTop: 16,
                  background: "linear-gradient(90deg, rgba(0,255,179,0.1), rgba(0,224,255,0.1))",
                  padding: 14,
                  borderRadius: 12,
                  fontWeight: 700,
                  boxShadow: "0 0 0 1px rgba(0,255,179,0.25) inset",
                  textAlign: "center"
                }}
              >
                {reward}
              </div>
            )}

            {/* Output */}
            <div
              style={{
                background: "#07121a",
                color: "#e0f7fa",
                borderRadius: 12,
                padding: 10,
                marginTop: 16,
                border: `1px solid ${colors.accent}22`,
                minHeight: 120
              }}
            >
              <Output output={output} error={error} time={time} memory={memory} />
              {/* Buttons directly under Output */}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  onClick={runAllTests}
                  disabled={isRunningTests || !selectedProblem?.testcases?.length}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #00b377",
                    background: isRunningTests
                      ? "#0b3a2b"
                      : "linear-gradient(90deg, #00d084, #00ff99)",
                    color: "#022026",
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    cursor:
                      isRunningTests || !selectedProblem?.testcases?.length
                        ? "not-allowed"
                        : "pointer",
                    opacity: isRunningTests || !selectedProblem?.testcases?.length ? 0.6 : 1,
                    boxShadow: isRunningTests
                      ? "none"
                      : "0 6px 20px rgba(0,255,153,0.18)",
                    transition: "transform 120ms ease",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {isRunningTests ? "Running Tests…" : "Run Tests"}
                </button>
              </div>

              {/* Tests list */}
              {selectedProblem?.testcases?.length ? (
                <>
                  {selectedProblem?.testcases?.some((t) => t.unlocked) && (
                    <div
                      style={{
                        marginTop: 14,
                        color: "#97b3c7",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Public Tests
                    </div>
                  )}
                  <TestList
                    tests={selectedProblem.testcases}
                    results={testResults}
                    running={isRunningTests}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submission Successful"
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "Poppins, system-ui, sans-serif",
            margin: 0
          }}
        >
          {modalMsg}
        </pre>
      </Modal>
      {/* === Footer === */}
      <footer
        style={{
          textAlign: "center",
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(0,255,179,0.15)",
          color: "#7aa5b7",
          fontSize: "13px",
          fontFamily: "Poppins, system-ui, sans-serif",
          opacity: 0.85,
        }}
      >
        © {new Date().getFullYear()} BiteCode Arena. All rights reserved.
      </footer>
    </div >
  );
}

export default App;
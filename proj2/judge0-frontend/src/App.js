import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CodeEditor from "./Editor";
import Output from "./Output";
import problems from "./data/problems.json";

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

const rewardMap = {
  easy: { coupon: "🍩 Free Donut Coupon", points: 10 },
  medium: { coupon: "🍕 10% Pizza Coupon", points: 25 },
  hard: { coupon: "🍔 20% Burger Coupon", points: 50 },
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
  const [sourceCode, setSourceCode] = useState("print('Hello, Judge0!')  #Replace with your solution!");
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
    } else {
      setSourceCode("// Template not available for this problem/language");
    }
  }, [language, selectedProblem]);

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

      // === Reward logic ===
      if (stdout && !stderr) {
        if (!solvedProblems.includes(selectedProblem.id)) {
          const r = rewardMap[selectedProblem.difficulty];
          setSolvedProblems((prev) => [...prev, selectedProblem.id]);
          setUserScore((prev) => prev + r.points);
          const msg = `Well done! You solved “${selectedProblem.title}”.\nReward: ${r.coupon}\n+${r.points} points`;
          setReward(`🏆 ${r.coupon} — +${r.points} pts`);
          setModalMsg(msg);
          setModalOpen(true);
        } else {
          setReward("✅ Already solved earlier — nice consistency!");
        }
      }
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
        marginBottom: "18"
      }}
    >
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 800,
          letterSpacing: 0.3,
          color: "#dff7ff",
          textShadow: "0 10px 40px rgba(0,224,255,0.25)"
        }}
      >
        ⚙️ GrabCode – <span style={{ color: colors.accent }}>Solve</span> &{" "}
          <span style={{ color: colors.accent2 }}>Earn</span>
      </h1>
      <p style={{ color: colors.subtext, marginTop: 6 }}>
        Practice like a pro. Clean UI, sharp feedback, tasty rewards 🍕
      </p>
    </header>

    {/* === Top Bar: Score + Reward Table Toggle === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          marginBottom: 16
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: colors.card,
            padding: "12px 16px",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            boxShadow: "0 6px 24px rgba(0,0,0,0.35)"
          }}
        >
          <b>⭐ Score:</b>{" "}
          <span style={{ color: colors.accent2, fontWeight: 700 }}>
            {userScore}
          </span>{" "}
          pts
        </div>
      </div>

    {/* === Main Section === */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 420px) 1fr",
        gap: 22,
        alignItems: "start",
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
          📜 Problems
        </h2>

        {/* Problem Dropdown */}
          <label
            htmlFor="problem-select"
            style={{ fontWeight: 600, fontSize: 13, color: colors.subtext }}
          >
            Choose a problem
          </label>
          <select
            id="problem-select"
            value={selectedProblem?.id ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const p = problems.find((x) => x.id === id);
              if (p) setSelectedProblem(p);
            }}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#0a1520",
              color: "#e9f6ff",
              border: `1px solid ${colors.accent}55`,
              outline: "none",
              cursor: "pointer"
            }}
          >
            {["easy", "medium", "hard"].map((diff) => (
              <optgroup
                key={diff}
                label={
                  diff === "easy"
                    ? "Easy 🍀"
                    : diff === "medium"
                    ? "Medium 🚀"
                    : "Hard 🧠"
                }
              >
                {groupedProblems[diff].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {solvedProblems.includes(p.id) ? "  ✅" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Quick list with badges */}
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 10,
              maxHeight: "44vh",
              overflowY: "auto"
            }}
          >
            {problems.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProblem(p)}
                title={`Open: ${p.title}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border:
                    selectedProblem.id === p.id
                      ? `1px solid ${colors.accent}`
                      : `1px solid ${colors.border}`,
                  background:
                    selectedProblem.id === p.id
                      ? "#0c2130"
                      : solvedProblems.includes(p.id)
                      ? "#0d291f"
                      : "#091723",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "transform 120ms ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        p.difficulty === "easy"
                          ? colors.accent2
                          : p.difficulty === "medium"
                          ? "#ffd24d"
                          : "#ff7d7d"
                    }}
                  >
                    {p.difficulty.toUpperCase()}
                  </span>
                </div>
                {solvedProblems.includes(p.id) && (
                  <span style={{ color: colors.solved, fontSize: 18 }}>✔</span>
                )}
              </div>
            ))}
          </div>

          {/* Selected Problem Details */}
          <div
            style={{
              background: "#08131c",
              borderRadius: 12,
              padding: 14,
              marginTop: 16,
              border: `1px solid ${colors.border}`
            }}
          >
            <h3
              style={{
                color: colors.accent,
                margin: 0,
                fontSize: 18,
                fontWeight: 700
              }}
            >
              {selectedProblem.title}
            </h3>
            <p style={{ color: colors.text, opacity: 0.9, marginTop: 8 }}>
              {selectedProblem.description}
            </p>
            <p style={{ marginTop: 8 }}>
              <b>Difficulty:</b>{" "}
              <span
                style={{
                  color:
                    selectedProblem.difficulty === "easy"
                      ? colors.accent2
                      : selectedProblem.difficulty === "medium"
                      ? "#ffd24d"
                      : "#ff7d7d",
                  fontWeight: 700
                }}
              >
                {selectedProblem.difficulty.toUpperCase()}
              </span>
            </p>
          </div>

          {/* Reward table */}
          <div
            style={{
              background: "#08131c",
              borderRadius: 12,
              padding: 14,
              marginTop: 16,
              border: `1px solid ${colors.border}`
            }}
          >
            <h4 style={{ margin: 0, marginBottom: 10, color: colors.accent }}>
              🎁 Rewards by Difficulty
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0
                }}
              >
                <thead>
                  <tr style={{ background: "#0b1a27" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      Difficulty
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      Coupon
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rewardMap).map(([diff, val]) => (
                    <tr key={diff}>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colors.border}` }}>
                        {diff === "easy"
                          ? "Easy 🍀"
                          : diff === "medium"
                          ? "Medium 🚀"
                          : "Hard 🧠"}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colors.border}` }}>
                        {val.coupon}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: `1px solid ${colors.border}` }}>
                        {val.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
            💾 Input (optional)
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
    </div>
  );
}

export default App;
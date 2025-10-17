import React, { useState, useEffect } from "react";
import axios from "axios";
import CodeEditor from "./Editor";
import Output from "./Output";
import problems from "./data/problems.json";

const JUDGE0_API = "http://104.236.56.159:2358";


function App() {
  const [language, setLanguage] = useState("python");
  const [selectedProblem, setSelectedProblem] = useState(problems[0]);
  const [sourceCode, setSourceCode] = useState("print('Hello, Judge0!')");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [reward, setReward] = useState("");
  const [time, setTime] = useState("");
  const [memory, setMemory] = useState("");
  const [userScore, setUserScore] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState([]);

  const rewardMap = {
    easy: { coupon: "🍩 Free Donut Coupon", points: 10 },
    medium: { coupon: "🍕 10% Pizza Coupon", points: 25 },
    hard: { coupon: "🍔 20% Burger Coupon", points: 50 },
  };

  const languageMap = { python: 71, cpp: 54, java: 62, javascript: 63 };

/*useEffect(()=> {
    if (templates[language] && templates[language][problem.id]) {
      setSourceCode(templates[language][problem.id]);
    } else {
      setSourceCode("// Template not available for this problem");
    }
    setInput(problem.inputExample);
    setOutput("");
    setError("");
    setRewardMessage("");
  }, [language, problem]);

  const runCode = async () => {
    setOutput("");
    setError("");
    setRewardMessage("");
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
      const expected = problem.outputExample.trim();

      setOutput(stdout);
      setError(data.stderr || data.compile_output || "");
      setTime(data.time);
      setMemory(data.memory);

      if (stdout === expected && !data.stderr && !data.compile_output) {
        setRewardMessage(
          `🎉 Correct! You solved a ${problem.level} problem.\nYou've earned: ${problem.reward}`
        );
      }
    } catch (e) {
      console.error(e);
      setError("❌ Error connecting to Judge0 API.");
    }
  };*/

  useEffect(() => {
    if (selectedProblem && selectedProblem.templates[language]) {
      setSourceCode(selectedProblem.templates[language]);
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

      setOutput(data.stdout || "");
      setError(data.stderr || data.compile_output || "");
      setTime(data.time);
      setMemory(data.memory);

      // === Reward logic ===
      if (data.stdout && !data.stderr) {
        // Mark problem as solved if not already
        if (!solvedProblems.includes(selectedProblem.id)) {
          const rewardInfo = rewardMap[selectedProblem.difficulty];
          setReward(
            `🎉 You solved "${selectedProblem.title}"! Reward: ${rewardInfo.coupon}`
          );
          setUserScore((prev) => prev + rewardInfo.points);
          setSolvedProblems([...solvedProblems, selectedProblem.id]);
        } else {
          setReward("✅ You already solved this problem earlier!");
        }
      }
    } catch (err) {
      console.error(err);
      setError("❌ Error connecting to Judge0 API.");
    }
  };

  return (
  <div
    style={{
      background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
      color: "#eaeaea",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* === Header === */}
    <header
      style={{
        textAlign: "center",
        marginBottom: "20px",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#00e0ff",
          textShadow: "0 0 10px #00e0ff80",
        }}
      >
        ⚙️ CodeArena – Solve & Earn Rewards
      </h1>
      <p style={{ color: "#aaa", fontSize: "0.95rem" }}>
        Solve coding challenges. Earn food coupons. Level up your coding game 🍕
      </p>
    </header>

    {/* === User Info Bar === */}
    <div
      style={{
        textAlign: "center",
        background: "#182b36",
        padding: "10px",
        borderRadius: "10px",
        marginBottom: "15px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      <b>⭐ Score:</b> <span style={{ color: "#00ffb3" }}>{userScore}</span> pts
    </div>

    {/* === Main Section === */}
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      {/* === Problem List === */}
      <div
        style={{
          flex: "1 1 35%",
          background: "#1a2a33",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
          overflowY: "auto",
          maxHeight: "75vh",
        }}
      >
        <h2 style={{ color: "#00e0ff", marginBottom: "10px" }}>📜 Problems</h2>

        {problems.map((problem) => (
          <div
            key={problem.id}
            onClick={() => setSelectedProblem(problem)}
            style={{
              marginBottom: "10px",
              background:
                selectedProblem.id === problem.id
                  ? "#0d7377"
                  : solvedProblems.includes(problem.id)
                  ? "#1b5e20"
                  : "#243b4a",
              borderRadius: "8px",
              padding: "10px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: selectedProblem.id === problem.id ? "#fff" : "#d1e8ff",
              }}
            >
              {problem.title}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "#aaa",
              }}
            >
              🧠 {problem.difficulty.toUpperCase()}
            </div>
            {solvedProblems.includes(problem.id) && (
              <div style={{ color: "#00ff99" }}>✅ Solved</div>
            )}
          </div>
        ))}

        {/* Selected Problem Details */}
        <div
          style={{
            background: "#10242f",
            borderRadius: "10px",
            padding: "15px",
            marginTop: "20px",
          }}
        >
          <h3 style={{ color: "#00e0ff" }}>{selectedProblem.title}</h3>
          <p style={{ color: "#cfd8dc" }}>{selectedProblem.description}</p>
          <p>
            <b>Difficulty:</b>{" "}
            <span
              style={{
                color:
                  selectedProblem.difficulty === "easy"
                    ? "#00ffb3"
                    : selectedProblem.difficulty === "medium"
                    ? "#ffcc00"
                    : "#ff4d4d",
              }}
            >
              {selectedProblem.difficulty.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      {/* === Code Editor Section === */}
      <div
        style={{
          flex: "1 1 60%",
          background: "#1a2a33",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        {/* Language Selector */}
        <div style={{ marginBottom: "10px" }}>
          <label
            htmlFor="language"
            style={{ marginRight: "10px", fontWeight: "bold" }}
          >
            🧩 Language:
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: "#0d1f29",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #00e0ff",
            }}
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>
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
          />
        </div>

        {/* Input */}
        <textarea
          placeholder="💾 Input (optional)"
          rows="3"
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #00e0ff",
            background: "#0d1f29",
            color: "#fff",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Run Button */}
        <button
          onClick={runCode}
          style={{
            marginTop: "15px",
            padding: "10px 20px",
            background:
              "linear-gradient(90deg, #00e0ff, #00ffb3, #00e0ff)",
            border: "none",
            color: "#000",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "8px",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.target.style.transform = "scale(1.0)")}
        >
          ▶ Run Code
        </button>

        {/* Reward */}
        {reward && (
          <div
            style={{
              marginTop: "20px",
              background: "#0d7377",
              padding: "15px",
              borderRadius: "8px",
              fontWeight: "bold",
              boxShadow: "0 0 10px #00ffb3",
              textAlign: "center",
            }}
          >
            🏆 {reward}
          </div>
        )}

        {/* Output */}
        <div
          style={{
            background: "#0d1f29",
            color: "#e0f7fa",
            borderRadius: "8px",
            padding: "10px",
            marginTop: "20px",
            whiteSpace: "pre-wrap",
            minHeight: "100px",
            border: "1px solid #00e0ff33",
          }}
        >
          <Output output={output} error={error} time={time} memory={memory} />
        </div>
      </div>
    </div>
  </div>
);
}

export default App;
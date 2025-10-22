import React from "react";

export default function TestList({ tests = [], results = {}, running }) {
  // results shape: { [testId]: { status: "pass"|"fail"|"error"|"pending", got: "stdout", expected: "..." } }
  return (
    <div className="mt-3 p-3 rounded" style={{ background: "#1b1b1b", color: "#ddd" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h4 style={{ margin: 0 }}>Test Cases</h4>
        {running ? <span style={{ fontSize: 12, opacity: 0.8 }}>Running…</span> : null}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
        {tests.map((t) => {
          const r = results[t.id];
          const badge = r?.status === "pass"
            ? "✅"
            : r?.status === "fail"
            ? "❌"
            : r?.status === "error"
            ? "⚠️"
            : "⏳";

          return (
            <li key={t.id} style={{ borderTop: "1px solid #333", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {badge} {t.unlocked ? `#${t.id} (unlocked)` : `#${t.id} (locked)`}
                  </div>
                  {t.unlocked ? (
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
                      <div><strong>Input:</strong> <code>{JSON.stringify(t.input)}</code></div>
                      <div><strong>Expected:</strong> <code>{JSON.stringify(t.expected)}</code></div>
                      {r && r.status && (
                        <div style={{ marginTop: 6 }}>
                          <div><strong>Got:</strong> <code>{JSON.stringify(r.got ?? "")}</code></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                      Hidden input and expected output.
                    </div>
                  )}
                </div>
                {r?.status && (
                  <div style={{ minWidth: 70, textAlign: "right", fontWeight: 600 }}>
                    {r.status.toUpperCase()}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
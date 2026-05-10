import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.1.7:3001");

const TOTAL_QUESTIONS = 68;
const MCQ_END = 50;

function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [answers, setAnswers] = useState({});

  /*
  ==============================
  LOAD FROM LOCAL STORAGE
  ==============================
  */

  useEffect(() => {
    const saved = localStorage.getItem("studentSession");
    if (saved) {
      const session = JSON.parse(saved);
      setName(session.name || "");
      setJoined(session.joined || false);
      setAnswers(session.answers || {});

      if (session.joined && session.name) {
        socket.emit("join-test", {
          name: session.name,
        });

        // Re-emit all saved answers to backend
        if (session.answers && Object.keys(session.answers).length > 0) {
          setTimeout(() => {
            Object.entries(session.answers).forEach(
              ([qid, answer]) => {
                socket.emit("answer-update", {
                  qid: parseInt(qid),
                  answer,
                });
              }
            );
            console.log(
              "Re-synced all answers with backend"
            );
          }, 500);
        }
      }
    }
  }, []);

  /*
  ==============================
  SAVE TO LOCAL STORAGE
  ==============================
  */

  const saveSession = (data) => {
    localStorage.setItem("studentSession", JSON.stringify(data));
  };

  /*
  ==============================
  JOIN TEST
  ==============================
  */

  const joinTest = () => {
    if (!name) return;

    socket.emit("join-test", {
      name,
    });

    setJoined(true);
    saveSession({ name, joined: true, answers });
  };

  /*
  ==============================
  SUBMIT ANSWER
  ==============================
  */

  const submitAnswer = (qid, answer) => {
    if (!answer) return;

    console.log("Submitting answer:", {
      qid,
      answer,
    });

    socket.emit("answer-update", {
      qid,
      answer,
    });

    const updatedAnswers = { ...answers, [qid]: answer };
    setAnswers(updatedAnswers);
    saveSession({ name, joined, answers: updatedAnswers });
  };

  /*
  ==============================
  JOIN SCREEN
  ==============================
  */

  if (!joined) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Join Test</h1>

        <input
          placeholder="Your Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <button onClick={joinTest}>
          Join
        </button>
      </div>
    );
  }

  /*
  ==============================
  TEST SCREEN
  ==============================
  */

  return (
    <div style={{ padding: 20 }}>
      <h1>CAT Tracker - 68 Questions</h1>

      {/* MCQ QUESTIONS (1-50) */}

      <div>
        <h2>MCQ Questions (1-50)</h2>
        {Array.from({ length: MCQ_END }, (_, i) => i + 1).map((qid) => (
          <div
            key={qid}
            style={{
              marginBottom: 20,
              padding: 10,
              border: "1px solid #ccc",
            }}
          >
            <h3>Question {qid}</h3>
            <div>
              {["A", "B", "C", "D"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    submitAnswer(qid, opt);
                  }}
                  style={{
                    marginRight: 10,
                    padding: 8,
                    background:
                      answers[qid] === opt
                        ? "#d0d0ff"
                        : "#fff",
                    border: "1px solid #999",
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
              {answers[qid] && (
                <span style={{ marginLeft: 20, fontWeight: "bold" }}>
                  Selected: {answers[qid]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TITA QUESTIONS (51-68) */}

      <div>
        <h2>TITA Questions (51-68)</h2>
        {Array.from(
          { length: TOTAL_QUESTIONS - MCQ_END },
          (_, i) => MCQ_END + i + 1
        ).map((qid) => (
          <div
            key={qid}
            style={{
              marginBottom: 20,
              padding: 10,
              border: "1px solid #ccc",
            }}
          >
            <h3>Question {qid}</h3>
            <input
              type="number"
              placeholder="Enter Integer"
              value={answers[qid] || ""}
              onChange={(e) => {
                const value = e.target.value;
                submitAnswer(qid, value);
              }}
              style={{
                padding: 8,
                fontSize: 16,
              }}
            />
            {answers[qid] && (
              <span style={{ marginLeft: 20, fontWeight: "bold" }}>
                Answer: {answers[qid]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
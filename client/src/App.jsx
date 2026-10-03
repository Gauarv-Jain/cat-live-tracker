import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import answerKeyData from "../../server/answerKey.json";

const socket = io(`http://${window.location.hostname}:3001`);

function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [answers, setAnswers] = useState({});
  const [answerKey, setAnswerKey] = useState(answerKeyData);

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
    console.log("Submitting answer:", {
      qid,
      answer,
    });

    socket.emit("answer-update", {
      qid,
      answer,
    });

    const updatedAnswers = { ...answers };
    if (!answer) {
      delete updatedAnswers[qid];
    } else {
      updatedAnswers[qid] = answer;
    }
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

  const questionIds = Object.keys(answerKey).map(Number).sort((a, b) => a - b);

  console.log("Rendering questions:", questionIds.length, "answerKey:", answerKey);

  return (
    <div style={{ padding: 20 }}>
      <h1>CAT Tracker - {questionIds.length} Questions</h1>

      {questionIds.map((qid) => {
        const question = answerKey[qid];
        if (!question) return null;

        return (
          <div
            key={qid}
            style={{
              marginBottom: 20,
              padding: 10,
              border: "1px solid #ccc",
            }}
          >
            <h3>Question {qid} ({question.type})</h3>

            {question.type === "MCQ" ? (
              <div>
                {["A", "B", "C", "D"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      const newAnswer = answers[qid] === opt ? "" : opt;
                      submitAnswer(qid, newAnswer);
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
            ) : (
              <div>
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
            )}
          </div>
        );
      })}
    </div>
  );
}

export default App;
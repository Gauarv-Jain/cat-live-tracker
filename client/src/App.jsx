import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import answerKeyData from "../../server/answerKey.json";

const socket = io(`http://${window.location.hostname}:3001`);

function getSections(key) {
  const sectionNames = key._config?.sectionOrder ?? Object.keys(key.sections ?? {});
  let questionOffset = 0;

  return sectionNames
    .filter((sectionName) => key.sections?.[sectionName])
    .map((name) => {
      const questions = key.sections[name];
      const questionIds = Object.keys(questions)
        .map(Number)
        .sort((first, second) => first - second);
      const startNumber = key._config?.numbering === "restart" ? 1 : questionOffset + 1;
      const overallStart = questionOffset + 1;
      questionOffset += questionIds.length;

      return { name, questions, questionIds, startNumber, overallStart };
    });
}

function normalizeSavedAnswers(savedAnswers, key) {
  if (!savedAnswers || typeof savedAnswers !== "object") return {};

  const sectionNames = key._config?.legacyQuestionOrder
    ?? key._config?.sectionOrder
    ?? Object.keys(key.sections ?? {});
  const hasSectionAnswers = Object.keys(key.sections ?? {}).some(
    (sectionName) => savedAnswers[sectionName] && typeof savedAnswers[sectionName] === "object"
  );
  if (hasSectionAnswers) return savedAnswers;

  const normalized = {};
  let overallQuestionId = 1;

  for (const sectionName of sectionNames) {
    const questionIds = Object.keys(key.sections?.[sectionName] ?? {})
      .map(Number)
      .sort((first, second) => first - second);
    normalized[sectionName] = {};

    for (const questionId of questionIds) {
      if (Object.hasOwn(savedAnswers, overallQuestionId)) {
        normalized[sectionName][questionId] = savedAnswers[overallQuestionId];
      }
      overallQuestionId += 1;
    }
  }

  return normalized;
}

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
      const restoredAnswers = normalizeSavedAnswers(session.answers, answerKeyData);
      setName(session.name || "");
      setJoined(session.joined || false);
      setAnswers(restoredAnswers);

      if (session.joined && session.name) {
        socket.emit("join-test", {
          name: session.name,
        });

        // Re-emit all saved answers to backend
        if (Object.keys(restoredAnswers).length > 0) {
          setTimeout(() => {
            Object.entries(restoredAnswers).forEach(
              ([section, sectionAnswers]) => {
                Object.entries(sectionAnswers).forEach(([qid, answer]) => {
                  socket.emit("answer-update", {
                    section,
                    qid: Number(qid),
                    answer,
                  });
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

  const submitAnswer = (section, qid, answer) => {
    console.log("Submitting answer:", {
      section,
      qid,
      answer,
    });

    socket.emit("answer-update", {
      section,
      qid,
      answer,
    });

    const updatedSectionAnswers = { ...(answers[section] ?? {}) };
    if (!answer) {
      delete updatedSectionAnswers[qid];
    } else {
      updatedSectionAnswers[qid] = answer;
    }
    const updatedAnswers = { ...answers, [section]: updatedSectionAnswers };
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

  const sections = getSections(answerKey);
  const totalQuestions = sections.reduce(
    (total, section) => total + section.questionIds.length,
    0
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>CAT Tracker - {totalQuestions} Questions</h1>

      {sections.map((section) => (
        <section key={section.name}>
          <h2 style={{ margin: "28px 0 14px" }}>{section.name}</h2>
          {section.questionIds.map((qid, index) => {
            const question = section.questions[qid];
            if (!question) return null;
            const localNumber = section.startNumber + index;
            const overallNumber = section.overallStart + index;
            const answer = answers[section.name]?.[qid];

            return (
              <div
                key={qid}
                style={{
                  marginBottom: 20,
                  padding: 10,
                  border: "1px solid #ccc",
                }}
              >
                <h3>
                  Question {localNumber}
                  {localNumber !== overallNumber && ` (Overall ${overallNumber})`}
                  {` (${question.type})`}
                </h3>

                {question.type === "MCQ" ? (
                  <div>
                    {["A", "B", "C", "D"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          const newAnswer = answer === opt ? "" : opt;
                          submitAnswer(section.name, qid, newAnswer);
                        }}
                        style={{
                          marginRight: 10,
                          padding: 8,
                          background:
                            answer === opt
                              ? "#d0d0ff"
                              : "#fff",
                          border: "1px solid #999",
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                    {answer && (
                      <span style={{ marginLeft: 20, fontWeight: "bold" }}>
                        Selected: {answer}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      placeholder="Enter Integer"
                      value={answer || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        submitAnswer(section.name, qid, value);
                      }}
                      style={{
                        padding: 8,
                        fontSize: 16,
                      }}
                    />
                    {answer && (
                      <span style={{ marginLeft: 20, fontWeight: "bold" }}>
                        Answer: {answer}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default App;
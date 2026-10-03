import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import answerKey from "../../server/answerKey.json";
import "./Admin.css";

const socket = io(`http://${window.location.hostname}:3001`, {
  autoConnect: false,
});

function buildSections(key) {
  const questionIds = Object.keys(key)
    .filter((questionId) => /^\d+$/.test(questionId))
    .map(Number)
    .sort((first, second) => first - second);
  const configuredSections = key._config?.sections ?? [];

  if (configuredSections.length === 0) {
    return [{ name: "Questions", questionIds, startNumber: 1 }];
  }

  let offset = 0;
  const sections = configuredSections.map(({ name, count }) => {
    const sectionQuestionIds = questionIds.slice(offset, offset + count);
    const startNumber = key._config.numbering === "restart" ? 1 : offset + 1;
    offset += count;

    return { name, questionIds: sectionQuestionIds, startNumber };
  });

  if (offset < questionIds.length) {
    sections.push({
      name: "Other questions",
      questionIds: questionIds.slice(offset),
      startNumber: key._config.numbering === "restart" ? 1 : offset + 1,
    });
  }

  return sections;
}

function getQuestionResult(answer, question) {
  const attempted = answer !== undefined && answer !== null && answer !== "";

  if (!attempted) {
    return { attempted, correct: false, points: 0 };
  }

  const correct = question.type === "MCQ"
    ? answer === question.correct
    : Number(answer) === Number(question.correct);
  const points = question.type === "MCQ"
    ? correct ? 3 : -1
    : correct ? 3 : 0;

  return { attempted, correct, points };
}

function formatPoints(points) {
  return `${points > 0 ? "+" : ""}${points} ${Math.abs(points) === 1 ? "mark" : "marks"}`;
}

function Admin() {
  const [students, setStudents] = useState({});
  const sections = buildSections(answerKey);
  const participants = Object.values(students).sort(
    (first, second) => (second.score ?? 0) - (first.score ?? 0)
  );

  useEffect(() => {
    const handleLiveUpdate = (data) => setStudents(data);
    socket.on("live-update", handleLiveUpdate);
    socket.connect();

    return () => {
      socket.off("live-update", handleLiveUpdate);
      socket.disconnect();
    };
  }, []);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">CAT LIVE TRACKER / ADMIN</p>
          <h1>Live results</h1>
        </div>
        <p className="participant-count">
          {participants.length} {participants.length === 1 ? "participant" : "participants"}
        </p>
      </header>

      <section className="totals-section" aria-labelledby="totals-heading">
        <div className="section-heading">
          <h2 id="totals-heading">Total marks</h2>
          <span>Live ranking</span>
        </div>

        {participants.length === 0 ? (
          <p className="empty-state">Waiting for participants to join.</p>
        ) : (
          <div className="total-grid">
            {participants.map((student, index) => (
              <article className="total-card" key={student.id ?? student.name}>
                <span className="rank-label">#{index + 1}</span>
                <h3>{student.name}</h3>
                <p className="total-score">
                  {student.score ?? 0}<span>marks</span>
                </p>
                <p className="answered-count">
                  {Object.keys(student.answers ?? {}).length} answered
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section-results" aria-labelledby="section-results-heading">
        <div className="section-heading">
          <h2 id="section-results-heading">Section comparison</h2>
          <span>Expand a section to compare answers</span>
        </div>

        {sections.map((section) => {
          const sectionScores = participants.map((student) => {
            const score = section.questionIds.reduce((total, questionId) => {
              const question = answerKey[questionId];
              const result = getQuestionResult(student.answers?.[questionId], question);
              return total + result.points;
            }, 0);

            return { student, score };
          });

          return (
            <details className="section-details" key={section.name}>
              <summary>
                <span className="section-title">
                  <strong>{section.name}</strong>
                  <small>{section.questionIds.length} questions</small>
                </span>
                <span className="section-score-list">
                  {sectionScores.map(({ student, score }) => (
                    <span className="section-score" key={student.id ?? student.name}>
                      <span>{student.name}</span>
                      <strong>{score}</strong>
                    </span>
                  ))}
                </span>
              </summary>

              {participants.length === 0 ? (
                <p className="empty-state section-empty">No participants yet.</p>
              ) : (
                <div className="comparison-scroll">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th className="question-column" scope="col">Question</th>
                        {participants.map((student) => (
                          <th scope="col" key={student.id ?? student.name}>{student.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.questionIds.map((questionId, index) => {
                        const question = answerKey[questionId];

                        return (
                          <tr key={questionId}>
                            <th className="question-column" scope="row">
                              <strong>Q{section.startNumber + index} / Q{questionId}</strong>
                              <small>{question.type} | Key {question.correct}</small>
                            </th>
                            {participants.map((student) => {
                              const answer = student.answers?.[questionId];
                              const result = getQuestionResult(answer, question);
                              const resultClass = !result.attempted
                                ? "unattempted"
                                : result.correct ? "correct" : "incorrect";

                              return (
                                <td key={student.id ?? student.name}>
                                  <div className={`answer-cell ${resultClass}`}>
                                    <span className="answer-status">
                                      {!result.attempted
                                        ? "Not attempted"
                                        : result.correct ? "Correct" : "Incorrect"}
                                    </span>
                                    <span className="answer-value">
                                      Selected: {result.attempted ? answer : "-"}
                                    </span>
                                    <span className="answer-points">
                                      {formatPoints(result.points)}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          );
        })}
      </section>
    </main>
  );
}

export default Admin;
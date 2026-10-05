import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import answerKey from "../../server/answerKey.json";
import ThemeToggle from "./ThemeToggle.jsx";
import "./Admin.css";

const socket = io(`http://${window.location.hostname}:3001`, {
  autoConnect: false,
});

function buildSections(key) {
  const sectionNames = key._config?.sectionOrder ?? Object.keys(key.sections ?? {});
  let offset = 0;

  return sectionNames
    .filter((name) => key.sections?.[name])
    .map((name) => {
      const questions = key.sections[name];
      const questionIds = Object.keys(questions)
        .map(Number)
        .sort((first, second) => first - second);
      const startNumber = key._config?.numbering === "restart" ? 1 : offset + 1;
      const overallStart = offset + 1;
      offset += questionIds.length;

      return { name, questions, questionIds, startNumber, overallStart };
    });
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

function getStudentStats(student, selectedSections) {
  const stats = {
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unattempted: 0,
    score: 0,
    total: 0,
  };

  for (const section of selectedSections) {
    stats.total += section.questionIds.length;

    for (const questionId of section.questionIds) {
      const question = section.questions[questionId];
      const answer = student.answers?.[section.name]?.[questionId];
      const result = getQuestionResult(answer, question);
      stats.score += result.points;

      if (!result.attempted) continue;
      stats.attempted += 1;
      if (result.correct) {
        stats.correct += 1;
      } else {
        stats.incorrect += 1;
      }
    }
  }

  stats.unattempted = stats.total - stats.attempted;
  return stats;
}

function AttemptSummary({ stats, compact = false }) {
  const outcomes = [
    { label: "Correct", value: stats.correct, className: "correct" },
    { label: "Incorrect", value: stats.incorrect, className: "incorrect" },
    { label: "Unattempted", value: stats.unattempted, className: "unattempted" },
  ];
  const progressBar = (
    <div className="attempt-bar" aria-hidden="true">
      {outcomes.map((outcome) => (
        <span
          className={`attempt-segment ${outcome.className}`}
          key={outcome.label}
          style={{
            width: `${stats.total ? (outcome.value / stats.total) * 100 : 0}%`,
          }}
        />
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="attempt-summary compact">
        <p className="compact-attempt-counts">
          <span>Attempted <strong>{stats.attempted}/{stats.total}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Correct <strong>{stats.correct}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Incorrect <strong>{stats.incorrect}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Unattempted <strong>{stats.unattempted}</strong></span>
        </p>
        {progressBar}
      </div>
    );
  }

  return (
    <div className="attempt-summary">
      <div className="attempted-total">
        <span>Attempted</span>
        <strong>{stats.attempted} / {stats.total}</strong>
      </div>
      {progressBar}
      <div className="attempt-legend">
        {outcomes.map((outcome, index) => (
          <span className="attempt-legend-item" key={outcome.label}>
            {outcome.label} <strong>{outcome.value}</strong>
            {index < outcomes.length - 1 && (
              <span className="attempt-separator" aria-hidden="true">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function animateRankChange(card, currentRect, previousRect, previousRank, rank, reduceMotion) {
  if (!reduceMotion && previousRect && typeof card.animate === "function") {
    const deltaX = previousRect.left - currentRect.left;
    const deltaY = previousRect.top - currentRect.top;

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      card.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 360, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" }
      );
    }
  }

  if (!reduceMotion && previousRank !== undefined && previousRank !== rank) {
    card.classList.remove("rank-overtake");
    void card.offsetWidth;
    card.classList.add("rank-overtake");
    card.addEventListener("animationend", (event) => {
      if (event.target === card) card.classList.remove("rank-overtake");
    }, { once: true });
  }
}

function Admin() {
  const [students, setStudents] = useState({});
  const rankingCards = useRef(new Map());
  const previousPositions = useRef(new Map());
  const previousRanks = useRef(new Map());
  const sectionRankingCards = useRef(new Map());
  const previousSectionPositions = useRef(new Map());
  const previousSectionRanks = useRef(new Map());
  const sections = buildSections(answerKey);
  const participants = Object.values(students).sort(
    (first, second) => (second.score ?? 0) - (first.score ?? 0)
  ).map((student) => ({
    ...student,
    stats: getStudentStats(student, sections),
  })).sort((first, second) => second.stats.score - first.stats.score);
  const sectionRankings = sections.map((section) => ({
    section,
    rankings: participants.map((student) => ({
      student,
      stats: getStudentStats(student, [section]),
    })).sort((first, second) => second.stats.score - first.stats.score),
  }));

  useLayoutEffect(() => {
    const nextPositions = new Map();
    const nextRanks = new Map();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    participants.forEach((student, index) => {
      const studentId = student.id ?? student.name;
      const card = rankingCards.current.get(studentId);
      if (!card) return;

      const rank = index + 1;
      const currentRect = card.getBoundingClientRect();
      const previousRect = previousPositions.current.get(studentId);
      const previousRank = previousRanks.current.get(studentId);
      animateRankChange(card, currentRect, previousRect, previousRank, rank, reduceMotion);

      nextPositions.set(studentId, {
        left: currentRect.left,
        top: currentRect.top,
      });
      nextRanks.set(studentId, rank);
    });

    previousPositions.current = nextPositions;
    previousRanks.current = nextRanks;
  }, [participants]);

  useLayoutEffect(() => {
    const nextPositions = new Map();
    const nextRanks = new Map();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    sectionRankings.forEach(({ section, rankings }) => {
      rankings.forEach(({ student }, index) => {
        const studentId = student.id ?? student.name;
        const rankingKey = JSON.stringify([section.name, studentId]);
        const card = sectionRankingCards.current.get(rankingKey);
        if (!card) return;

        const rank = index + 1;
        const currentRect = card.getBoundingClientRect();
        const previousRect = previousSectionPositions.current.get(rankingKey);
        const previousRank = previousSectionRanks.current.get(rankingKey);
        animateRankChange(card, currentRect, previousRect, previousRank, rank, reduceMotion);

        nextPositions.set(rankingKey, {
          left: currentRect.left,
          top: currentRect.top,
        });
        nextRanks.set(rankingKey, rank);
      });
    });

    previousSectionPositions.current = nextPositions;
    previousSectionRanks.current = nextRanks;
  }, [sectionRankings]);

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
        <ThemeToggle />
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
              <article
                className="total-card"
                key={student.id ?? student.name}
                ref={(element) => {
                  const studentId = student.id ?? student.name;
                  if (element) {
                    rankingCards.current.set(studentId, element);
                  } else {
                    rankingCards.current.delete(studentId);
                  }
                }}
              >
                <div className="total-card-heading">
                  <span className="rank-label">#{index + 1}</span>
                  <h3>{student.name}</h3>
                  <p className="total-score">
                    {student.stats.score}<span>marks</span>
                  </p>
                </div>
                <AttemptSummary stats={student.stats} compact />
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

        {sectionRankings.map(({ section, rankings }) => {
          return (
            <details className="section-details" key={section.name}>
              <summary>
                <span className="section-title">
                  <strong>{section.name}</strong>
                  <small>{section.questionIds.length} questions</small>
                </span>
                <span className="section-score-list">
                  {rankings.map(({ student, stats }, index) => {
                    const studentId = student.id ?? student.name;
                    const rankingKey = JSON.stringify([section.name, studentId]);

                    return (
                      <span
                        className="section-score"
                        key={studentId}
                        ref={(element) => {
                          if (element) {
                            sectionRankingCards.current.set(rankingKey, element);
                          } else {
                            sectionRankingCards.current.delete(rankingKey);
                          }
                        }}
                      >
                        <span className="section-score-heading">
                          <span className="section-rank">#{index + 1}</span>
                          <span className="section-student-name">{student.name}</span>
                          <strong>{stats.score} marks</strong>
                        </span>
                        <AttemptSummary stats={stats} />
                      </span>
                    );
                  })}
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
                        const question = section.questions[questionId];
                        const overallQuestionNumber = section.overallStart + index;

                        return (
                          <tr key={questionId}>
                            <th className="question-column" scope="row">
                              <strong>Q{section.startNumber + index} / Q{overallQuestionNumber}</strong>
                              <small>{question.type} | Key {question.correct}</small>
                            </th>
                            {participants.map((student) => {
                              const answer = student.answers?.[section.name]?.[questionId];
                              const result = getQuestionResult(answer, question);
                              const resultClass = !result.attempted
                                ? "unattempted"
                                : result.correct ? "correct" : "incorrect";

                              return (
                                <td key={student.id ?? student.name}>
                                  <div className={`answer-cell ${resultClass}`}>
                                    <span className="answer-status">
                                      {!result.attempted
                                        ? "Unanswered"
                                        : result.correct ? "Correct" : "Incorrect"}
                                    </span>
                                    <span className="answer-detail">
                                      <strong className="answer-value">
                                        {result.attempted ? answer : "-"}
                                      </strong>
                                      <span className="answer-points">
                                        {result.points > 0 ? "+" : ""}{result.points} pts
                                      </span>
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
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import answerKeyData from "../../server/answerKey.json";
import "./App.css";

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

function QuestionResponse({ sectionName, questionId, question, answer, onAnswer, compact = false }) {
  if (question.type === "MCQ") {
    return (
      <div
        className={`answer-options${compact ? " compact" : ""}`}
        role="group"
        aria-label={`Answer options for ${sectionName} question ${questionId}`}
      >
        {["A", "B", "C", "D"].map((option) => (
          <button
            aria-pressed={answer === option}
            className={`answer-option${answer === option ? " selected" : ""}`}
            key={option}
            onClick={() => onAnswer(answer === option ? "" : option)}
            type="button"
          >
            <span>{option}</span>
            {answer === option && <small>Selected</small>}
          </button>
        ))}
      </div>
    );
  }

  const inputId = `${compact ? "desktop" : "mobile"}-answer-${sectionName}-${questionId}`;

  return (
    <div className={`numeric-answer${compact ? " compact" : ""}`}>
      <label htmlFor={inputId}>Your answer</label>
      <input
        id={inputId}
        inputMode="decimal"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        onChange={(event) => onAnswer(event.target.value)}
        placeholder={compact ? "Number" : "Enter a number"}
        type="number"
        value={answer}
      />
    </div>
  );
}

const sections = getSections(answerKeyData);

function readSavedSession() {
  try {
    const saved = window.localStorage.getItem("studentSession");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function App() {
  const [initialSession] = useState(readSavedSession);
  const initialAnswers = normalizeSavedAnswers(initialSession?.answers, answerKeyData);
  const [name, setName] = useState(() => initialSession?.name ?? "");
  const [joined, setJoined] = useState(() => Boolean(initialSession?.joined));
  const [answers, setAnswers] = useState(initialAnswers);
  const [activeSectionName, setActiveSectionName] = useState(
    () => sections[0]?.name ?? ""
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    if (!initialSession?.joined || !initialSession.name) return undefined;

    socket.emit("join-test", { name: initialSession.name });
    const restoredAnswers = normalizeSavedAnswers(initialSession.answers, answerKeyData);
    const timeoutId = window.setTimeout(() => {
      Object.entries(restoredAnswers).forEach(([section, sectionAnswers]) => {
        Object.entries(sectionAnswers).forEach(([qid, answer]) => {
          socket.emit("answer-update", {
            section,
            qid: Number(qid),
            answer,
          });
        });
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [initialSession]);

  const saveSession = (data) => {
    try {
      window.localStorage.setItem("studentSession", JSON.stringify(data));
    } catch {
      return;
    }
  };

  const joinTest = (event) => {
    event.preventDefault();
    const studentName = name.trim();
    if (!studentName) return;

    socket.emit("join-test", { name: studentName });
    setName(studentName);
    setJoined(true);
    saveSession({ name: studentName, joined: true, answers });
  };

  const submitAnswer = (section, questionId, answer) => {
    socket.emit("answer-update", {
      section,
      qid: questionId,
      answer,
    });

    const updatedSectionAnswers = { ...(answers[section] ?? {}) };
    if (answer === "") {
      delete updatedSectionAnswers[questionId];
    } else {
      updatedSectionAnswers[questionId] = answer;
    }
    const updatedAnswers = { ...answers, [section]: updatedSectionAnswers };
    setAnswers(updatedAnswers);
    saveSession({ name, joined, answers: updatedAnswers });
  };

  const activeSectionIndex = sections.findIndex(
    (section) => section.name === activeSectionName
  );
  const activeSection = sections[activeSectionIndex] ?? sections[0];

  if (!joined) {
    return (
      <main className="test-app join-screen">
        <header className="test-brand">CAT LIVE TRACKER</header>
        <form className="join-panel" onSubmit={joinTest}>
          <p className="test-eyebrow">STUDENT ACCESS</p>
          <h1>Join the test</h1>
          <label htmlFor="student-name">Your name</label>
          <input
            autoComplete="name"
            id="student-name"
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            value={name}
          />
          <button className="primary-action" type="submit" disabled={!name.trim()}>
            Join test
          </button>
        </form>
      </main>
    );
  }

  if (!activeSection) return null;

  const questionId = activeSection.questionIds[activeQuestionIndex];
  const question = activeSection.questions[questionId];
  const answer = answers[activeSection.name]?.[questionId] ?? "";
  const answeredCount = activeSection.questionIds.filter(
    (id) => answers[activeSection.name]?.[id] !== undefined
      && answers[activeSection.name]?.[id] !== ""
  ).length;
  const overallAnsweredCount = Object.values(answers).reduce(
    (total, sectionAnswers) => total + Object.keys(sectionAnswers).length,
    0
  );
  const localQuestionNumber = activeSection.startNumber + activeQuestionIndex;
  const overallQuestionNumber = activeSection.overallStart + activeQuestionIndex;
  const previousSection = sections[activeSectionIndex - 1];
  const nextSection = sections[activeSectionIndex + 1];

  const goPrevious = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    } else if (previousSection) {
      setActiveSectionName(previousSection.name);
      setActiveQuestionIndex(previousSection.questionIds.length - 1);
    }
  };

  const goNext = () => {
    if (activeQuestionIndex < activeSection.questionIds.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    } else if (nextSection) {
      setActiveSectionName(nextSection.name);
      setActiveQuestionIndex(0);
    }
  };

  return (
    <main className="test-app">
      <header className="test-header">
        <span className="test-brand">CAT LIVE TRACKER</span>
        <span className="student-name">{name}</span>
      </header>

      <nav className="section-tabs" aria-label="Test sections">
        {sections.map((section) => {
          const sectionAnswered = section.questionIds.filter(
            (id) => answers[section.name]?.[id] !== undefined
              && answers[section.name]?.[id] !== ""
          ).length;
          const isActive = section.name === activeSection.name;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={`section-tab${isActive ? " active" : ""}`}
              key={section.name}
              onClick={() => {
                setActiveSectionName(section.name);
                setActiveQuestionIndex(0);
              }}
              type="button"
            >
              <span>{section.name}</span>
              <small>{sectionAnswered}/{section.questionIds.length}</small>
            </button>
          );
        })}
      </nav>

      <section className="section-progress" aria-label={`${activeSection.name} progress`}>
        <div className="progress-copy">
          <h1>{activeSection.name}</h1>
          <span>{answeredCount} of {activeSection.questionIds.length} answered</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span
            style={{
              width: `${(answeredCount / activeSection.questionIds.length) * 100}%`,
            }}
          />
        </div>
        <p className="overall-progress">{overallAnsweredCount} answered across all sections</p>
      </section>

      <div className="desktop-question-list" aria-label={`${activeSection.name} questions`}>
        {activeSection.questionIds.map((id, index) => {
          const itemQuestion = activeSection.questions[id];
          const itemAnswer = answers[activeSection.name]?.[id] ?? "";
          const isAnswered = itemAnswer !== "";
          const localNumber = activeSection.startNumber + index;
          const overallNumber = activeSection.overallStart + index;

          return (
            <article
              className={`desktop-question-card${isAnswered ? " answered" : ""}`}
              key={id}
            >
              <div className="desktop-question-heading">
                <strong>Q{localNumber}</strong>
                {localNumber !== overallNumber && <span>Q{overallNumber}</span>}
                {isAnswered && <span className="marked-badge">Marked</span>}
                <small>{itemQuestion.type}</small>
              </div>
              <QuestionResponse
                answer={itemAnswer}
                compact
                onAnswer={(value) => submitAnswer(activeSection.name, id, value)}
                question={itemQuestion}
                questionId={id}
                sectionName={activeSection.name}
              />
            </article>
          );
        })}
      </div>

      <div className="mobile-question-flow">
        <nav className="question-grid" aria-label={`${activeSection.name} questions`}>
          {activeSection.questionIds.map((id, index) => {
            const isAnswered = answers[activeSection.name]?.[id] !== undefined
              && answers[activeSection.name]?.[id] !== "";
            const isCurrent = index === activeQuestionIndex;

            return (
              <button
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${activeSection.startNumber + index}${isAnswered ? ", answered" : ", not answered"}`}
                className={`question-jump${isCurrent ? " current" : ""}${isAnswered ? " answered" : ""}`}
                key={id}
                onClick={() => setActiveQuestionIndex(index)}
                type="button"
              >
                {activeSection.startNumber + index}
                {isAnswered && <span className="question-marked-check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </nav>

        <section className="active-question" aria-labelledby="active-question-title">
          <div className="question-meta">
            <span>{activeSection.name}</span>
            {localQuestionNumber !== overallQuestionNumber && (
              <span>Overall Q{overallQuestionNumber}</span>
            )}
            <span className="question-type">{question.type}</span>
          </div>
          <div className="question-title-row">
            <h2 id="active-question-title">Question {localQuestionNumber}</h2>
            <button
              className="clear-answer"
              disabled={answer === ""}
              onClick={() => submitAnswer(activeSection.name, questionId, "")}
              type="button"
            >
              Clear answer
            </button>
          </div>

          <div className="question-answer-area">
            <QuestionResponse
              answer={answer}
              onAnswer={(value) => submitAnswer(activeSection.name, questionId, value)}
              question={question}
              questionId={questionId}
              sectionName={activeSection.name}
            />
          </div>

          <footer className="question-navigation">
            <button
              className="secondary-action"
              disabled={activeQuestionIndex === 0 && !previousSection}
              onClick={goPrevious}
              type="button"
            >
              {activeQuestionIndex === 0 && previousSection ? "Previous section" : "Previous"}
            </button>
            <span>{localQuestionNumber} / {activeSection.questionIds.length}</span>
            <button
              className="primary-action"
              disabled={activeQuestionIndex === activeSection.questionIds.length - 1 && !nextSection}
              onClick={goNext}
              type="button"
            >
              {activeQuestionIndex === activeSection.questionIds.length - 1
                ? nextSection ? "Next section" : "End of test"
                : "Next"}
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default App;
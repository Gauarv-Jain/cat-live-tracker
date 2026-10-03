const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const answerKey = require("./answerKey.json");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

/*
==================================
STUDENT STORAGE
==================================
*/

const students = {};

/*
==================================
SCORING
==================================
*/

function calculateScore(answers) {
  let score = 0;

  for (const [sectionName, sectionAnswers] of Object.entries(answers)) {
    const sectionQuestions = answerKey.sections[sectionName];
    if (!sectionQuestions) continue;

    for (const [qid, userAnswer] of Object.entries(sectionAnswers)) {
      const question = sectionQuestions[qid];
      if (!question) continue;

      if (question.type === "MCQ") {
        score += userAnswer === question.correct ? 3 : -1;
      } else if (question.type === "TITA") {
        if (Number(userAnswer) === Number(question.correct)) {
          score += 3;
        }
      }
    }
  }

  return score;
}

function resolveAnswerLocation(section, qid) {
  if (section && answerKey.sections[section]?.[qid]) {
    return { section, questionId: String(qid) };
  }

  if (section) return null;

  const legacyQuestionId = Number(qid);
  if (!Number.isInteger(legacyQuestionId)) return null;

  let overallQuestionId = 1;
  const legacyQuestionOrder = answerKey._config.legacyQuestionOrder
    ?? answerKey._config.sectionOrder;
  for (const sectionName of legacyQuestionOrder) {
    const questionIds = Object.keys(answerKey.sections[sectionName] ?? {})
      .map(Number)
      .sort((first, second) => first - second);

    for (const questionId of questionIds) {
      if (overallQuestionId === legacyQuestionId) {
        return { section: sectionName, questionId: String(questionId) };
      }
      overallQuestionId += 1;
    }
  }

  return null;
}

/*
==================================
SOCKET CONNECTIONS
==================================
*/

io.on("connection", (socket) => {
  console.log("User connected");
  socket.emit("live-update", students);

  /*
  ==============================
  JOIN TEST
  ==============================
  */

  socket.on("join-test", ({ name }) => {
    // Check if student already exists by name
    let existingStudent = null;
    let existingSocketId = null;

    for (const sId in students) {
      if (students[sId].name === name) {
        existingStudent = students[sId];
        existingSocketId = sId;
        break;
      }
    }

    if (existingStudent) {
      // Student already exists, update socket ID and keep answers/score
      delete students[existingSocketId];
      students[socket.id] = {
        ...existingStudent,
        id: socket.id,
      };
      console.log(
        `${name} rejoined with new socket. Restored score: ${existingStudent.score}`
      );
    } else {
      // New student
      students[socket.id] = {
        id: socket.id,
        name,
        answers: {},
        score: 0,
      };
      console.log(`${name} joined as new student`);
    }

    io.emit("live-update", students);
  });

  /*
  ==============================
  ANSWER UPDATE
  ==============================
  */

  socket.on("answer-update", ({ section, qid, answer }) => {
    const student = students[socket.id];

    if (!student) return;

    const location = resolveAnswerLocation(section, qid);
    if (!location) return;

    console.log(
      `Answer from ${student.name}: ${location.section} Q${location.questionId} = ${answer}`
    );

    const sectionAnswers = {
      ...(student.answers[location.section] ?? {}),
    };
    if (!answer) {
      delete sectionAnswers[location.questionId];
    } else {
      sectionAnswers[location.questionId] = answer;
    }
    student.answers = {
      ...student.answers,
      [location.section]: sectionAnswers,
    };

    student.score = calculateScore(student.answers);

    console.log(
      `Updated student object:`,
      student
    );

    io.emit("live-update", students);
  });

  /*
  ==============================
  DISCONNECT
  ==============================
  */

  socket.on("disconnect", () => {
    delete students[socket.id];

    io.emit("live-update", students);

    console.log("User disconnected");
  });
});

/*
==================================
START SERVER
==================================
*/

server.listen(3001, () => {
  console.log(
    "Server running on port 3001"
  );
});
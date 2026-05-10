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

  for (const qid in answers) {
    const userAnswer = answers[qid];

    const question = answerKey[qid];

    if (!question) continue;

    // MCQ
    if (question.type === "MCQ") {
      if (userAnswer === question.correct) {
        score += 3;
      } else {
        score -= 1;
      }
    }

    // TITA
    if (question.type === "TITA") {
      if (
        Number(userAnswer) ===
        Number(question.correct)
      ) {
        score += 3;
      }
    }
  }

  return score;
}

/*
==================================
SOCKET CONNECTIONS
==================================
*/

io.on("connection", (socket) => {
  console.log("User connected");

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

  socket.on("answer-update", ({ qid, answer }) => {
    const student = students[socket.id];

    if (!student) return;

    console.log(
      `Answer from ${student.name}: Q${qid} = ${answer}`
    );

    student.answers = {
      ...student.answers,
      [qid]: answer,
    };

    student.score = calculateScore(
      student.answers
    );

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
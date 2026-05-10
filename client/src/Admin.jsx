
import { useEffect, useState } from "react";

import { io } from "socket.io-client";

const socket = io("http://192.168.1.7:3001");

function Admin() {
  const [students, setStudents] =
    useState({});

  useEffect(() => {
    socket.on(
      "live-update",
      (data) => {
        setStudents(data);
      }
    );

    return () => {
      socket.off("live-update");
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Live Dashboard</h1>

      {Object.values(students).map(
        (student, index) => (
          <div
            key={index}
            style={{
              border:
                "1px solid black",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <h2>{student.name}</h2>

            <p>
              Score:
              {student.score}
            </p>

            <p>
              Answers:
              {JSON.stringify(
                student.answers
              )}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default Admin;
import { Socket } from "socket.io";
import { io } from "./index.js";
import { verifyToken } from "./utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";

export const setupSocket = (io: any) => {
  io.use(verifyToken);

  io.on("connection", (socket: Socket) => {
    console.log("a user connected ", socket.id);

    socket.on("disconnect", () => {
      console.log("user disconnected ", socket.id);
    });

    socket.on("joinRoom", ({ room }) => {
      socket.join(room);
      console.log("user joined room ", room);
    });

    socket.on("message", (data) => {
      console.log(data);
      io.to(data.room).emit("newMessage", {
        text: data.text,
        author: data.author,
        id: uuidv4(),
      });
    });
  });
};

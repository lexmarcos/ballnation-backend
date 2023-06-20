import { Socket } from "socket.io";
import { io } from "./index.js";
import { verifyToken } from "./utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";
export interface IRoom {
  room: string;
  numberOfPlayers: 2 | 4 | 6 | 8;
  typeOfGame: "classic" | "withPowerUps";
  duration: number;
  players: string[];
  closed: string;
  id: string;
}

interface IRooms {
  [key: string]: IRoom;
}

export let rooms: IRooms = {};

const createRoom = (roomData: IRoom) => {
  rooms[roomData.id] = roomData;
  io.emit("roomCreated", roomData);
};

export const setupSocket = (io: any) => {
  io.use(verifyToken);

  io.on("connection", (socket: Socket) => {
    console.log("a user connected ", socket.id);

    socket.on("disconnect", () => {
      console.log("user disconnected ", socket.id);
    });

    socket.on("createRoom", (roomData: IRoom, callback: Function) => {
      console.log("roomData", roomData);
      callback("success");
      createRoom(roomData);
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

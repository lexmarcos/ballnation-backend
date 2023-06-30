import { Socket } from "socket.io";
import { io } from "./index.js";
import { verifyToken } from "./utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";

export interface IPlayer {
  socketId: string;
  username: string;
}

export enum GameStatus {
  WaitingPlayers = "waiting players",
  Playing = "playing",
  FinishedGame = "finished game",
}

export interface IRoom {
  room: string;
  numberOfPlayers: 2 | 4 | 6 | 8;
  typeOfGame: "classic" | "withPowerUps";
  duration: number;
  players: IPlayer[];
  gameStatus: GameStatus;
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

    socket.on("joinLobby", () => {
      socket.join("lobby");
      console.log("user joined to lobby");
      socket.emit("allRooms", rooms);
    });

    socket.on("joinRoom", ({ room, username }) => {
      console.log(room);
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      } else if (rooms[room].players.length >= rooms[room].numberOfPlayers) {
        socket.emit("error", "Room is full");
      } else {
        socket.join(room);
        socket.emit("joinedRoom", rooms[room]);
        rooms[room].players.push({ socketId: socket.id, username });
        console.log("user joined room ", room);
        if (rooms[room].players.length === rooms[room].numberOfPlayers) {
          rooms[room].gameStatus = GameStatus.Playing;
          io.to(room).emit("startGame");
        }
      }
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

import { Socket } from "socket.io";
import { io } from "./index.js";
import { verifyToken } from "./utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";

export interface IPlayerStats {
  goals: number;
}

export interface IPlayer {
  socketId: string;
  username: string;
  stats: IPlayerStats;
}

export enum GameStatus {
  WaitingPlayers = "waiting players",
  Playing = "playing",
  FinishedGame = "finished game",
}

export interface ITeam {
  players: IPlayer[];
}

export interface IRoom {
  room: string;
  numberOfPlayers: 2 | 4 | 6 | 8;
  typeOfGame: "classic" | "withPowerUps";
  duration: number;
  teams: {
    blue: ITeam;
    red: ITeam;
  };
  gameStatus: GameStatus;
  id: string;
}

interface IRooms {
  [key: string]: IRoom;
}

export let rooms: IRooms = {};

const createRoom = (roomData: IRoom) => {
  roomData.gameStatus = GameStatus.WaitingPlayers;
  rooms[roomData.id] = roomData;
  io.to("lobby").emit("roomCreated", roomData);
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
      console.log("user joined to lobby");

      socket.join("lobby");
      socket.emit("allRooms", rooms);
    });

    const checkIfPlayerExistisInTeam = (room: string, team: string, username: string) => {
      return rooms[room].teams[team].players.find(
        (player: { username: string }) => player.username === username
      );
    };

    const checkIfPlayerExistisInSomeTeam = (room: string, username: string) => {
      return (
        checkIfPlayerExistisInTeam(room, "blue", username) ||
        checkIfPlayerExistisInTeam(room, "red", username)
      );
    };

    const insertPlayerInTeam = (room: string, team: string, username: string) => {
      const player: IPlayer = {
        socketId: socket.id,
        username: username,
        stats: {
          goals: 0,
        },
      };
      rooms[room].teams[team].players.push(player);
      console.log(`user ${username} joined room ${room} on team ${team}`);
      io.to(room).emit("joinedToTeam", rooms[room]);
      io.to("lobby").emit("roomUpdated", rooms[room]);
      const totalPlayers =
        rooms[room].teams.blue.players.length + rooms[room].teams.red.players.length;
      if (totalPlayers === rooms[room].numberOfPlayers) {
        rooms[room].gameStatus = GameStatus.Playing;
        io.to(room).emit("startGame");
      }
    };

    socket.on("joinTeam", ({ room, team, username }) => {
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      } else if (rooms[room].gameStatus !== GameStatus.WaitingPlayers) {
        socket.emit("error", "Game already started");
      } else if (rooms[room].teams[team].players.length >= rooms[room].numberOfPlayers / 2) {
        socket.emit("error", "Team is full");
      } else if (checkIfPlayerExistisInTeam(room, team, username)) {
        socket.emit("error", "Username already exists in this team");
      } else if (checkIfPlayerExistisInSomeTeam(room, username)) {
        socket.emit("error", "Username already exists in some team");
      } else {
        insertPlayerInTeam(room, team, username);
      }
    });

    socket.on("joinRoom", ({ room }) => {
      console.log("user joined room", room);
      socket.join(room);
      socket.emit("joinedRoom", rooms[room]);
    });

    socket.on("message", (data) => {
      io.to(data.room).emit("newMessage", {
        text: data.text,
        author: data.author,
        id: uuidv4(),
      });
    });
  });
};

import { Socket } from "socket.io";
import { verifyToken } from "../utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";
import ServerAndSocket from "../utils/serverAndSocket.js";
import { IEngineData, createEngine, gameLoop } from "../game/index.js";
import { GameStatus, IPlayer, IRoom, IRooms } from "./types.js";

export let rooms: IRooms = {};

const io = ServerAndSocket.getInstance().io;

const createRoom = (roomData: IRoom) => {
  roomData.gameStatus = GameStatus.WaitingPlayers;
  rooms[roomData.id] = roomData;
  io.to("lobby").emit("roomCreated", roomData);
};

const checkIfPlayerExistisInTeam = (room: string, team: string, username: string) => {
  if(!rooms[room]) return false;
  return rooms[room].teams[team].players.find(
    (player: { username: string }) => player.username === username
  );
};

const checkIfPlayerExistisInSomeTeam = (room: string, username: string): string => {
  if (checkIfPlayerExistisInTeam(room, "blue", username)) {
    return "blue";
  } else if (checkIfPlayerExistisInTeam(room, "red", username)) {
    return "red";
  } else {
    return "no team";
  }
};

const initRoomGame = (room: string) => {
  const roomData = rooms[room];
  roomData.gameLoopInterval = null;
  roomData.engineData = createEngine(roomData.numberOfPlayers);
  roomData.gameState = {
    score: {
      blue: 0,
      red: 0,
    },
    winner: "draw",
    playersPositions: [],
    ballPosition: {
      x: 0,
      y: 0,
    },
  };
  rooms[room].gameStatus = GameStatus.Playing;
  io.to(room).emit("startGame");
  gameLoop(roomData.gameLoopInterval, roomData.engineData, roomData.gameState, room);
};

const insertPlayerInTeam = (room: string, team: string, username: string, socket: Socket) => {
  const player: IPlayer = {
    socketId: socket.id,
    username: username,
    stats: {
      goals: 0,
    },
  };
  rooms[room].teams[team].players.push(player);
  io.to(room).emit("joinedToTeam", rooms[room]);
  io.to("lobby").emit("roomUpdated", rooms[room]);
  const totalPlayers =
    rooms[room].teams.blue.players.length + rooms[room].teams.red.players.length;

  console.log(`user ${username} joined room ${room} on team ${team}`);
  if (totalPlayers === rooms[room].numberOfPlayers) {
    initRoomGame(room);
  }
};

export const setupSocket = () => {
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

    socket.on("joinTeam", ({ room, team, username }) => {
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      } else if (rooms[room].gameStatus !== GameStatus.WaitingPlayers) {
        socket.emit("error", "Game already started");
      } else if (rooms[room].teams[team].players.length >= rooms[room].numberOfPlayers / 2) {
        socket.emit("error", "Team is full");
      } else if (checkIfPlayerExistisInTeam(room, team, username)) {
        socket.emit("error", "Username already exists in this team");
      } else if (checkIfPlayerExistisInSomeTeam(room, username) !== "no team") {
        socket.emit("error", "Username already exists in some team");
      } else {
        insertPlayerInTeam(room, team, username, socket);
      }
    });

    socket.on("joinRoom", ({ room, username }) => {
      console.log("user joined room", room);
      const teamOfPlayer = checkIfPlayerExistisInSomeTeam(room, username);
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      }
      if (rooms[room].gameStatus === GameStatus.Playing) {
        if (teamOfPlayer !== "no team") {
          rooms[room].teams[teamOfPlayer].players.find(
            (player: IPlayer) => player.username === username
          ).status = "online";
        }
      }
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

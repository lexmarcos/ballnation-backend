import { Socket } from "socket.io";
import { verifyToken } from "../utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";
import ServerAndSocket from "../utils/serverAndSocket.js";
import { IEngineData, createEngine, gameLoop } from "../game/index.js";
import { GameStatus, IPlayer, IRoom, IRoomData, IRooms } from "./types.js";
import Matter from "matter-js";

export let rooms: IRooms = {};

const io = ServerAndSocket.getInstance().io;

const createRoom = (roomData: IRoomData) => {
  roomData.gameStatus = GameStatus.WaitingPlayers;
  const roomObject: IRoom = {
    data: roomData,
    gameLoopInterval: null,
    engineData: null,
    gameState: {
      score: {
        blue: 0,
        red: 0,
      },
      winner: "draw",
      playersPositions: null,
      ballPosition: {
        x: 0,
        y: 0,
      },
    },
  };
  rooms[roomData.id] = roomObject;
  io.to("lobby").emit("roomCreated", roomData);
};

const checkIfPlayerExistisInTeam = (room: string, team: string, username: string) => {
  const roomData = rooms[room].data;
  if (!rooms[room]) return false;
  return roomData.teams[team].players.find(
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

const getPlayersUsername = (room: string): string[] => {
  const roomObject = rooms[room];
  const roomData = rooms[room].data;
  const playersUsername: string[] = [];
  roomData.teams.blue.players.forEach((player) => {
    playersUsername.push(player.username);
  });
  roomData.teams.red.players.forEach((player) => {
    playersUsername.push(player.username);
  });
  return playersUsername;
};

const getPositionsOfPlayersBodies = (room: string): Matter.Vector[] => {
  const players = getPlayersUsername(room);
  const positions: Matter.Vector[] = [];
  for (const player of players) {
    const playerBody = rooms[room].engineData.playersBodies[player];
    positions.push(playerBody.position);
  }
  return positions;
};

const initRoomGame = (room: string) => {
  const roomObject = rooms[room];
  const roomData = rooms[room].data;
  roomObject.gameLoopInterval = null;
  roomObject.engineData = createEngine(getPlayersUsername(room));
  roomObject.gameState = {
    score: {
      blue: 0,
      red: 0,
    },
    winner: "draw",
    playersPositions: getPositionsOfPlayersBodies(room),
    ballPosition: roomObject.engineData.ball.position,
  };
  roomData.gameStatus = GameStatus.Playing;

  io.to(room).emit("startGame", roomData);
  gameLoop(roomObject.gameLoopInterval, roomObject.engineData, roomObject.gameState, room, io);
};

const insertPlayerInTeam = (room: string, team: string, username: string, socket: Socket) => {
  const roomData = rooms[room].data;
  const player: IPlayer = {
    socketId: socket.id,
    username: username,
    stats: {
      goals: 0,
    },
  };
  roomData.teams[team].players.push(player);
  io.to(room).emit("joinedToTeam", roomData);
  io.to("lobby").emit("roomUpdated", roomData);
  const totalPlayers = roomData.teams.blue.players.length + roomData.teams.red.players.length;

  console.log(`user ${username} joined room ${room} on team ${team}`);
  if (totalPlayers === roomData.numberOfPlayers) {
    initRoomGame(room);
  }
};

const generateNewPositionByMove = (move: string, position: Matter.Vector): Matter.Vector => {
  const newPosition = Matter.Vector.create(position.x, position.y);
  switch (move) {
    case "up":
      newPosition.y -= 5;
      break;
    case "down":
      newPosition.y += 5;
      break;
    case "left":
      newPosition.x -= 5;
      break;
    case "right":
      newPosition.x += 5;
      break;
  }
  return newPosition;
};

export const setupSocket = () => {
  io.use(verifyToken);

  io.on("connection", (socket: Socket) => {
    console.log("a user connected ", socket.id);

    socket.on("disconnect", () => {
      console.log("user disconnected ", socket.id);
    });

    socket.on("createRoom", (roomData: IRoomData, callback: Function) => {
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
      const roomObject = rooms[room];
      const roomData = rooms[room].data;
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      } else if (roomData.gameStatus !== GameStatus.WaitingPlayers) {
        socket.emit("error", "Game already started");
      } else if (roomData.teams[team].players.length >= roomData.numberOfPlayers / 2) {
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
      if (!rooms[room]) {
        return socket.emit("error", "Room does not exist");
      }
      const roomData = rooms[room].data;
      console.log("user joined room", room);
      const teamOfPlayer = checkIfPlayerExistisInSomeTeam(room, username);

      if (roomData.gameStatus === GameStatus.Playing) {
        if (teamOfPlayer !== "no team") {
          roomData.teams[teamOfPlayer].players.find(
            (player: IPlayer) => player.username === username
          ).status = "online";
        }
      }
      socket.join(room);
      socket.emit("joinedRoom", roomData);
    });

    socket.on("move", ({ move, username, room }) => {
      if (!rooms[room]) return console.log("room does not exist");
      const player = rooms[room].engineData.playersBodies[username];
      if (player) {
        Matter.Body.setPosition(player, generateNewPositionByMove(move, player.position));
      }
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

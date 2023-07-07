import { Socket } from "socket.io";
import { verifyToken } from "../utils/verifyToken.js";
import { v4 as uuidv4 } from "uuid";
import ServerAndSocket from "../utils/serverAndSocket.js";
import {
  IEngineData,
  IPlayerBodies,
  IPlayerEngineData,
  applyForceOnBall,
  createEngine,
  gameLoop,
} from "../game/index.js";
import { GameStatus, IPlayer, IPlayerInfo, IRoom, IRoomData, IRooms, IRoomsData } from "./types.js";
import Matter from "matter-js";

export let rooms: IRooms = {};

const io = ServerAndSocket.getInstance().io;

const createRoom = (roomData: IRoomData) => {
  const roomObject: IRoom = {
    data: roomData,
    gameLoopInterval: null,
    engineData: null,
    gameState: {
      gameStatus: GameStatus.WaitingPlayers,
      score: {
        blue: 0,
        red: 0,
      },
      winner: "draw",
      playersInfos: null,
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

const getPositionsOfPlayersBodies = (room: string) => {
  const players = getPlayersUsername(room);
  const positions: IPlayerInfo[] = [];
  for (const player of players) {
    const playerBody = rooms[room].engineData.playersBodies[player];
    positions.push({
      position: playerBody.body.position,
      team: checkIfPlayerExistisInSomeTeam(room, player) as "blue" | "red",
    });
  }
  return positions;
};

const getPlayersUsernameByTeam = (room: string, team: string): string[] => {
  const roomData = rooms[room].data;
  const playersUsername: string[] = [];
  roomData.teams[team].players.forEach((player) => {
    playersUsername.push(player.username);
  });
  return playersUsername;
};

const initRoomGame = (room: string) => {
  const roomObject = rooms[room];
  const roomData = rooms[room].data;
  roomObject.gameLoopInterval = null;
  roomObject.engineData = createEngine({
    blueTeam: getPlayersUsernameByTeam(room, "blue"),
    redTeam: getPlayersUsernameByTeam(room, "red"),
  });
  roomObject.gameState = {
    score: {
      blue: 0,
      red: 0,
    },
    winner: "draw",
    playersInfos: getPositionsOfPlayersBodies(room),
    ballPosition: roomObject.engineData.ball.position,
    gameStatus: GameStatus.Playing,
  };

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

const generateNewVelocityByMove = (
  move: string,
  playerBody: Matter.Body,
  player: IPlayerEngineData,
  room: IRoom
) => {
  switch (move) {
    case "up":
      Matter.Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -3 });
      break;
    case "down":
      Matter.Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: 3 });
      break;
    case "left":
      Matter.Body.setVelocity(playerBody, { x: -3, y: playerBody.velocity.y });
      break;
    case "right":
      Matter.Body.setVelocity(playerBody, { x: 3, y: playerBody.velocity.y });
      break;
    case "shoot":
      applyForceOnBall(player.detector, room.engineData.ball, playerBody);
      break;
  }
};

const getAllRoomData = () => {
  const roomDatas: IRoomsData = {};
  for (const room in rooms) {
    roomDatas[room] = rooms[room].data;
  }
  return roomDatas;
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
      socket.emit("allRooms", getAllRoomData());
    });

    socket.on("joinTeam", ({ room, team, username }) => {
      const roomObject = rooms[room];
      const roomData = rooms[room].data;
      if (!rooms[room]) {
        socket.emit("error", "Room does not exist");
      } else if (roomObject.gameState.gameStatus !== GameStatus.WaitingPlayers) {
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
      const roomObject = rooms[room];
      console.log("user joined room", room);
      const teamOfPlayer = checkIfPlayerExistisInSomeTeam(room, username);

      if (roomObject.gameState.gameStatus === GameStatus.Playing) {
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
      const roomObject = rooms[room];
      if (!roomObject) return console.log("room does not exist");
      const player = roomObject.engineData.playersBodies[username];
      if (player) {
        generateNewVelocityByMove(move, player.body, player, roomObject);
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

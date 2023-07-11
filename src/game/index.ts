import Matter from "matter-js";

import ServerAndSocket from "../utils/serverAndSocket.js";
import { GameStatus, IGameState, IRoomData } from "../events/types.js";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
// const io = ServerAndSocket.getInstance().io;

export interface IPlayerEngineData {
  body: Matter.Body;
  detector: Matter.Detector;
  boostDetector: Matter.Detector;
  team: "blue" | "red";
  boost: number;
  username: string;
}

export interface IPlayerBodies {
  [key: string]: IPlayerEngineData;
}

export interface IEngineData {
  engine: Matter.Engine;
  goalA: Matter.Body;
  goalB: Matter.Body;
  ball: Matter.Body;
  leftWall: Matter.Body;
  rightWall: Matter.Body;
  topWall: Matter.Body;
  bottomWall: Matter.Body;
  maxGoalY: number;
  minGoalY: number;
  detectorGoalA: Matter.Detector;
  detectorGoalB: Matter.Detector;
  playersBodies: IPlayerBodies;
  paddlesData: {
    [key: string]: { x: number; y: number; isTaken: boolean; id: string };
  };
}

const PLAYER_RADIUS = 30;
const BALL_RADIUS = 10;

export function getBodiesFromPlayerBodies(playerBodies: IPlayerBodies): Matter.Body[] {
  return Object.values(playerBodies).map((player) => player.body);
}

const generateBodiesByTeam = (
  teamPlayers: string[],
  ball: Matter.Body,
  playersBodyObj: IPlayerBodies,
  team: "blue" | "red",
  paddles: Matter.Body[]
) => {
  const startPosition = 360 - (teamPlayers.length - 1) * 40;
  for (let i = 0; i < teamPlayers.length; i++) {
    const playerBody = Matter.Bodies.circle(
      team === "blue" ? 400 : 880,
      startPosition + i * 80,
      PLAYER_RADIUS,
      {
        inertia: 0,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.2,
      }
    );
    const detector = Matter.Detector.create({
      bodies: [ball, playerBody],
    });
    const boostDetector = Matter.Detector.create({
      bodies: [playerBody, ...paddles],
    });
    playersBodyObj[teamPlayers[i]] = {
      body: playerBody,
      detector,
      boostDetector,
      team,
      boost: 0,
      username: teamPlayers[i],
    };
  }
};

const generatePlayersBodies = (
  bluePlayers: string[],
  redPlayers: string[],
  ball: Matter.Body,
  paddles: Matter.Body[]
) => {
  const players: IPlayerBodies = {};
  generateBodiesByTeam(bluePlayers, ball, players, "blue", paddles);
  generateBodiesByTeam(redPlayers, ball, players, "red", paddles);
  return players;
};

export const createEngine = ({
  blueTeam,
  redTeam,
}: {
  blueTeam: string[];
  redTeam: string[];
}): IEngineData => {
  const engine = Matter.Engine.create();
  const worldBounds = {
    min: { x: 0, y: 0 },
    max: { x: 1280, y: 720 },
  };

  engine.world.bounds = worldBounds;
  engine.gravity.y = 0;

  const goalWidth = 5;
  const goalHeight = 300;
  const maxGoalY = engine.world.bounds.max.y - goalHeight / 2;
  const minGoalY = goalHeight / 2;

  const ballSettings: Matter.IBodyDefinition = {
    inertia: 0,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0.1,
    restitution: 1,
  };

  const ball = Matter.Bodies.circle(640, 360, BALL_RADIUS, ballSettings);

  const wallSettings: Matter.IBodyDefinition = {
    isStatic: true,
  };

  const paddlesData = {
    paddleA: { x: 190, y: 125, isTaken: false, id: "paddleA" },
    paddleB: { x: 190, y: 595, isTaken: false, id: "paddleB" },
    paddleC: { x: 640, y: 595, isTaken: false, id: "paddleC" },
    paddleD: { x: 1090, y: 595, isTaken: false, id: "paddleD" },
    paddleE: { x: 640, y: 125, isTaken: false, id: "paddleE" },
    paddleF: { x: 1090, y: 125, isTaken: false, id: "paddleF" },
  };
  const paddles = Object.values(paddlesData).map((position) => {
    const body = Matter.Bodies.circle(position.x, position.y, 10, {
      isStatic: true,
      inertia: 0,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      label: position.id,
    });
    console.log(body.label);
    return body;
  });

  const goalA = Matter.Bodies.rectangle(
    goalWidth / 2,
    engine.world.bounds.max.y / 2,
    goalWidth,
    goalHeight,
    { isStatic: true, inertia: 0, friction: 0, frictionStatic: 0, frictionAir: 0 }
  );

  const goalB = Matter.Bodies.rectangle(
    engine.world.bounds.max.x - goalWidth / 2,
    engine.world.bounds.max.y / 2,
    goalWidth,
    goalHeight,
    { isStatic: true, inertia: 0, friction: 0, frictionStatic: 0, frictionAir: 0 }
  );

  const leftWall = Matter.Bodies.rectangle(-1000, worldBounds.max.y / 2, 2000, 3000, wallSettings);
  const rightWall = Matter.Bodies.rectangle(
    worldBounds.max.x + 1000,
    worldBounds.max.y / 2,
    2000,
    3000,
    wallSettings
  );
  const topWall = Matter.Bodies.rectangle(worldBounds.max.x / 2, -1000, 3000, 2000, wallSettings);
  const bottomWall = Matter.Bodies.rectangle(
    worldBounds.max.x / 2,
    worldBounds.max.y + 1000,
    3000,
    2000,
    wallSettings
  );

  const playersBodies = generatePlayersBodies(blueTeam, redTeam, ball, paddles);

  Matter.World.add(engine.world, [
    goalA,
    goalB,
    ball,
    leftWall,
    rightWall,
    topWall,
    bottomWall,
    ...Object.values(getBodiesFromPlayerBodies(playersBodies)),
  ]);

  const detectorGoalA = Matter.Detector.create({
    bodies: [ball, goalA],
  });

  const detectorGoalB = Matter.Detector.create({
    bodies: [ball, goalB],
  });

  return {
    engine,
    goalA,
    goalB,
    ball,
    leftWall,
    rightWall,
    topWall,
    bottomWall,
    maxGoalY,
    minGoalY,
    detectorGoalA,
    detectorGoalB,
    playersBodies,
    paddlesData,
  };
};

function resetBall(ball: Matter.Body) {
  Matter.Body.setPosition(ball, { x: 640, y: 360 });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
}

const getPlayerBodiesByTeam = (playersBodies: IPlayerBodies, team: "blue" | "red") => {
  return Object.values(playersBodies).filter((player) => player.team === team);
};

function resetPlayers(players: IPlayerBodies) {
  const bluePlayers = getPlayerBodiesByTeam(players, "blue");
  const redPlayers = getPlayerBodiesByTeam(players, "red");
  const startPositionBlue = 360 - (bluePlayers.length - 1) * 40;
  const startPositionRed = 360 - (redPlayers.length - 1) * 40;
  for (let i = 0; i < bluePlayers.length; i++) {
    Matter.Body.setPosition(bluePlayers[i].body, { x: 400, y: startPositionBlue + i * 80 });
    Matter.Body.setVelocity(bluePlayers[i].body, { x: 0, y: 0 });
  }
  for (let i = 0; i < redPlayers.length; i++) {
    Matter.Body.setPosition(redPlayers[i].body, { x: 880, y: startPositionRed + i * 80 });
    Matter.Body.setVelocity(redPlayers[i].body, { x: 0, y: 0 });
  }
}

const checkGoal = (engineData: IEngineData, gameState: IGameState, roomData: IRoomData) => {
  const goalACollision = Matter.Detector.collisions(engineData.detectorGoalA);
  const goalBCollision = Matter.Detector.collisions(engineData.detectorGoalB);

  if (goalACollision.length > 0) {
    gameState.score.red++;
    resetBall(engineData.ball);
    resetPlayers(engineData.playersBodies);
  }

  if (goalBCollision.length > 0) {
    gameState.score.blue++;
    resetBall(engineData.ball);
    resetPlayers(engineData.playersBodies);
  }
};

const checkIfBoostIsTaken = (engineData: IEngineData, gameState: IGameState) => {
  for (const username in engineData.playersBodies) {
    const playerData = engineData.playersBodies[username];
    const playerCollision = Matter.Detector.collisions(playerData.boostDetector);

    if (playerCollision.length > 0 && gameState.playersData[username].boost < 100) {
      const paddleId = playerCollision[0].bodyA.label;
      const paddleTaked = engineData.paddlesData[paddleId];
      if (paddleTaked && !paddleTaked.isTaken) {
        paddleTaked.isTaken = true;
        setTimeout(() => {
          paddleTaked.isTaken = false;
        }, 10000);
      }
      gameState.playersData[username].boost += 10;
    }
  }
};

export const applyForceOnBall = (
  playerDetector: Matter.Detector,
  ball: Matter.Body,
  playerBody: Matter.Body
) => {
  const playerVelocity = playerBody.velocity;
  const directionMagnitude = Math.sqrt(
    Math.pow(playerVelocity.x, 2) + Math.pow(playerVelocity.y, 2)
  );
  const directionNormalized = {
    x: playerVelocity.x / directionMagnitude,
    y: playerVelocity.y / directionMagnitude,
  };

  const ballCollisionWithPlayer = Matter.Detector.collisions(playerDetector);
  if (ballCollisionWithPlayer.length > 0) {
    Matter.Body.applyForce(ball, ball.position, {
      x: directionNormalized.x * 0.07,
      y: directionNormalized.y * 0.07,
    });
  }
};

const checkIfGameIsFinished = (gameState: IGameState, goalsToWin: number) => {
  if (gameState.score.blue >= goalsToWin || gameState.score.red >= goalsToWin) {
    return true;
  }
  return false;
};

const checkWhatTeamWon = (gameState: IGameState) => {
  if (gameState.score.blue > gameState.score.red) {
    return "blue";
  }
  if (gameState.score.red > gameState.score.blue) {
    return "red";
  }
  return "draw";
};

export const gameLoop = (
  gameLoopInterval: NodeJS.Timeout,
  engineData: IEngineData,
  gameState: IGameState,
  roomName: string,
  roomData: IRoomData,
  io: Server
) => {
  if (gameLoopInterval) {
    clearTimeout(gameLoopInterval);
  }
  if (roomData.gameStatus === GameStatus.Playing) {
    Matter.Engine.update(engineData.engine, 1000 / 60);
    checkGoal(engineData, gameState, roomData);
    checkIfBoostIsTaken(engineData, gameState);
    if (checkIfGameIsFinished(gameState, roomData.goalsToWin)) {
      roomData.gameStatus = GameStatus.FinishedGame;
      io.to(roomName).emit("gameFinished", checkWhatTeamWon(gameState));
      setTimeout(() => {
        console.log("game finished and go to waiting players");
        roomData.gameStatus = GameStatus.WaitingPlayers;
        io.to(roomName).emit("awaitingPlayersAgain", roomData);
      }, 10000);
    }

    io.to(roomName).emit("gameState", {
      ...gameState,
      paddlesData: engineData.paddlesData,
    });
    gameLoopInterval = setTimeout(
      () => gameLoop(gameLoopInterval, engineData, gameState, roomName, roomData, io),
      1000 / 60
    );
  }
};

import Matter from "matter-js";

import ServerAndSocket from "../utils/serverAndSocket.js";
import { IGameState } from "../events/types.js";
import { Server } from "socket.io";
// const io = ServerAndSocket.getInstance().io;

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
  playersBodies: {
    [key: string]: Matter.Body;
  };
}

const generatePlayersBodies = (playersUsername: string[]) => {
  const players: { [key: string]: Matter.Body } = {};
  const startPosition = 360 - (playersUsername.length - 1) * 40;
  for (let i = 0; i < playersUsername.length; i++) {
    players[playersUsername[i]] = Matter.Bodies.circle(400, startPosition + i * 80, 20, {
      inertia: 0,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
    });
  }
  return players;
};

export const createEngine = (playersUsername: string[]): IEngineData => {
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
    frictionAir: 0,
    restitution: 1,
  };

  const ball = Matter.Bodies.circle(860, 360, 5, ballSettings);

  const wallSettings: Matter.IBodyDefinition = {
    isStatic: true,
  };

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

  const leftWall = Matter.Bodies.rectangle(
    -5,
    worldBounds.max.y / 2,
    10,
    worldBounds.max.y,
    wallSettings
  );
  const rightWall = Matter.Bodies.rectangle(
    worldBounds.max.x + 5,
    worldBounds.max.y / 2,
    10,
    worldBounds.max.y,
    wallSettings
  );
  const topWall = Matter.Bodies.rectangle(
    worldBounds.max.x / 2,
    -5,
    worldBounds.max.x,
    10,
    wallSettings
  );
  const bottomWall = Matter.Bodies.rectangle(
    worldBounds.max.x / 2,
    worldBounds.max.y + 5,
    worldBounds.max.x,
    10,
    wallSettings
  );

  const playersBodies = generatePlayersBodies(playersUsername);

  Matter.World.add(engine.world, [
    goalA,
    goalB,
    ball,
    leftWall,
    rightWall,
    topWall,
    bottomWall,
    ...Object.values(playersBodies),
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
  };
};

function resetBall(ball: Matter.Body) {
  Matter.Body.setPosition(ball, { x: 610, y: 360 });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
}

export const gameLoop = (
  gameLoopInterval: NodeJS.Timeout,
  engineData: IEngineData,
  gameState: IGameState,
  roomName: string,
  io: Server
) => {
  if (gameLoopInterval) {
    clearTimeout(gameLoopInterval);
  }

  const goalACollision = Matter.Detector.collisions(engineData.detectorGoalA);
  const goalBCollision = Matter.Detector.collisions(engineData.detectorGoalB);

  if (goalACollision.length > 0) {
    console.log("Ball collided with Goal A");
    resetBall(engineData.ball);
  }

  if (goalBCollision.length > 0) {
    console.log("Ball collided with Goal B");
    resetBall(engineData.ball);
  }

  Matter.Engine.update(engineData.engine, 1000 / 60);
  io.to(roomName).emit("gameState", gameState);
  gameLoopInterval = setTimeout(
    () => gameLoop(gameLoopInterval, engineData, gameState, roomName, io),
    1000 / 60
  );
};

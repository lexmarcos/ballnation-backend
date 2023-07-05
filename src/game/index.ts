import Matter from "matter-js";

import ServerAndSocket from "../utils/serverAndSocket.js";
import { IGameState } from "../events/types.js";
const io = ServerAndSocket.getInstance().io;

export interface IEngineData {
  engine: Matter.Engine;
  goalA: Matter.Body;
  goalB: Matter.Body;
  ball: Matter.Body;
  leftWall: Matter.Body;
  rightWall: Matter.Body;
  topWall: Matter.Body;
  bottomWall: Matter.Body;
  goalSpeed: number;
  maxGoalY: number;
  minGoalY: number;
  detectorGoalA: Matter.Detector;
  detectorGoalB: Matter.Detector;
  players: Matter.Body[];
}

export const createEngine = (numberOfPlayers: number): IEngineData => {
  const engine = Matter.Engine.create();
  const worldBounds = {
    min: { x: 0, y: 0 },
    max: { x: 1280, y: 720 },
  };

  engine.world.bounds = worldBounds;
  engine.gravity.y = 0;

  const goalWidth = 5;
  const goalHeight = 100;
  const goalSpeed = 10;
  const maxGoalY = engine.world.bounds.max.y - goalHeight / 2;
  const minGoalY = goalHeight / 2;

  const ballSettings: Matter.IBodyDefinition = {
    inertia: 0,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    restitution: 1,
  };

  const ball = Matter.Bodies.circle(400, 300, 10, ballSettings);
  const players: Matter.Body[] = [];

  for (let i = 0; i < numberOfPlayers; i++) {
    players.push(
      Matter.Bodies.rectangle(400, 300, 10, 10, {
        isStatic: true,
        inertia: 0,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
      })
    );
  }
  const wallSettings: Matter.IBodyDefinition = {
    isStatic: true,
    render: {
      visible: false,
    },
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

  const leftWall = Matter.Bodies.rectangle(-5, 300, 10, 720, wallSettings);
  const rightWall = Matter.Bodies.rectangle(805, 300, 10, 720, wallSettings);
  const topWall = Matter.Bodies.rectangle(400, -5, 1280, 10, wallSettings);
  const bottomWall = Matter.Bodies.rectangle(400, 605, 1280, 10, wallSettings);

  Matter.World.add(engine.world, [
    goalA,
    goalB,
    ball,
    leftWall,
    rightWall,
    topWall,
    bottomWall,
    ...players,
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
    goalSpeed,
    maxGoalY,
    minGoalY,
    detectorGoalA,
    detectorGoalB,
    players,
  };
};

function resetBall(ball: Matter.Body) {
  Matter.Body.setPosition(ball, { x: 610, y: 360 });
  Matter.Body.setVelocity(ball, { x: 0, y: 0 });
}

export const gameLoop = (
  gameLoopInterval,
  engineData: IEngineData,
  gameState: IGameState,
  roomName: string
) => {
  if (gameLoopInterval) {
    clearTimeout(gameLoopInterval);
  }
  Matter.Engine.update(engineData.engine, 1000 / 60);
  io.to(roomName).emit("gameState", gameState);
  gameLoopInterval = setTimeout(
    () => gameLoop(gameLoopInterval, engineData, gameState, roomName),
    1000 / 60
  );
};

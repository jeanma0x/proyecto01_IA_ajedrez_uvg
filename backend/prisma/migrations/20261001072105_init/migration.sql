-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('human', 'ai');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('beginner', 'advanced', 'master');

-- CreateEnum
CREATE TYPE "ChessColor" AS ENUM ('white', 'black');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('configured', 'active', 'paused', 'finished', 'incident');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('white_win', 'black_win', 'draw', 'technical_incident');

-- CreateEnum
CREATE TYPE "GameEndReason" AS ENUM ('checkmate', 'draw', 'stalemate', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule', 'human_resignation', 'technical_incident');

-- CreateEnum
CREATE TYPE "GameSpeed" AS ENUM ('normal', 'fast', 'maximum');

-- CreateEnum
CREATE TYPE "AiAttemptOutcome" AS ENUM ('accepted', 'illegal_move', 'invalid_format', 'timeout', 'rate_limit', 'auth_error', 'unavailable');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "type" "ParticipantType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "company" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "whiteParticipantId" TEXT NOT NULL,
    "whiteDifficulty" "Difficulty",
    "blackParticipantId" TEXT NOT NULL,
    "blackDifficulty" "Difficulty",
    "status" "GameStatus" NOT NULL DEFAULT 'configured',
    "fen" TEXT NOT NULL,
    "turn" "ChessColor" NOT NULL DEFAULT 'white',
    "result" "GameResult",
    "reason" "GameEndReason",
    "speed" "GameSpeed" NOT NULL DEFAULT 'normal',
    "moveCount" INTEGER NOT NULL DEFAULT 0,
    "lastMoveFrom" TEXT,
    "lastMoveTo" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "color" "ChessColor" NOT NULL,
    "piece" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "san" TEXT NOT NULL,
    "fenAfter" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_attempts" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "retryNumber" INTEGER NOT NULL DEFAULT 0,
    "outcome" "AiAttemptOutcome" NOT NULL,
    "rawResponse" TEXT,
    "parsedFrom" TEXT,
    "parsedTo" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentary" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "games_whiteParticipantId_idx" ON "games"("whiteParticipantId");

-- CreateIndex
CREATE INDEX "games_blackParticipantId_idx" ON "games"("blackParticipantId");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "moves_gameId_idx" ON "moves"("gameId");

-- CreateIndex
CREATE INDEX "ai_attempts_gameId_idx" ON "ai_attempts"("gameId");

-- CreateIndex
CREATE INDEX "commentary_gameId_idx" ON "commentary"("gameId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_whiteParticipantId_fkey" FOREIGN KEY ("whiteParticipantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_blackParticipantId_fkey" FOREIGN KEY ("blackParticipantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_attempts" ADD CONSTRAINT "ai_attempts_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

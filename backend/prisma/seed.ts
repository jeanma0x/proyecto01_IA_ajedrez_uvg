import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const participants = [
  {
    id: "human",
    type: "human" as const,
    displayName: "Humano",
    company: null,
    modelId: null,
  },
  {
    id: "gemini-flash",
    type: "ai" as const,
    displayName: "Gemini 3.8 Flash",
    company: "Google",
    modelId: "gemini-3.8-flash",
  },
  {
    id: "claude-haiku",
    type: "ai" as const,
    displayName: "Claude Haiku 4.5",
    company: "Anthropic",
    modelId: "claude-haiku-4-5-20251001",
  },
  {
    id: "gpt-oss-120b",
    type: "ai" as const,
    displayName: "GPT-OSS 120B (Groq)",
    company: "OpenAI",
    modelId: "openai/gpt-oss-120b",
  },
];

async function main() {
  for (const participant of participants) {
    await prisma.participant.upsert({
      where: { id: participant.id },
      update: participant,
      create: participant,
    });
  }

  console.log(`Sembrados ${participants.length} participantes.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que `next dev` regenere AGENTS.md/CLAUDE.md en backend/ — ya hay un
  // CLAUDE.md en la raíz del repo que gobierna todo el proyecto.
  agentRules: false,
};

export default nextConfig;

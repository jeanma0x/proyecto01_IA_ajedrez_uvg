import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duelo de Inteligencias — API",
  description: "Backend del proyecto Duelo de Inteligencias (UVG, 2026 II).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

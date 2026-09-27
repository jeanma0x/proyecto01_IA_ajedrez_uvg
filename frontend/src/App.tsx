import { ChessBoard } from "./components/chess/ChessBoard";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Duelo de Inteligencias</h1>
      <p>Frente 1 · Tablero y experiencia visual</p>

      <ChessBoard />
    </main>
  );
}

export default App;
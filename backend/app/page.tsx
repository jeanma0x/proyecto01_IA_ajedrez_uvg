export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Duelo de Inteligencias — API</h1>
      <p>
        Esta aplicación no tiene interfaz propia. Expone la API del backend bajo{" "}
        <code>/api</code> para el frontend del proyecto. Ver{" "}
        <code>/api/health</code>.
      </p>
    </main>
  );
}

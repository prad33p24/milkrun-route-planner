import { useEffect, useState } from "react";
import type { CargoItemInput, ContainerInput, ContainerPreset, PackResponse } from "./types";
import { fetchContainerPresets, fetchCargoTypeSuggestions, runPack } from "./api";
import ContainerSelector from "./components/ContainerSelector";
import CargoTable from "./components/CargoTable";
import ResultsPanel from "./components/ResultsPanel";
import "./App.css";

const DEFAULT_CONTAINER: ContainerInput = { preset_id: "sea-20ft-standard", max_units: 50 };

function App() {
  const [presets, setPresets] = useState<ContainerPreset[]>([]);
  const [cargoTypeSuggestions, setCargoTypeSuggestions] = useState<string[]>([]);
  const [container, setContainer] = useState<ContainerInput>(DEFAULT_CONTAINER);
  const [cargoItems, setCargoItems] = useState<CargoItemInput[]>([
    { name: "Pallet A", cargo_type: "General / Palletized", length_cm: 120, width_cm: 100, height_cm: 100, weight_kg: 200, quantity: 20, stackable: true, fragile: false },
  ]);
  const [result, setResult] = useState<PackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContainerPresets().then(setPresets).catch((e) => setError(String(e)));
    fetchCargoTypeSuggestions().then(setCargoTypeSuggestions).catch(() => {});
  }, []);

  async function handleRun() {
    setError(null);
    setLoading(true);
    try {
      const res = await runPack(container, cargoItems);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Loading Simulation Tool</h1>
        <p className="subtitle">Simulate how cargo loads into vehicles &amp; international containers</p>
      </header>

      <main>
        <section className="panel">
          <h2>1. Container / Vehicle</h2>
          <ContainerSelector presets={presets} value={container} onChange={setContainer} />
        </section>

        <section className="panel">
          <h2>2. Cargo</h2>
          <CargoTable cargoItems={cargoItems} setCargoItems={setCargoItems} cargoTypeSuggestions={cargoTypeSuggestions} />
        </section>

        <div className="run-row">
          <button className="run-button" onClick={handleRun} disabled={loading || cargoItems.length === 0}>
            {loading ? "Simulating…" : "Run Simulation"}
          </button>
          {error && <div className="error">{error}</div>}
        </div>

        {result && (
          <section className="panel">
            <ResultsPanel result={result} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

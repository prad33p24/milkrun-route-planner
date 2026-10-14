import { useState } from "react";
import type { PackResponse } from "../types";
import Scene3D from "./Scene3D";
import { exportPackingPdf } from "../engine/pdfExport";

interface Props {
  result: PackResponse;
}

export default function ResultsPanel({ result }: Props) {
  const [binIdx, setBinIdx] = useState(0);
  const bin = result.bins[binIdx];

  return (
    <div className="results-panel">
      <div className="results-header">
        <h2>Results</h2>
        <button onClick={() => exportPackingPdf(result)}>Download PDF (all containers)</button>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{result.containers_used}</div>
          <div className="stat-label">{result.container_name}(s) needed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{result.total_volume_utilization_pct}%</div>
          <div className="stat-label">Volume utilization</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{result.total_weight_utilization_pct}%</div>
          <div className="stat-label">Weight utilization</div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="warnings">
          {result.warnings.map((w, i) => (
            <div key={i} className="warning">⚠ {w}</div>
          ))}
        </div>
      )}

      <table className="summary-table">
        <thead>
          <tr>
            <th>Cargo</th>
            <th>Type</th>
            <th>Requested</th>
            <th>Fitted</th>
            <th>Leftover</th>
          </tr>
        </thead>
        <tbody>
          {result.cargo_summary.map((c) => (
            <tr key={c.name} className={c.leftover_qty > 0 ? "row-leftover" : ""}>
              <td>{c.name}</td>
              <td>{c.cargo_type}</td>
              <td>{c.requested_qty}</td>
              <td>{c.fitted_qty}</td>
              <td>{c.leftover_qty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bin-viewer">
        <div className="bin-viewer-header">
          <h3>3D View</h3>
          <label>
            Container:
            <select value={binIdx} onChange={(e) => setBinIdx(Number(e.target.value))}>
              {result.bins.map((b, i) => (
                <option key={i} value={i}>
                  #{b.bin_index} — {b.volume_used_pct}% vol / {b.weight_used_pct}% wt
                </option>
              ))}
            </select>
          </label>
        </div>
        {bin && <Scene3D pack={result} bin={bin} />}
      </div>
    </div>
  );
}

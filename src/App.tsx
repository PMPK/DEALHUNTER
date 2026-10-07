import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataset } from './data';
import { RATING_LABEL, buildFeedbackExport, exportFileName, loadFeedback, saveFeedback, withFeedback } from './domain/feedback';
import { scoreBand, BANDS, formatScore } from './domain/scoring';
import type { FeedbackMap, FeedbackRating, LatLng } from './domain/types';
import { ZanzibarMap } from './map';
import { AreaPanel } from './ui/AreaPanel';
import { AttractionCard } from './ui/AttractionCard';
import { CalibrateView } from './ui/CalibrateView';
import { CompareView } from './ui/CompareView';
import { Legend, OverlayControls } from './ui/MapControls';
import type { ExplorerTarget } from './ui/RealityExplorer';
import { DEFAULT_OVERLAYS, buildAttractionMarkers, buildZones, type OverlayId } from './ui/overlays';

type View = 'map' | 'compare' | 'calibrate';
const TESTER_KEY = 'zanzibar-reality:tester-mode';

function readTester(): boolean {
  try {
    return window.localStorage.getItem(TESTER_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function App() {
  const [view, setView] = useState<View>('map');
  const [overlays, setOverlays] = useState<ReadonlySet<OverlayId>>(DEFAULT_OVERLAYS);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [attractionId, setAttractionId] = useState<string | null>(null);
  const [explorer, setExplorer] = useState<ExplorerTarget | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMap>(() => loadFeedback());
  const [storageOk, setStorageOk] = useState(true);
  const [testerMode, setTesterMode] = useState(readTester);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [compareSeed, setCompareSeed] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStorageOk(saveFeedback(feedback));
  }, [feedback]);

  const toggleOverlay = useCallback((id: OverlayId) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const area = dataset.areas.find((a) => a.id === areaId) ?? null;
  const attraction = dataset.attractions.find((a) => a.id === attractionId) ?? null;

  const selectArea = useCallback((id: string) => {
    const a = dataset.areas.find((x) => x.id === id);
    setAreaId(id);
    setAttractionId(null);
    setExplorer(null);
    if (a) setFocus([a.center[0], a.center[1]]);
  }, []);

  const selectAttraction = useCallback((id: string) => {
    const t = dataset.attractions.find((x) => x.id === id);
    setAttractionId(id);
    if (t) setFocus([t.coordinates[0], t.coordinates[1]]);
  }, []);

  const pickPoint = useCallback((p: LatLng) => {
    setExplorer({ label: 'Dropped pin', position: p, caveat: 'Your own map pin.' });
  }, []);

  const zones = useMemo(() => buildZones(dataset, overlays, areaId, feedback), [overlays, areaId, feedback]);
  const markers = useMemo(() => buildAttractionMarkers(dataset.attractions, overlays, attractionId), [overlays, attractionId]);
  const pin = explorer?.label === 'Dropped pin' ? { position: explorer.position, label: 'Dropped pin' } : null;

  const changeFeedback = (id: string, patch: { rating?: FeedbackRating | null; note?: string }) =>
    setFeedback((prev) => withFeedback(prev, id, patch));

  const exportFeedback = () => {
    const now = new Date();
    const json = JSON.stringify(buildFeedbackExport(feedback, dataset, now), null, 2);
    setExportJson(json);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(now);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearFeedback = () => {
    if (window.confirm('Delete all locally stored calibration feedback? Export first if you want to keep it.')) setFeedback({});
  };

  const toggleTester = () =>
    setTesterMode((v) => {
      try {
        window.localStorage.setItem(TESTER_KEY, v ? 'off' : 'on');
      } catch {
        /* ignore */
      }
      return !v;
    });

  const hasPanel = view === 'map' && (area || attraction);
  const explorerTarget: ExplorerTarget | null = area
    ? explorer ?? { label: `${area.name} (zone centre)`, position: area.center, caveat: 'Zone centre is approximate.' }
    : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">〰</span>
          <div>
            <h1>Zanzibar Reality</h1>
            <p>Beyond the marketing photos · prototype</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          {([['map', 'Map'], ['compare', 'Compare'], ['calibrate', 'Calibrate']] as const).map(([id, label]) => (
            <button key={id} type="button" className={`tab${view === id ? ' active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <label className="tester-toggle">
          <input type="checkbox" checked={testerMode} onChange={toggleTester} /> Tester mode
        </label>
      </header>

      <div className="proto-banner" role="note">
        Prototype — all scores are <strong>unverified seed estimates</strong>; hotels and offers are <strong>DEMO / NOT LIVE DATA</strong>.
      </div>

      {view === 'map' ? (
        <main className={`stage${hasPanel ? ' has-panel' : ''}`}>
          <section className="map-wrap" aria-label="Map">
            <OverlayControls active={overlays} onToggle={toggleOverlay} />
            <ZanzibarMap
              zones={zones}
              attractions={markers}
              pin={pin}
              focus={focus}
              onSelectZone={selectArea}
              onSelectAttraction={selectAttraction}
              onPickPoint={pickPoint}
            />
            <Legend />
            {!hasPanel ? <div className="map-hint">Tap an area for its reality check</div> : null}
          </section>
          <aside className="side" aria-label="Details">
            {attraction ? <AttractionCard attraction={attraction} onClose={() => setAttractionId(null)} /> : null}
            {area && explorerTarget ? (
              <AreaPanel
                area={area}
                dataset={dataset}
                feedback={feedback[area.id]}
                testerMode={testerMode}
                explorerTarget={explorerTarget}
                onExplore={setExplorer}
                onSelectAttraction={selectAttraction}
                onFeedback={(patch) => changeFeedback(area.id, patch)}
                onCompare={() => {
                  setCompareSeed(area.id);
                  setView('compare');
                }}
                onClose={() => {
                  setAreaId(null);
                  setExplorer(null);
                }}
              />
            ) : null}
            {!area && !attraction ? (
              <section className="card area-list" aria-label="All areas">
                <h2>Areas</h2>
                <p className="muted small">Pick an area (or tap it on the map). Scores are unverified seed values.</p>
                <ul className="plain">
                  {dataset.areas.map((a) => {
                    const band = BANDS[scoreBand(a.scores.overall.score)];
                    const f = feedback[a.id];
                    return (
                      <li key={a.id}>
                        <button type="button" className="list-btn" onClick={() => selectArea(a.id)}>
                          <span>{a.name}</span>
                          <span className="muted small">{f ? RATING_LABEL[f.rating] : ''}</span>
                          <span style={{ color: band.color }}>
                            <strong>{formatScore(a.scores.overall.score)}</strong> {band.symbol}? 
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </aside>
        </main>
      ) : null}

      {view === 'compare' ? (
        <main className="page">
          <CompareView key={compareSeed ?? 'none'} dataset={dataset} feedback={feedback} initialA={compareSeed} />
        </main>
      ) : null}

      {view === 'calibrate' ? (
        <main className="page">
          <CalibrateView
            dataset={dataset}
            feedback={feedback}
            onChange={changeFeedback}
            onExport={exportFeedback}
            onClear={clearFeedback}
            exportJson={exportJson}
            storageOk={storageOk}
          />
        </main>
      ) : null}
    </div>
  );
}

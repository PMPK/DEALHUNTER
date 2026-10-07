import { useCallback, useEffect, useMemo, useState } from 'react';
import { shipped } from './data/shipped';
import { buildFeedbackExport, exportFileName, loadFeedback, saveFeedback, withFeedback } from './domain/feedback';
import type { Dataset, FeatureKind, FeedbackDimension, FeedbackKind, FeedbackMap, FeedbackRating, LatLng, RadiusM, Selection } from './domain/types';
import { OffersView } from './frozen/offers/OffersView';
import { ZanzibarMap } from './map';
import { CalibrateView } from './ui/CalibrateView';
import { CompareView } from './ui/CompareView';
import { DatasetStatus } from './ui/DatasetStatus';
import { LocalRealityPanel } from './ui/LocalRealityPanel';
import { Legend, LayerControls } from './ui/MapControls';
import { DEFAULT_LAYERS, buildMarkers, buildShapes, pinSelection, selectionFor, type LayerId } from './ui/layers';

type View = 'map' | 'compare' | 'calibrate' | 'offers';
const TESTER_KEY = 'zanzibar-reality:tester-mode';

function readTester(): boolean {
  try {
    return window.localStorage.getItem(TESTER_KEY) !== 'off';
  } catch {
    return true;
  }
}

interface AppProps {
  dataset?: Dataset;
  problems?: string[];
}

export function App({ dataset = shipped.dataset, problems = shipped.problems }: AppProps) {
  const [view, setView] = useState<View>('map');
  const [layers, setLayers] = useState<ReadonlySet<LayerId>>(DEFAULT_LAYERS);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [radius, setRadius] = useState<RadiusM>(500);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMap>(() => loadFeedback());
  const [storageOk, setStorageOk] = useState(true);
  const [testerMode, setTesterMode] = useState(readTester);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [compareSeed, setCompareSeed] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStorageOk(saveFeedback(feedback));
  }, [feedback]);

  const toggleLayer = useCallback((id: LayerId) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const select = useCallback(
    (kind: FeatureKind, id: string) => {
      const s = selectionFor(dataset, kind, id);
      if (!s) return;
      setSelection(s);
      setFocus([s.position[0], s.position[1]]);
    },
    [dataset],
  );

  const pickPoint = useCallback((p: LatLng) => setSelection(pinSelection(p)), []);

  const shapes = useMemo(() => buildShapes(dataset, layers, selection, feedback), [dataset, layers, selection, feedback]);
  const markers = useMemo(() => buildMarkers(dataset, layers, selection), [dataset, layers, selection]);
  const pin = selection?.ref.kind === 'point' ? { position: selection.position, label: selection.label } : null;
  const circle = selection && ['hotel', 'point', 'attraction'].includes(selection.ref.kind) ? { center: selection.position, radiusM: radius } : null;

  const changeFeedback = (kind: FeedbackKind, id: string, dim: FeedbackDimension, patch: { rating?: FeedbackRating | null; note?: string }) =>
    setFeedback((prev) => withFeedback(prev, { kind, id }, dim, patch));

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

  const hasPanel = view === 'map' && selection !== null;
  const tabs: Array<[View, string]> = [['map', 'Map'], ['compare', 'Compare'], ['calibrate', 'Calibrate'], ['offers', 'Offers']];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">〰</span>
          <div>
            <h1>Zanzibar Reality</h1>
            <p>Evidence-based reality check · prototype</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          {tabs.map(([id, label]) => (
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
        Prototype — scores appear only where the dataset holds evidence; “no evidence yet” means unknown. Dataset {dataset.meta.datasetVersion}.
      </div>

      {view === 'map' ? (
        <main className={`stage${hasPanel ? ' has-panel' : ''}`}>
          <section className="map-wrap" aria-label="Map">
            <LayerControls active={layers} onToggle={toggleLayer} />
            <ZanzibarMap
              bounds={dataset.meta.mapBounds}
              shapes={shapes}
              markers={markers}
              pin={pin}
              circle={circle}
              focus={focus}
              onSelectShape={select}
              onSelectMarker={select}
              onPickPoint={pickPoint}
            />
            <Legend />
            {!hasPanel ? <div className="map-hint">Tap the map to drop a pin, or pick a feature</div> : null}
          </section>
          <aside className="side" aria-label="Details">
            {selection ? (
              <LocalRealityPanel
                dataset={dataset}
                selection={selection}
                radius={radius}
                feedback={feedback}
                testerMode={testerMode}
                onRadius={setRadius}
                onFeedback={changeFeedback}
                onCompare={() => {
                  setCompareSeed(selection.ref.id);
                  setView('compare');
                }}
                onClose={() => setSelection(null)}
              />
            ) : (
              <>
                <DatasetStatus dataset={dataset} problems={problems} />
                {dataset.areas.length + dataset.beaches.length + dataset.hotels.length > 0 ? (
                  <section className="card area-list" aria-label="Features">
                    <h2>Places</h2>
                    <ul className="plain">
                      {[
                        ...dataset.areas.map((a) => ({ kind: a.properties.kind as FeatureKind, id: a.properties.id, name: a.properties.name })),
                        ...dataset.beaches.map((b) => ({ kind: 'beach' as const, id: b.properties.id, name: b.properties.name })),
                        ...dataset.hotels.map((h) => ({ kind: 'hotel' as const, id: h.id, name: h.name })),
                      ].map((f) => (
                        <li key={`${f.kind}:${f.id}`}>
                          <button type="button" className="list-btn" onClick={() => select(f.kind, f.id)}>
                            <span>{f.name}</span>
                            <span className="muted small">{f.kind}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </aside>
        </main>
      ) : null}

      {view === 'compare' ? (
        <main className="page">
          <CompareView key={compareSeed ?? 'none'} dataset={dataset} initialA={compareSeed} />
        </main>
      ) : null}

      {view === 'calibrate' ? (
        <main className="page">
          <CalibrateView dataset={dataset} feedback={feedback} onChange={changeFeedback} onExport={exportFeedback} onClear={clearFeedback} storageOk={storageOk} exportJson={exportJson} />
        </main>
      ) : null}

      {view === 'offers' ? (
        <main className="page">
          <OffersView />
        </main>
      ) : null}
    </div>
  );
}

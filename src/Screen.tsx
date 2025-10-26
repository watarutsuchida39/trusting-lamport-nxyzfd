import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import MapView from "./MapView"; // ← MapViewは既存のものを使う
import { Source, Layer as MapLayer } from "react-map-gl/mapbox";
type Shape = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export default function RectEditor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  const [size, setSize] = useState({ w: 600, h: 400 });
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [polygon, setPolygon] = useState<[number, number][]>([]);

  // 🟦 Map読み込み完了フラグ
  const [mapReady, setMapReady] = useState(false);

  // 🟦 Map読み込みイベント
  const handleMapLoad = (mapInstance: any) => {
    mapRef.current = mapInstance;
    setMapReady(true);
    console.log("🗺 MapView 初期化完了");
  };

  // 🟦 Stageが初期化されたか
  useEffect(() => {
    if (stageRef.current) console.log("🎨 Stage 初期化完了");
  }, [stageRef]);

  // 🟦 ラッパーサイズに合わせてステージ調整
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: Math.max(320, height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 🟦 Transformer制御
  useEffect(() => {
    if (!trRef.current) return;
    const stage = stageRef.current;
    const node = stage?.findOne(`#${selectedId}`);
    if (node) trRef.current.nodes([node]);
    else trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, shapes]);

  // 🟦 四隅座標（ピクセル）
  const getCornerPoints = (s: Shape) => {
    const rad = (s.rotation * Math.PI) / 180;
    const hw = s.width / 2;
    const hh = s.height / 2;
    const cx = s.x + hw;
    const cy = s.y + hh;
    return [
      {
        x: cx - hw * Math.cos(rad) + hh * Math.sin(rad),
        y: cy - hw * Math.sin(rad) - hh * Math.cos(rad),
      },
      {
        x: cx + hw * Math.cos(rad) + hh * Math.sin(rad),
        y: cy + hw * Math.sin(rad) - hh * Math.cos(rad),
      },
      {
        x: cx + hw * Math.cos(rad) - hh * Math.sin(rad),
        y: cy + hw * Math.sin(rad) + hh * Math.cos(rad),
      },
      {
        x: cx - hw * Math.cos(rad) - hh * Math.sin(rad),
        y: cy - hw * Math.sin(rad) + hh * Math.cos(rad),
      },
    ];
  };

  // 🟦 ピクセル→緯度経度（Mapbox座標に変換）
  const toLngLat = (pts: { x: number; y: number }[]) => {
    const map = mapRef.current?.getMap?.();
    const stage = stageRef.current;
    console.log(map);
    console.log(stage);
    if (!map || !stage) {
      console.warn("⚠️ mapまたはstageが未定義です");
      return [];
    }

    const stageRect = stage.container().getBoundingClientRect();
    const mapRect = mapRef.current.getContainer().getBoundingClientRect();

    const offsetX = stageRect.left - mapRect.left;
    const offsetY = stageRect.top - mapRect.top;

    console.group("🛰 toLngLat デバッグ情報");
    console.log("MapRect:", mapRect);
    console.log("StageRect:", stageRect);
    console.log("オフセット:", { offsetX, offsetY });
    console.log("入力ポイント:", pts);

    const result = pts.map((p, i) => {
      const screenX = p.x + offsetX;
      const screenY = p.y + offsetY;
      const lngLat = map.unproject([screenX, screenY]);

      console.log(`Point${i + 1}:`, {
        stageX: p.x,
        stageY: p.y,
        screenX,
        screenY,
        lng: lngLat.lng,
        lat: lngLat.lat,
      });

      return [lngLat.lng, lngLat.lat] as [number, number];
    });

    console.log("変換結果（LngLat配列）:", result);
    console.groupEnd();
    return result;
  };

  // 🟦 図形更新 → ポリゴン更新
  const updatePolygon = (shape: Shape) => {
    if (!mapReady || !mapRef.current || !stageRef.current) {
      console.warn("⚠️ Map または Stage が未初期化。updatePolygon スキップ。");
      return;
    }
    const pts = getCornerPoints(shape);
    const geoPts = toLngLat(pts);
    setPolygon(geoPts);
    console.log("Polygon:", geoPts);
  };

  // 🟦 四角形追加
  const addRect = () => {
    const id = crypto.randomUUID();
    setShapes((prev) => [
      ...prev,
      { id, x: 120, y: 100, width: 160, height: 100, rotation: 0 },
    ]);
    setSelectedId(id);
  };

  // 🟦 選択解除
  const handleDeselect = (e: any) => {
    if (e.target === e.target.getStage()) setSelectedId(null);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "70vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 🔘 コントロールボタン */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 100,
          display: "flex",
          gap: "8px",
        }}
      >
        <button onClick={() => setEditMode(!editMode)}>
          {editMode ? "🗺 地図モードへ" : "✏️ 編集モードへ"}
        </button>
        <button onClick={() => setShowMap(!showMap)}>
          {showMap ? "🌑 地図を隠す" : "🌕 地図を表示"}
        </button>
        {editMode && <button onClick={addRect}>＋四角形</button>}
      </div>

      {/* 🗺 MapView */}
      {showMap && (
        <MapView
          ref={mapRef}
          onLoad={handleMapLoad}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 0,
          }}
          zoom={5}
        >
          {polygon.length > 0 && (
            <Source
              id="polygon"
              type="geojson"
              data={{
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [[...polygon, polygon[0]]],
                },
              }}
            >
              <MapLayer
                id="polygon-fill"
                type="fill"
                paint={{
                  "fill-color": "#2563eb",
                  "fill-opacity": 0.3,
                }}
              />
              <MapLayer
                id="polygon-outline"
                type="line"
                paint={{
                  "line-color": "#2563eb",
                  "line-width": 2,
                }}
              />
            </Source>
          )}
        </MapView>
      )}

      {/* ✏️ 編集モードのときだけStageを重ねる */}
      {editMode && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          listening={true}
          onMouseDown={handleDeselect}
          onTouchStart={handleDeselect}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
            zIndex: 50,
          }}
        >
          <Layer>
            {shapes.map((s) => (
              <Rect
                key={s.id}
                id={s.id}
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                rotation={s.rotation}
                fill="rgba(37,99,235,0.03)" // ごく薄い透明色
                stroke="#2563eb"
                strokeWidth={2}
                hitStrokeWidth={20}
                draggable
                onClick={() => setSelectedId(s.id)}
                onTap={() => setSelectedId(s.id)}
                onTouchStart={() => setSelectedId(s.id)}
                onDragEnd={(e) => {
                  const { x, y } = e.target.position();
                  const updated = { ...s, x, y };
                  setShapes((prev) =>
                    prev.map((p) => (p.id === s.id ? updated : p))
                  );
                  updatePolygon(updated);
                }}
                onTransformEnd={(e) => {
                  const node: any = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  const width = Math.max(20, node.width() * scaleX);
                  const height = Math.max(20, node.height() * scaleY);
                  node.scaleX(1);
                  node.scaleY(1);
                  const updated = {
                    ...s,
                    x: node.x(),
                    y: node.y(),
                    width,
                    height,
                    rotation: node.rotation(),
                  };
                  setShapes((prev) =>
                    prev.map((p) => (p.id === s.id ? updated : p))
                  );
                  updatePolygon(updated);
                }}
              />
            ))}
            <Transformer ref={trRef} rotateEnabled />
          </Layer>
        </Stage>
      )}
    </div>
  );
}

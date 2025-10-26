// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import MapView from "./MapView"; // ← MapViewは既存のものを使う
import { Source, Layer as MapLayer, useMap } from "react-map-gl/mapbox";
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
  const [center, setCenter] = useState<[number, number] | null>(null);
  // 🟦 状態管理
  const [polygons, setPolygons] = useState<
    { id: string; coordinates: [number, number][]; center: [number, number] }[]
  >([]);

  const mapRef2 = useMap();

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

  // 🟦 四隅座標（Konva Rect と同じ基準で）
  const getCornerPoints = (s: Shape) => {
    const rad = (s.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // 左上を基準に回転
    const { x, y, width, height } = s;

    // 各頂点を回転（左上基準）
    const pts = [
      { x: 0, y: 0 }, // 左上
      { x: width, y: 0 }, // 右上
      { x: width, y: height }, // 右下
      { x: 0, y: height }, // 左下
    ].map((p) => ({
      x: x + p.x * cos - p.y * sin,
      y: y + p.x * sin + p.y * cos,
    }));

    return pts;
  };

  // 🟦 ピクセル→緯度経度（Mapbox座標に変換）
  const toLngLat = (pts: { x: number; y: number }[]) => {
    // const map = mapRef.current?.getMap?.();
    const map = mapRef2.map;
    const stage = stageRef.current;
    // const map2 = mapRef2;
    // console.log(map);
    // console.log(map2.map.getStyle());
    // console.log(stage);
    if (!map || !stage) {
      console.warn("⚠️ mapまたはstageが未定義です");
      return [];
    }

    const stageRect = stage.container().getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();

    const offsetX = stageRect.left - mapRect.left;
    const offsetY = stageRect.top - mapRect.top;

    // console.group("🛰 toLngLat デバッグ情報");
    // console.log("MapRect:", mapRect);
    // console.log("StageRect:", stageRect);
    // console.log("オフセット:", { offsetX, offsetY });
    // console.log("入力ポイント:", pts);

    const result = pts.map((p, i) => {
      const screenX = p.x + offsetX;
      const screenY = p.y + offsetY;
      const lngLat = map.unproject([screenX, screenY]);

      // console.log(`Point${i + 1}:`, {
      //   stageX: p.x,
      //   stageY: p.y,
      //   screenX,
      //   screenY,
      //   lng: lngLat.lng,
      //   lat: lngLat.lat,
      // });

      return [lngLat.lng, lngLat.lat] as [number, number];
    });

    // console.log("変換結果（LngLat配列）:", result);
    // console.groupEnd();
    return result;
  };

  // 🟦 中心計算（単純平均）
  const getPolygonCenter = (coords: [number, number][]) => {
    const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    return [avgLng, avgLat] as [number, number];
  };
  const updatePolygon = (shape: Shape) => {
    const pts = getCornerPoints(shape);
    const geoPts = toLngLat(pts);
    const center = getPolygonCenter(geoPts);

    // width/height比を求める
    const aspect = shape.width / shape.height;
    const scale = Math.max(shape.width, shape.height) / 100;
    console.log(shape.width, shape.height);
    const scaleX = shape.width / 100;
    const scaleY = shape.height / 100;
    setPolygons((prev) => {
      const updated = {
        id: shape.id,
        coordinates: geoPts,
        center,
        rotation: shape.rotation,
        scale,
        scaleX,
        scaleY,
        aspect,
      };
      const existing = prev.find((p) => p.id === shape.id);
      return existing
        ? prev.map((p) => (p.id === shape.id ? updated : p))
        : [...prev, updated];
    });
  };

  // 🟦 四角形追加
  const addRect = () => {
    // const id = crypto.randomUUID();
    const id = Date.now().toString();
    setShapes((prev) => [
      ...prev,
      { id, x: 120, y: 100, width: 100, height: 100, rotation: 0 },
    ]);
    setSelectedId(id);
  };

  // 🟦 選択解除
  const handleDeselect = (e: any) => {
    if (e.target === e.target.getStage()) setSelectedId(null);
  };

  // 🗺 Map 初期化
  useEffect(() => {
    // if (!mapContainer.current) return;
    const map = mapRef2?.map;

    if (!map) return;

    map.on("load", async () => {
      console.log("🗺 Map loaded");

      // GLB モデルを追加
      await map.addModel(
        "duck-model",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb"
      );
      // .catch((err) => console.log(err));

      console.log("🦆 モデルロード完了");
    });

    // return () => map?.remove();
  }, [mapRef2]);

  const scale = 100;

  // 🟦 polygons からモデル GeoJSON を生成
  const modelsGeoJson = {
    type: "FeatureCollection",
    features: polygons.map((poly) => ({
      type: "Feature",
      properties: {
        id: `model-${poly.id}`,
        model: "duck-model",
        rotation: [0, 0, poly.rotation || 0],
        // scale: [poly.scale * 50000, poly.scale * 100000, poly.scale * 100000],
        scale: [
          poly?.scaleX * scale,
          poly.scaleY * scale,
          // poly.scale * 100000,
          1 * scale,
        ],
        aspect: poly.aspect,
      },
      geometry: {
        type: "Point",
        coordinates: poly.center,
      },
    })),
  };

  console.log(modelsGeoJson);
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
          // ref={mapRef}
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
          initialViewState={{
            // "longitude":
            zoom: 12,
            longitude: 139.767125,
            latitude: 35.681236,
          }}

          // zoom={5}
        >
          {polygons.map((poly) => (
            <React.Fragment key={poly.id}>
              {/* Polygon */}
              <Source
                id={`polygon-${poly.id}`}
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "Polygon",
                    coordinates: [[...poly.coordinates, poly.coordinates[0]]],
                  },
                  properties: {},
                }}
              >
                <MapLayer
                  id={`polygon-fill-${poly.id}`}
                  type="fill"
                  paint={{
                    "fill-color": "#2563eb",
                    "fill-opacity": 0.2,
                  }}
                />
                <MapLayer
                  id={`polygon-outline-${poly.id}`}
                  type="line"
                  paint={{
                    "line-color": "#2563eb",
                    "line-width": 2,
                  }}
                />
              </Source>
              {/* Models (全polygonsまとめて) */}
              {polygons.length > 0 && (
                <Source id="models" type="geojson" data={modelsGeoJson}>
                  <MapLayer
                    id="duck-models"
                    type="model"
                    layout={{
                      "model-id": ["get", "model"],
                      // "model-rotation": [45, 90, 185],
                    }}
                    paint={{
                      "model-scale": ["get", "scale"],
                      // "model-scale": [["get", "scaleX"], ["get", "scaleY"], 0],
                      // "model-rotation": ["get", "rotation"],
                      "model-rotation": [0.5, 0.8, 0],
                      // "model-emissive-strength": 0.7,
                      // "model-color": "red",
                      // "model-color-mix-intensity": 0.5,
                      "model-opacity": 0.5,
                    }}
                  />
                </Source>
              )}
            </React.Fragment>
          ))}
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

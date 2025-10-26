import MapGL, { AttributionControl, Source, useMap } from "react-map-gl/mapbox";
import type { MapProps } from "react-map-gl/mapbox";
// import Map from 'react-map-gl/mapbox';
import "mapbox-gl/dist/mapbox-gl.css";
import React, { memo, useEffect } from "react";

const MapView = memo((props: MapProps) => {
  //   const isMobile = useWindowDimensions().width < 600;
  return (
    <MapGL
      id="map"
      // ref={mapRef}
      mapboxAccessToken="pk.eyJ1IjoibWFwa2lkIiwiYSI6ImNrZ3U0a3d6aTBrOWgyeXRtanh0aHUzOTcifQ.ss4jGIc7hG9VyW80bQ81jw"
      // mapStyle={"mapbox://styles/mapbox/dark-v11"}
      // mapStyle={"mapbox://styles/mapbox/streets-v12"}

      antialias
      // terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
      {...props}
      // light={{
      //   anchor: "viewport",
      //   color: "white",
      //   intensity: 0.4,
      // }}

      //   logoPosition={isMobile ? "top-right" : "bottom-left"}
      attributionControl={false}
    >
      {/* <AttributionControl
        compact
        position={isMobile ? "top-right" : "bottom-right"}
      /> */}
      {/* <Source
        id="mapbox-dem"
        type="raster-dem"
        url="mapbox://mapbox.mapbox-terrain-dem-v1"
        // url="mapbox://mapbox.mapbox-terrain-v2" // for terrain info
        tileSize={512}
        maxzoom={14}
      /> */}
      {props.children}
    </MapGL>
  );
});

export default MapView;

// export default function MapView({ children }) {

// }

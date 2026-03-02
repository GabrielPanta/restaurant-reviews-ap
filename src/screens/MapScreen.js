import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);

  const [region, setRegion] = useState(null);
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    };

    setRegion(coords);

    if (mapRef.current) {
      mapRef.current.animateToRegion(coords, 1000);
    }

    loadNearbyRestaurants(coords.latitude, coords.longitude);
  };

  const loadNearbyRestaurants = async (lat, lng) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}` +
        `&radius=1000` +
        `&type=restaurant` +
        `&key=${GOOGLE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      setPlaces(json.results || []);
    } catch (e) {
      console.log("Error cargando restaurantes", e);
    }
  };

  if (!region) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={region}
      showsUserLocation
    >
      {places.map(place => (
        <Marker
          key={place.place_id}
          coordinate={{
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng
          }}
        >
          <Callout
            tooltip
            onPress={() => navigation.navigate("Restaurant", { place })}
          >
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{place.name}</Text>
              <Text style={styles.calloutDesc}>{place.vicinity}</Text>
              <Text style={styles.calloutAction}>Ver reseñas</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  callout: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 4
  },
  calloutTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111"
  },
  calloutDesc: {
    fontSize: 12,
    color: "#555",
    marginTop: 2
  },
  calloutAction: {
    marginTop: 8,
    color: "#22c55e",
    fontWeight: "600"
  }
});
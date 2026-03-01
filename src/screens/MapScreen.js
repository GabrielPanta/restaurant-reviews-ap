import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { GOOGLE_PLACES_KEY } from "../config/maps";

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      await fetchRestaurants(loc.coords);

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const fetchRestaurants = async (coords) => {
    const url =
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
      `location=${coords.latitude},${coords.longitude}` +
      "&radius=1500&type=restaurant&key=" +
      GOOGLE_PLACES_KEY;

    const res = await fetch(url);
    const data = await res.json();

    if (data.results) {
      setPlaces(data.results);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.text}>Buscando restaurantes...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No se pudo obtener ubicación</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      }}
    >
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude
        }}
        title="Estás aquí"
      />

          {places.map((p) => (
              <Marker
                  key={p.place_id}
                  coordinate={{
                      latitude: p.geometry.location.lat,
                      longitude: p.geometry.location.lng
                  }}
                  title={p.name}
                  description={p.vicinity}
                  onPress={() => navigation.navigate("Restaurant", { place: p })}
              />
        ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center"
  },
  text: { color: "#fff", marginTop: 10 }
});
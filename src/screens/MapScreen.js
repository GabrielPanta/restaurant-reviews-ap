import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
  TouchableOpacity
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const CARD_PADDING = 10;
const SPACING = 20;

const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }]
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }]
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }]
  }
];

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const flatListRef = useRef(null);

  const [region, setRegion] = useState(null);
  const [places, setPlaces] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useRef(new Animated.Value(0)).current;

  // Actualiza el mapa cuando se desliza a una nueva tarjeta
  useEffect(() => {
    if (places.length > 0 && mapRef.current) {
      const place = places[activeIndex];
      mapRef.current.animateToRegion({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }, 500);
    }
  }, [activeIndex, places]);

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

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const onMarkerPress = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
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
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        customMapStyle={darkMapStyle}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {places.map((place, index) => {
          const isActive = index === activeIndex;
          return (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng
              }}
              onPress={() => onMarkerPress(index)}
              tracksViewChanges={false} // Mejora rendimiento
            >
              <View style={[
                styles.customMarker,
                isActive && styles.activeMarker
              ]}>
                <Ionicons
                  name="restaurant"
                  size={isActive ? 18 : 14}
                  color="#fff"
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <Animated.FlatList
        ref={flatListRef}
        data={places}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SPACING / 2 }}
        keyExtractor={item => item.place_id}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + SPACING,
          offset: (CARD_WIDTH + SPACING) * index,
          index,
        })}
        style={styles.carousel}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.card, { width: CARD_WIDTH, marginHorizontal: SPACING / 2 }]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("Restaurant", { place: item })}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <View style={styles.cardRow}>
                <Ionicons name="location-outline" size={14} color="#94a3b8" />
                <Text style={styles.cardDesc} numberOfLines={1}>{item.vicinity}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.ratingText}>{item.rating || "N/A"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  customMarker: {
    backgroundColor: "#1e293b",
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6
  },
  activeMarker: {
    backgroundColor: "#22c55e",
    borderColor: "#fff",
    padding: 8,
    transform: [{ scale: 1.1 }]
  },
  carousel: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.2
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cardDesc: {
    color: "#94a3b8",
    fontSize: 13,
    marginLeft: 4,
    flex: 1
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#22c55e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  ratingText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 4
  }
});
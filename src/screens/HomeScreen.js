import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

export default function HomeScreen({ navigation }) {
  const [city, setCity] = useState("Tu ciudad");
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({});
    loadNearbyRestaurants(loc.coords.latitude, loc.coords.longitude);
  };

  const loadNearbyRestaurants = async (lat, lng) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}` +
        `&radius=1500` +
        `&type=restaurant` +
        `&key=${GOOGLE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      setPlaces(json.results || []);
    } catch (e) {
      console.log(e);
    }
  };

  const filtered = places.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("Restaurant", { place: item })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.address}>{item.vicinity}</Text>
        <Text style={styles.rating}>⭐ {item.rating || "4.5"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Restaurantes</Text>
        <Text style={styles.subtitle}>Cerca de ti</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Buscar restaurantes..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate("Map")}
        >
          <Text style={styles.mapText}>Ver en mapa</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.place_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a"
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700"
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4
  },

  searchBox: {
    paddingHorizontal: 20,
    marginTop: 10
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14
  },

  actions: {
    paddingHorizontal: 20,
    marginTop: 14
  },
  mapButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  mapText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },

  list: {
    padding: 20,
    paddingBottom: 40
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  cardContent: {},

  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  address: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4
  },
  rating: {
    color: "#22c55e",
    marginTop: 6,
    fontWeight: "600"
  }
});
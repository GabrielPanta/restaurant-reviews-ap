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

import { auth, db } from "../services/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

export default function HomeScreen({ navigation }) {
  const [city, setCity] = useState("Tu ciudad");
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [ranking, setRanking] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadLocation();
      loadRanking();
    }, [])
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.log("Error logout", e);
    }
  };

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

  const loadRanking = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "reviews"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const map = {};

      snapshot.forEach(doc => {
        const r = doc.data();

        if (!map[r.placeId]) {
          map[r.placeId] = {
            name: r.name,
            address: r.address,
            ratings: [],
            visits: 0
          };
        }

        map[r.placeId].ratings.push(r.rating);
        map[r.placeId].visits += 1;
      });

      const rankingData = Object.values(map).map(item => {
        const avg =
          item.ratings.reduce((a, b) => a + b, 0) /
          item.ratings.length;

        return {
          ...item,
          avg: avg.toFixed(1)
        };
      });

      rankingData.sort((a, b) => b.avg - a.avg);

      setRanking(rankingData);

    } catch (e) {
      console.log("Error ranking", e);
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
      <View>
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
        <View>
          <Text style={styles.title}>Restaurantes</Text>
          <Text style={styles.subtitle}>Cerca de ti</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
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
          onPress={() => navigation.navigate("MainTabs", { screen: "Map" })}
        >
          <Text style={styles.mapText}>Ver en mapa</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <Text style={styles.sectionTitle}>
          Tu ranking de restaurantes
        </Text>

        {ranking.length === 0 ? (
          <Text style={styles.empty}>
            Aún no tienes reseñas
          </Text>
        ) : (
          ranking.slice(0, 5).map((r, i) => (
            <View key={i} style={styles.rankCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankName}>
                  {i + 1}. {r.name}
                </Text>
                <Text style={styles.rankVisits}>
                  {r.visits} visitas
                </Text>
              </View>

              <Text style={styles.rankAvg}>
                ⭐ {r.avg}
              </Text>
            </View>
          ))
        )}
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
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  logoutButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10
  },

  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
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

  ranking: {
    paddingHorizontal: 20,
    marginTop: 14
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 10
  },

  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },

  empty: {
    color: "#94a3b8",
    marginBottom: 10
  },

  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },

  rankName: {
    color: "#fff",
    fontSize: 15
  },

  rankVisits: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2
  },

  rankAvg: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "600"
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
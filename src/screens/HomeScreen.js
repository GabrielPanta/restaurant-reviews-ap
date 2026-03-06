import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "../services/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

export default function HomeScreen({ navigation }) {
  const [city, setCity] = useState("Tu ciudad");
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [mostVisited, setMostVisited] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [globalDiscoveries, setGlobalDiscoveries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadLocation();
      loadMostVisited();
      loadFavorites();
      loadGlobalDiscoveries();
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

  const loadMostVisited = async () => {
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
        const avg = item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length;
        return { ...item, avg: avg.toFixed(1) };
      });

      rankingData.sort((a, b) => b.visits - a.visits);
      setMostVisited(rankingData);
    } catch (e) {
      console.log("Error ranking", e);
    }
  };

  const loadFavorites = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "users", user.uid, "favorites"),
        orderBy("addedAt", "desc")
      );

      const snapshot = await getDocs(q);
      setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.log("Error loading favorites in Home:", e);
    }
  };

  const loadGlobalDiscoveries = async () => {
    try {
      const q = query(
        collection(db, "reviews"),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const discoveries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName || "Anónimo",
          userInitial: data.userName ? data.userName[0].toUpperCase() : "?",
          placeId: data.placeId,
          name: data.name,
          address: data.address,
          rating: data.rating,
          createdAt: data.createdAt?.toDate().toISOString()
        };
      });
      setGlobalDiscoveries(discoveries);
    } catch (e) {
      console.log("Error loading global discoveries:", e);
    }
  };

  const filtered = places.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("Restaurant", { place: item })}
      activeOpacity={0.8}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#94a3b8" />
          <Text style={styles.address} numberOfLines={1}>{item.vicinity}</Text>
        </View>
      </View>
      <View style={styles.ratingBadge}>
        <Ionicons name="star" size={12} color="#fff" />
        <Text style={styles.ratingText}>{item.rating || "4.5"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Bienvenido a Gusto</Text>
          <Text style={styles.title}>Descubre</Text>
        </View>

        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar restaurantes..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
        </View>
        <TouchableOpacity
          style={styles.mapIconButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MapTab")}
        >
          <Ionicons name="map" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {globalDiscoveries.length > 0 && (
          <View style={styles.rankingSection}>
            <Text style={styles.sectionTitle}>Novedades de la Comunidad 🌍</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingScroll}>
              {globalDiscoveries.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.discoveryCard}
                  onPress={() => navigation.navigate("Restaurant", { place: { place_id: item.placeId, name: item.name, vicinity: item.address, rating: item.rating } })}
                >
                  <View style={styles.discoveryHeader}>
                    <View style={styles.discoveryAvatar}>
                      <Text style={styles.discoveryInitial}>{item.userInitial || "?"}</Text>
                    </View>
                    <View>
                      <Text style={styles.discoveryUser} numberOfLines={1}>{item.userName || "Alguien"}</Text>
                      <Text style={styles.discoveryAction}>descubrió</Text>
                    </View>
                  </View>
                  <Text style={styles.discoveryPlace} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.discoveryFooter}>
                    <View style={styles.discoveryRating}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.discoveryRatingText}>{item.rating}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={12} color="#64748b" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.rankingSection}>
          <Text style={styles.sectionTitle}>Tus Favoritos ❤️</Text>

          {favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={32} color="#334155" />
              <Text style={styles.empty}>Guarda tus lugares preferidos</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingScroll}>
              {favorites.slice(0, 5).map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.rankCard}
                  onPress={() => navigation.navigate("Restaurant", { place: { place_id: r.placeId, name: r.name, vicinity: r.vicinity, rating: r.rating } })}
                >
                  <View style={styles.favBadge}>
                    <Ionicons name="heart" size={12} color="#fff" />
                  </View>
                  <View style={styles.rankContent}>
                    <Text style={styles.rankName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.rankVisits}>{r.vicinity}</Text>
                  </View>
                  <View style={styles.rankScore}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.rankAvg}>{r.rating || "N/A"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {mostVisited.length > 0 && (
          <View style={styles.rankingSection}>
            <Text style={styles.sectionTitle}>Más Visitados 🍴</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingScroll}>
              {mostVisited.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.rankCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{i + 1}</Text>
                  </View>
                  <View style={styles.rankContent}>
                    <Text style={styles.rankName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.rankVisits}>{r.visits} visitas</Text>
                  </View>
                  <View style={styles.rankScore}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.rankAvg}>{r.avg}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Cerca de ti</Text>
          {filtered.map(item => <View key={item.place_id}>{renderItem({ item })}</View>)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a"
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.5
  },
  subtitle: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4
  },
  logoutIcon: {
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 12
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#1e293b",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#334155"
  },
  searchIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
  },
  mapIconButton: {
    backgroundColor: "#22c55e",
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  rankingSection: {
    marginBottom: 24
  },
  sectionTitle: {
    paddingHorizontal: 24,
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3
  },
  rankingScroll: {
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginHorizontal: 24,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155'
  },
  empty: {
    color: "#64748b",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500"
  },
  rankCard: {
    width: 160,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  rankBadge: {
    backgroundColor: "#22c55e",
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12
  },
  favBadge: {
    backgroundColor: "#ef4444",
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12
  },
  rankBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10
  },
  discoveryCard: {
    backgroundColor: "#1e293b",
    width: 200,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  discoveryAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  discoveryInitial: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800"
  },
  discoveryUser: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
    width: 110
  },
  discoveryAction: {
    color: "#64748b",
    fontSize: 10
  },
  discoveryPlace: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10
  },
  discoveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  discoveryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  discoveryRatingText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 4
  },
  rankContent: {
    marginBottom: 12
  },
  rankName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  rankVisits: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500"
  },
  rankScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20
  },
  rankAvg: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4
  },
  listSection: {
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  cardInfo: {
    flex: 1,
    paddingRight: 16
  },
  name: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  address: {
    color: "#94a3b8",
    fontSize: 13,
    marginLeft: 4,
    flex: 1
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4
  },
  ratingText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 4
  }
});
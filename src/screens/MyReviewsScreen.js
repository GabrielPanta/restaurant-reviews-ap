import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  RefreshControl,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../services/firebase";

export default function MyReviewsScreen() {
  const [reviews, setReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyReviews();
  }, []);

  const loadMyReviews = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "reviews"),
        where("userId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(doc => {
        const data = doc.data();

        let date = "Sin fecha";
        if (data.createdAt && data.createdAt.toDate) {
          date = data.createdAt
            .toDate()
            .toLocaleDateString();
        }

        return {
          id: doc.id,
          ...data,
          date
        };
      });

      list.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.seconds - a.createdAt.seconds;
      });

      setReviews(list);
    } catch (e) {
      console.log("Error cargando mis reseñas:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const getStats = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let bestRating = 0;
    let favorite = null;

    reviews.forEach(r => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
      if (r.rating >= bestRating) {
        bestRating = r.rating;
        favorite = r.name;
      }
    });

    return { counts, favorite };
  };

  const AnimatedBar = ({ count, total, label, color }) => {
    const animatedWidth = useState(new Animated.Value(0))[0];

    useEffect(() => {
      const percentage = total > 0 ? (count / total) : 0;
      Animated.timing(animatedWidth, {
        toValue: percentage * 100,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }, [count, total]);

    return (
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.barCount}>{count}</Text>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyReviews();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.log("Error cerrando sesión", e);
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#f59e0b" : "#475569"}
          />
        ))}
        <Text style={styles.ratingNumber}>{rating}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text style={styles.date}>{item.date}</Text>
          </View>
        </View>
      </View>

      {renderStars(item.rating)}

      {item.comment ? (
        <View style={styles.commentContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748b" style={styles.commentIcon} />
          <Text style={styles.comment}>{item.comment}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.container}>

        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Tu historial</Text>
            <Text style={styles.title}>Mis Reseñas</Text>
          </View>

          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout} activeOpacity={0.6}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>Sin reseñas aún</Text>
            <Text style={styles.emptyText}>Parece que no has calificado ningún restaurante todavía. ¡Anímate a explorar!</Text>
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#22c55e"
                colors={["#22c55e"]}
              />
            }
            ListHeaderComponent={
              <View style={styles.statsHeader}>
                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsHeader}>
                    <View>
                      <Text style={styles.analyticsTitle}>Tu Resumen</Text>
                      <Text style={styles.analyticsSubtitle}>{reviews.length} aportes totales</Text>
                    </View>
                    <View style={styles.averageBadge}>
                      <Ionicons name="stats-chart" size={18} color="#22c55e" />
                    </View>
                  </View>

                  <View style={styles.chartsContainer}>
                    <AnimatedBar color="#22c55e" count={getStats().counts[5]} total={reviews.length} label="5★" />
                    <AnimatedBar color="#84cc16" count={getStats().counts[4]} total={reviews.length} label="4★" />
                    <AnimatedBar color="#eab308" count={getStats().counts[3]} total={reviews.length} label="3★" />
                    <AnimatedBar color="#f97316" count={getStats().counts[2]} total={reviews.length} label="2★" />
                    <AnimatedBar color="#ef4444" count={getStats().counts[1]} total={reviews.length} label="1★" />
                  </View>

                  {getStats().favorite && (
                    <View style={styles.favoriteHighlight}>
                      <Ionicons name="heart" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                      <Text style={styles.favoriteText}>
                        Tu favorito: <Text style={styles.favoriteName}>{getStats().favorite}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {reviews.length > 0 && (
                  <Text style={styles.sectionTitle}>Historial reciente</Text>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0f172a"
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 30,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -50
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 0
  },
  statsHeader: {
    marginBottom: 20,
    marginTop: 10
  },
  analyticsCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  analyticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  analyticsTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800"
  },
  analyticsSubtitle: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500"
  },
  averageBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    justifyContent: "center",
    alignItems: "center"
  },
  chartsContainer: {
    gap: 8
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  barLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    width: 25
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 4
  },
  barCount: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    width: 20,
    textAlign: "right"
  },
  favoriteHighlight: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)"
  },
  favoriteText: {
    color: "#94a3b8",
    fontSize: 13
  },
  favoriteName: {
    color: "#fff",
    fontWeight: "700"
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    letterSpacing: 0.3
  },
  card: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5
  },
  cardHeader: {
    marginBottom: 12
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
    letterSpacing: 0.2
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  date: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600"
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 2
  },
  ratingNumber: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6
  },
  commentContainer: {
    flexDirection: 'row',
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    padding: 14,
    borderRadius: 18,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e"
  },
  commentIcon: {
    marginRight: 10,
    marginTop: 2
  },
  comment: {
    color: "#cbd5e1",
    fontSize: 14,
    flex: 1,
    lineHeight: 22
  }
});
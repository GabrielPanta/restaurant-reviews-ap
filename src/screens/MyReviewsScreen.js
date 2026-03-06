import { signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  RefreshControl,
  Animated,
  Image,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db, storage } from "../services/firebase";

export default function MyReviewsScreen() {
  const [reviews, setReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMyReviews();
    }, [])
  );

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

  const handleDeleteReview = async (reviewId, imageUrl) => {
    Alert.alert(
      "Eliminar Reseña",
      "¿Estás seguro de que quieres borrar esta opinión? No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "reviews", reviewId));
              if (imageUrl) {
                try {
                  const imgRef = ref(storage, imageUrl);
                  await deleteObject(imgRef);
                } catch (err) { console.log("Error Storage:", err); }
              }
              loadMyReviews();
            } catch (error) {
              console.log("Error deleting:", error);
            }
          }
        }
      ]
    );
  };

  const getStats = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let bestRating = 0;
    let favorite = null;

    let totalRating = 0;
    reviews.forEach(r => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
      totalRating += r.rating;
      if (r.rating >= bestRating) {
        bestRating = r.rating;
        favorite = r.name;
      }
    });

    const average = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "0.0";
    return { counts, favorite, average };
  };

  const ModernBar = ({ count, total, label, color }) => {
    const animatedWidth = useState(new Animated.Value(0))[0];

    useEffect(() => {
      const percentage = total > 0 ? (count / total) : 0;
      Animated.spring(animatedWidth, {
        toValue: percentage * 100,
        friction: 8,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }, [count, total]);

    return (
      <View style={styles.modernBarRow}>
        <Text style={styles.modernBarLabel}>{label}</Text>
        <View style={styles.modernBarTrack}>
          <Animated.View
            style={[
              styles.modernBarFill,
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
        <Text style={styles.modernBarCount}>{count}</Text>
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
          <View style={styles.headerActions}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteReview(item.id, item.imageUrl)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {renderStars(item.rating)}

      {item.comment ? (
        <View style={styles.commentContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748b" style={styles.commentIcon} />
          <Text style={styles.reviewComment}>{item.comment}</Text>
        </View>
      ) : null}

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.reviewImage} resizeMode="cover" />
      )}
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
                <View style={styles.premiumDashboard}>
                  <View style={styles.glassHeader}>
                    <View>
                      <Text style={styles.premiumTitle}>Tu Impacto</Text>
                      <Text style={styles.premiumSubtitle}>Nivel: {reviews.length >= 10 ? "Experto 🏆" : reviews.length >= 5 ? "Frecuente 🥈" : "Novato 🥉"}</Text>
                    </View>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalCount}>{reviews.length}</Text>
                      <Text style={styles.totalLabel}>Reseñas</Text>
                    </View>
                  </View>

                  <View style={styles.dashboardMiddle}>
                    <View style={styles.averageCircleContainer}>
                      <View style={styles.averageCircle}>
                        <Text style={styles.averageValue}>{getStats().average}</Text>
                        <Text style={styles.averageLabel}>Promedio</Text>
                      </View>
                      <View style={styles.starRing}>
                        <Ionicons name="star" size={24} color="#f59e0b" />
                      </View>
                    </View>

                    <View style={styles.distributionContainer}>
                      <ModernBar color="#22c55e" count={getStats().counts[5]} total={reviews.length} label="Excelente" />
                      <ModernBar color="#84cc16" count={getStats().counts[4]} total={reviews.length} label="Muy Bueno" />
                      <ModernBar color="#eab308" count={getStats().counts[3]} total={reviews.length} label="Regular" />
                      <ModernBar color="#f97316" count={getStats().counts[2]} total={reviews.length} label="Malo" />
                      <ModernBar color="#ef4444" count={getStats().counts[1]} total={reviews.length} label="Terrible" />
                    </View>
                  </View>

                  {getStats().favorite && (
                    <View style={styles.favoritePill}>
                      <View style={styles.heartIconCircle}>
                        <Ionicons name="heart" size={14} color="#fff" />
                      </View>
                      <Text style={styles.favoritePillText} numberOfLines={1}>
                        Tu lugar top: <Text style={styles.favoritePillName}>{getStats().favorite}</Text>
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
  statsHeader: {
    marginBottom: 30,
    marginTop: 10
  },
  premiumDashboard: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderRadius: 36,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: 'hidden'
  },
  glassHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  premiumTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  premiumSubtitle: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  totalCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800'
  },
  totalLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  dashboardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 20
  },
  averageCircleContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  averageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#22c55e',
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  averageValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900'
  },
  averageLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  starRing: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: '#1e293b',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b'
  },
  distributionContainer: {
    flex: 1,
    gap: 10
  },
  modernBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14
  },
  modernBarLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    width: 60
  },
  modernBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  modernBarFill: {
    height: '100%',
    borderRadius: 3
  },
  modernBarCount: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    width: 20,
    textAlign: 'right'
  },
  favoritePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)'
  },
  heartIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  favoritePillText: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1
  },
  favoritePillName: {
    color: '#fff',
    fontWeight: '800'
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8
  }
});
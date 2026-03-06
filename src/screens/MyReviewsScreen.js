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
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../services/firebase";

export default function MyReviewsScreen() {
  const [reviews, setReviews] = useState([]);

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
    }
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
    paddingTop: 10
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
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
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
    letterSpacing: 0.2
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e"
  },
  commentIcon: {
    marginRight: 8,
    marginTop: 2
  },
  comment: {
    color: "#cbd5e1",
    fontSize: 14,
    flex: 1,
    lineHeight: 20
  }
});
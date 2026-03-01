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
    View
} from "react-native";
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
        if (data.createdAt?.toDate) {
          date = data.createdAt.toDate().toLocaleDateString();
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

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.rating}>⭐ {item.rating}</Text>
            <Text style={styles.date}>{item.date}</Text>
            {item.comment ? (
                <Text style={styles.comment}>{item.comment}</Text>
            ) : null}
        </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis reseñas</Text>

      {reviews.length === 0 ? (
        <Text style={styles.empty}>Aún no tienes reseñas</Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16
  },
  title: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 12
  },
  empty: {
    color: "#94a3b8"
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  name: {
    color: "#fff",
    fontSize: 16
  },
  rating: {
    color: "#22c55e",
    marginTop: 4
  },
  comment: {
    color: "#e2e8f0",
    marginTop: 4
  },
  date: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12
  }
});
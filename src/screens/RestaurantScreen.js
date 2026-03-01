import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth, db } from "../services/firebase";

export default function RestaurantScreen({ route }) {
    const { place } = route.params;

    const [rating, setRating] = useState("");
    const [comment, setComment] = useState("");
    const [reviews, setReviews] = useState([]);
    const [avg, setAvg] = useState(0);

    useEffect(() => {
        loadReviews();
    }, []);

   const loadReviews = async () => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("placeId", "==", place.place_id)
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

    setReviews(list);

    if (list.length > 0) {
      const total = list.reduce((sum, r) => sum + r.rating, 0);
      setAvg((total / list.length).toFixed(1));
    } else {
      setAvg(0);
    }

  } catch (error) {
    console.log("Error cargando reseñas:", error);
  }
};

    const saveReview = async () => {
        if (!rating) {
            Alert.alert("Ingresa una puntuación");
            return;
        }

        try {
            await addDoc(collection(db, "reviews"), {
                placeId: place.place_id,
                name: place.name,
                address: place.vicinity,
                rating: Number(rating),
                comment,
                userId: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });

            setRating("");
            setComment("");
            loadReviews();

        } catch (e) {
            Alert.alert("Error al guardar");
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
            <Text style={styles.date}>{item.date}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.address}>{place.vicinity}</Text>

            <View style={styles.stats}>
                <Text style={styles.avg}>Promedio: {avg}</Text>
                <Text style={styles.count}>{reviews.length} reseñas</Text>
            </View>

            <Text style={styles.section}>Tu reseña</Text>

            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={rating}
                onChangeText={setRating}
                placeholder="Puntuación 1-5"
                placeholderTextColor="#888"
            />

            <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={comment}
                onChangeText={setComment}
                placeholder="Comentario"
                placeholderTextColor="#888"
            />

            <TouchableOpacity style={styles.button} onPress={saveReview}>
                <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>

            <Text style={styles.section}>Opiniones</Text>

            <FlatList
                data={reviews}
                keyExtractor={item => item.id}
                renderItem={renderItem}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a",
        padding: 16
    },
    name: {
        color: "#fff",
        fontSize: 20
    },
    address: {
        color: "#94a3b8",
        marginBottom: 12
    },
    stats: {
        flexDirection: "row",
        marginBottom: 16
    },
    avg: {
        color: "#22c55e",
        marginRight: 12
    },
    count: {
        color: "#94a3b8"
    },
    section: {
        color: "#fff",
        marginBottom: 8,
        marginTop: 10
    },
    input: {
        backgroundColor: "#1e293b",
        borderRadius: 10,
        padding: 10,
        color: "#fff",
        marginBottom: 10
    },
    button: {
        backgroundColor: "#22c55e",
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 10
    },
    buttonText: {
        color: "#fff"
    },
    reviewCard: {
        backgroundColor: "#1e293b",
        padding: 10,
        borderRadius: 10,
        marginBottom: 8
    },
    reviewRating: {
        color: "#22c55e",
        marginBottom: 4
    },
    reviewText: {
        color: "#e2e8f0"
    },
    date: {
        color: "#64748b",
        marginTop: 6,
        fontSize: 12
    }
});

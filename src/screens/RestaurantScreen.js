import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth, db } from "../services/firebase";

export default function RestaurantScreen({ route, navigation }) {
  const { place } = route.params;

  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");

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

      Alert.alert("Reseña guardada");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error al guardar");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{place.name}</Text>
      <Text style={styles.address}>{place.vicinity}</Text>

      <Text style={styles.label}>Tu puntuación (1-5)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={rating}
        onChangeText={setRating}
        placeholder="Ej: 4"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Comentario</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder="¿Qué te pareció?"
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.button} onPress={saveReview}>
        <Text style={styles.buttonText}>Guardar reseña</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20
  },
  name: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 4
  },
  address: {
    color: "#94a3b8",
    marginBottom: 20
  },
  label: {
    color: "#fff",
    marginBottom: 6
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155"
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16
  }
});
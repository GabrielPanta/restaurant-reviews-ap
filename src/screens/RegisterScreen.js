import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth, db } from "../services/firebase";

export default function RegisterScreen({ navigation }) {
const [nombre, setNombre] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");

const handleRegister = async () => {
setError("");
if (!nombre || !email || !password) {
  setError("Completa todos los campos");
  return;
}

if (password.length < 6) {
  setError("La contraseña debe tener al menos 6 caracteres");
  return;
}

try {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  await setDoc(doc(db, "usuarios", user.uid), {
    uid: user.uid,
    nombre,
    email,
    fechaRegistro: new Date()
  });

} catch (e) {
  setError("No se pudo registrar");
}
};

return (
<KeyboardAvoidingView
style={styles.container}
behavior={Platform.OS === "ios" ? "padding" : undefined}
>
<View style={styles.card}>
<Text style={styles.title}>Crear cuenta</Text>
<Text style={styles.subtitle}>
Guarda tus experiencias en restaurantes
</Text>
    <TextInput
      style={styles.input}
      placeholder="Nombre"
      placeholderTextColor="#999"
      value={nombre}
      onChangeText={setNombre}
    />

    <TextInput
      style={styles.input}
      placeholder="Correo electrónico"
      placeholderTextColor="#999"
      value={email}
      onChangeText={setEmail}
      autoCapitalize="none"
    />

    <TextInput
      style={styles.input}
      placeholder="Contraseña"
      placeholderTextColor="#999"
      secureTextEntry
      value={password}
      onChangeText={setPassword}
    />

    {error ? <Text style={styles.error}>{error}</Text> : null}

    <TouchableOpacity style={styles.button} onPress={handleRegister}>
      <Text style={styles.buttonText}>Registrarse</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => navigation.navigate("Login")}
      style={styles.linkContainer}
    >
      <Text style={styles.link}>
        ¿Ya tienes cuenta? Iniciar sesión
      </Text>
    </TouchableOpacity>
  </View>
</KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: "#0f172a",
justifyContent: "center",
padding: 24
},
card: {
backgroundColor: "#1e293b",
borderRadius: 20,
padding: 24,
shadowColor: "#000",
shadowOpacity: 0.3,
shadowRadius: 10,
elevation: 5
},
title: {
fontSize: 26,
color: "#fff",
marginBottom: 6
},
subtitle: {
color: "#94a3b8",
marginBottom: 24
},
input: {
backgroundColor: "#0f172a",
borderRadius: 12,
padding: 14,
marginBottom: 12,
color: "#fff",
borderWidth: 1,
borderColor: "#334155"
},
button: {
backgroundColor: "#22c55e",
padding: 16,
borderRadius: 12,
alignItems: "center",
marginTop: 8
},
buttonText: {
color: "#fff",
fontSize: 16
},
linkContainer: {
marginTop: 18,
alignItems: "center"
},
link: {
color: "#38bdf8"
},
error: {
color: "#f87171",
marginBottom: 8
}
});
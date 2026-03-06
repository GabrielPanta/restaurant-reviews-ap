import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import { auth } from "../services/firebase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "64942446243-h1afr6rkvbn7ljvhij38piupcnvo6kjg.apps.googleusercontent.com",
    iosClientId: "64942446243-7q8mrqgrfaupacigbm0hru8hn97thb7q.apps.googleusercontent.com",
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true })
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch(e => {
          console.error(e);
          setError("Error en Firebase");
        });
    }
  }, [response]);

  const handleLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Correo o contraseña incorrectos");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    promptAsync();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>

        <Image
          source={require("../../assets/gusto_modern_logo.png")}
          style={styles.logo}
          resizeMode="cover"
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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.linkContainer}
        >
          <Text style={styles.link}>
            ¿No tienes cuenta? Crear cuenta
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    borderRadius: 60,
    overflow: "hidden"
  },
  title: {
    fontSize: 26,
    color: "#fff",
    marginBottom: 4
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 24,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#334155",
    width: "100%"
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    width: "100%"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16
  },
  googleButton: {
    backgroundColor: "#fff",
    marginTop: 12
  },
  googleButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "bold"
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
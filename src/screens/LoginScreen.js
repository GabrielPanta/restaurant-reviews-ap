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
  Image,
  StatusBar,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../services/firebase";

const { width } = Dimensions.get("window");

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
      <StatusBar barStyle="light-content" />

      <View style={styles.headerContainer}>
        <View style={styles.logoBadge}>
          <Image
            source={require("../../assets/gusto_modern_logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
        <Text style={styles.welcomeSubtitle}>Descubre los mejores sabores a tu alrededor</Text>
      </View>

      <View style={styles.glassCard}>
        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o también</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          activeOpacity={0.7}
        >
          <View style={styles.googleIconWrapper}>
            <Ionicons name="logo-google" size={20} color="#0f172a" />
          </View>
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.footerLink}
          activeOpacity={0.6}
        >
          <Text style={styles.footerText}>
            ¿Nuevo por aquí? <Text style={styles.highlightText}>Crea una cuenta</Text>
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
    paddingHorizontal: 28,
    justifyContent: "center"
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e293b",
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 50
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20
  },
  glassCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    paddingHorizontal: 16
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    fontWeight: "500"
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.2)"
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    marginLeft: 8,
    fontWeight: "600"
  },
  loginButton: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 24
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  dividerText: {
    color: "#64748b",
    fontSize: 13,
    marginHorizontal: 15,
    fontWeight: "600"
  },
  googleButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24
  },
  googleIconWrapper: {
    marginRight: 12,
    backgroundColor: "#f1f5f9",
    padding: 6,
    borderRadius: 10
  },
  googleButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700"
  },
  footerLink: {
    alignItems: "center"
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500"
  },
  highlightText: {
    color: "#38bdf8",
    fontWeight: "700"
  }
});
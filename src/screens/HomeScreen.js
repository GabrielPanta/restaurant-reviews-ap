import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { auth, db } from "../services/firebase";

export default function HomeScreen() {
    const [nombre, setNombre] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            const snap = await getDoc(doc(db, "usuarios", uid));
            if (snap.exists()) {
                setNombre(snap.data().nombre);
            }
        };

        fetchUser();
    }, []);

    const logout = () => {
        signOut(auth);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Hola</Text>
                <Text style={styles.name}>{nombre}</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.title}>Explorar restaurantes</Text>
                <Text style={styles.desc}>
                    Encuentra restaurantes cercanos y revisa su historial
                </Text>

                <TouchableOpacity style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Abrir mapa</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.title}>Mis reseñas</Text>
                <Text style={styles.desc}>
                    Revisa tus calificaciones y decide si volver
                </Text>

                <TouchableOpacity style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Ver mis reseñas</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logout} onPress={logout}>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a",
        padding: 20
    },
    header: {
        marginBottom: 20
    },
    greeting: {
        color: "#94a3b8",
        fontSize: 16
    },
    name: {
        color: "#fff",
        fontSize: 28
    },
    card: {
        backgroundColor: "#1e293b",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16
    },
    title: {
        color: "#fff",
        fontSize: 18,
        marginBottom: 6
    },
    desc: {
        color: "#94a3b8",
        marginBottom: 14
    },
    primaryButton: {
        backgroundColor: "#22c55e",
        padding: 14,
        borderRadius: 12,
        alignItems: "center"
    },
    primaryText: {
        color: "#fff",
        fontSize: 15
    },
    secondaryButton: {
        backgroundColor: "#334155",
        padding: 14,
        borderRadius: 12,
        alignItems: "center"
    },
    secondaryText: {
        color: "#fff",
        fontSize: 15
    },
    logout: {
        marginTop: "auto",
        alignItems: "center",
        padding: 16
    },
    logoutText: {
        color: "#f87171"
    }
});
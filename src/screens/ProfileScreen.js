import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Image,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../services/firebase";
import { signOut, updateProfile } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";

const AVATARS = [
    { id: 'chef', emoji: '👨‍🍳', label: 'Maestro Chef' },
    { id: 'sushi', emoji: '🍣', label: 'Sushi Lover' },
    { id: 'burger', emoji: '🍔', label: 'Burger King' },
    { id: 'wine', emoji: '🍷', label: 'Sommelier' },
    { id: 'pizza', emoji: '🍕', label: 'Pizzaiolo' },
    { id: 'taco', emoji: '🌮', label: 'Taco Master' },
];

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(auth.currentUser);
    const [favorites, setFavorites] = useState([]);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [memberSince, setMemberSince] = useState("");

    // Edición de Perfil
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || "");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState("👨‍🍳");

    const getCriticLevel = (count) => {
        if (count >= 10) return { title: "Crítico Experto 🏆", color: "#f59e0b" };
        if (count >= 5) return { title: "Crítico Frecuente 🥈", color: "#94a3b8" };
        if (count >= 1) return { title: "Crítico Novato 🥉", color: "#d59563" };
        return { title: "Nuevo Comensal 🌱", color: "#64748b" };
    };

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
        }, [])
    );

    const loadProfileData = async () => {
        try {
            if (!user) return;

            // Cargar Favoritos
            const favQuery = query(
                collection(db, "users", user.uid, "favorites"),
                orderBy("addedAt", "desc")
            );
            const favSnap = await getDocs(favQuery);
            setFavorites(favSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Cargar Conteo de Reseñas
            const revQuery = query(
                collection(db, "reviews"),
                where("userId", "==", user.uid)
            );
            const revSnap = await getDocs(revQuery);
            setReviewsCount(revSnap.size);

            // Fecha de registro
            if (user.metadata.creationTime) {
                const date = new Date(user.metadata.creationTime);
                const month = date.toLocaleString('es-ES', { month: 'long' });
                const year = date.getFullYear();
                setMemberSince(`${month[0].toUpperCase() + month.slice(1)} ${year}`);
            }

        } catch (e) {
            console.log("Error loading profile:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadProfileData();
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            // Actualizar Auth
            await updateProfile(auth.currentUser, {
                displayName: newName
                // Aquí podrías guardar el avatar en photoURL si quisieras
            });

            // Actualizar Firestore
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                nombre: newName,
                avatar: selectedAvatar // Guardamos el avatar elegido
            });

            setUser({ ...auth.currentUser, displayName: newName });
            setIsEditing(false);
            Alert.alert("Éxito", "Perfil actualizado correctamente");
        } catch (e) {
            console.log("Error saving profile:", e);
            Alert.alert("Error", "No se pudo actualizar el perfil");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.log("Logout error:", e);
        }
    };

    const renderFavoriteItem = ({ item }) => (
        <TouchableOpacity
            style={styles.favCard}
            onPress={() => navigation.navigate("Restaurant", { place: { place_id: item.placeId, name: item.name, vicinity: item.vicinity, rating: item.rating } })}
        >
            <View style={styles.favIconBox}>
                <Ionicons name="restaurant" size={20} color="#22c55e" />
            </View>
            <View style={styles.favInfo}>
                <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.favAddress} numberOfLines={1}>{item.vicinity}</Text>
            </View>
            <View style={styles.favRating}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.favRatingText}>{item.rating || "N/A"}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={favorites}
                keyExtractor={item => item.id}
                renderItem={renderFavoriteItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
                }
                ListHeaderComponent={
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity
                                style={styles.avatar}
                                onPress={() => isEditing && setShowAvatarPicker(true)}
                                activeOpacity={isEditing ? 0.7 : 1}
                            >
                                <Text style={styles.avatarText}>
                                    {isEditing ? selectedAvatar : (user?.displayName ? user.displayName[0].toUpperCase() : "?")}
                                </Text>
                                {isEditing && (
                                    <View style={styles.editBadge}>
                                        <Ionicons name="camera" size={12} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.onlineBadge} />
                        </View>

                        {isEditing ? (
                            <View style={styles.editForm}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Tu nombre"
                                    placeholderTextColor="#64748b"
                                />
                                <View style={styles.editActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                                        <Text style={styles.cancelText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                        <Text style={styles.saveText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.nameRow}>
                                    <Text style={styles.userName}>{user?.displayName || "Usuario Gourmet"}</Text>
                                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                                        <Ionicons name="create-outline" size={18} color="#22c55e" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.memberBadge}>
                                    <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                                    <Text style={styles.memberText}>Miembro desde {memberSince}</Text>
                                </View>
                                <Text style={styles.userEmail}>{user?.email}</Text>
                            </>
                        )}

                        <View style={styles.levelBadge}>
                            <Text style={[styles.levelText, { color: getCriticLevel(reviewsCount).color }]}>
                                {getCriticLevel(reviewsCount).title}
                            </Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{reviewsCount}</Text>
                                <Text style={styles.statLabel}>Reseñas</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{favorites.length}</Text>
                                <Text style={styles.statLabel}>Favoritos</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Mis Lugares Favoritos ❤️</Text>
                        {favorites.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="heart-outline" size={40} color="#334155" />
                                <Text style={styles.emptyText}>Aún no has guardado favoritos. ¡Dale amor a tus restaurantes preferidos!</Text>
                            </View>
                        )}
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            <Modal
                visible={showAvatarPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAvatarPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Elige tu personalidad 🎭</Text>
                        <View style={styles.avatarGrid}>
                            {AVATARS.map((av) => (
                                <TouchableOpacity
                                    key={av.id}
                                    style={[styles.avatarOption, selectedAvatar === av.emoji && styles.selectedOption]}
                                    onPress={() => {
                                        setSelectedAvatar(av.emoji);
                                        setShowAvatarPicker(false);
                                    }}
                                >
                                    <Text style={styles.optionEmoji}>{av.emoji}</Text>
                                    <Text style={styles.optionLabel}>{av.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.closeModal} onPress={() => setShowAvatarPicker(false)}>
                            <Text style={styles.closeModalText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a"
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16
    },
    headerTitle: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 0.5
    },
    logoutButton: {
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        padding: 10,
        borderRadius: 14
    },
    listContent: {
        paddingBottom: 40
    },
    profileInfo: {
        alignItems: "center",
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 10
    },
    avatarContainer: {
        marginBottom: 16
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#1e293b",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#22c55e"
    },
    avatarText: {
        color: "#22c55e",
        fontSize: 40,
        fontWeight: "800"
    },
    onlineBadge: {
        position: "absolute",
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#22c55e",
        borderWidth: 3,
        borderColor: "#0f172a"
    },
    userName: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 4
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    memberText: {
        color: "#94a3b8",
        fontSize: 12,
        marginLeft: 4,
        fontWeight: "500"
    },
    userEmail: {
        color: "#64748b",
        fontSize: 14,
        marginBottom: 16
    },
    levelBadge: {
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
    },
    levelText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5
    },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 10,
        width: "100%",
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: 32,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
    },
    statBox: {
        alignItems: "center",
        flex: 1
    },
    statValue: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 4
    },
    statLabel: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase"
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: "rgba(255,255,255,0.1)"
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 18,
        fontWeight: "700",
        alignSelf: "flex-start",
        marginBottom: 20
    },
    favCard: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        marginHorizontal: 24,
        marginBottom: 12,
        padding: 16,
        borderRadius: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
    },
    favIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16
    },
    favInfo: {
        flex: 1
    },
    favName: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4
    },
    favAddress: {
        color: "#64748b",
        fontSize: 12
    },
    favRating: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10
    },
    favRatingText: {
        color: "#f59e0b",
        fontWeight: "bold",
        fontSize: 12,
        marginLeft: 4
    },
    emptyContainer: {
        width: "100%",
        alignItems: "center",
        padding: 30,
        backgroundColor: "#1e293b",
        borderRadius: 24,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#334155"
    },
    emptyText: {
        color: "#64748b",
        textAlign: "center",
        marginTop: 12,
        fontSize: 14,
        lineHeight: 22
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    editBadge: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#22c55e',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0f172a'
    },
    editForm: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20
    },
    nameInput: {
        backgroundColor: '#1e293b',
        width: '100%',
        color: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12
    },
    editActions: {
        flexDirection: 'row',
        gap: 12
    },
    cancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    cancelText: {
        color: '#94a3b8',
        fontWeight: '600'
    },
    saveBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#22c55e'
    },
    saveText: {
        color: '#fff',
        fontWeight: 'bold'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#1e293b',
        width: '100%',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center'
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 24
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24
    },
    avatarOption: {
        width: '45%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent'
    },
    selectedOption: {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)'
    },
    optionEmoji: {
        fontSize: 32,
        marginBottom: 8
    },
    optionLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600'
    },
    closeModal: {
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 16,
        backgroundColor: '#334155'
    },
    closeModalText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});

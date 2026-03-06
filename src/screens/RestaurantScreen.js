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
    View,
    StatusBar,
    ImageBackground,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../services/firebase";

export default function RestaurantScreen({ route, navigation }) {
    const { place } = route.params;

    const [rating, setRating] = useState(0);
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
        if (rating === 0) {
            Alert.alert("Aviso", "Por favor ingresa una puntuación tocando las estrellas.");
            return;
        }

        try {
            await addDoc(collection(db, "reviews"), {
                placeId: place.place_id,
                name: place.name,
                address: place.vicinity,
                rating,
                comment,
                userId: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });

            setRating(0);
            setComment("");
            loadReviews();

        } catch (e) {
            Alert.alert("Error al guardar");
        }
    };

    const renderStars = (currentRating) => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= currentRating ? "star" : "star-outline"}
                        size={14}
                        color={star <= currentRating ? "#f59e0b" : "#475569"}
                    />
                ))}
            </View>
        );
    };

    const renderInteractiveStars = () => {
        return (
            <View style={styles.interactiveStarsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                        <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={40}
                            color={star <= rating ? "#f59e0b" : "#334155"}
                            style={{ marginHorizontal: 4 }}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.reviewCard}>
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.reviewName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={10} color="#94a3b8" style={{ marginRight: 4 }} />
                        <Text style={styles.reviewDate}>{item.date}</Text>
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
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <FlatList
                data={reviews}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListHeaderComponent={
                    <>
                        <View style={styles.headerHero}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.heroContent}>
                                <Text style={styles.name}>{place.name}</Text>
                                <View style={styles.addressRow}>
                                    <Ionicons name="location-outline" size={16} color="#94a3b8" />
                                    <Text style={styles.address}>{place.vicinity}</Text>
                                </View>

                                <View style={styles.statsContainer}>
                                    <View style={styles.statBadge}>
                                        <Ionicons name="star" size={18} color="#fff" />
                                        <Text style={styles.avgText}>{avg}</Text>
                                    </View>
                                    <View style={styles.reviewsBadge}>
                                        <Ionicons name="people-outline" size={16} color="#94a3b8" />
                                        <Text style={styles.countText}>{reviews.length} reseñas locales</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.formContainer}>
                            <Text style={styles.sectionTitle}>¿Qué te pareció?</Text>

                            {renderInteractiveStars()}

                            <View style={styles.inputWrapper}>
                                <Ionicons name="create-outline" size={20} color="#64748b" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    multiline
                                    value={comment}
                                    onChangeText={setComment}
                                    placeholder="Escribe tu opinión sobre la comida o el servicio..."
                                    placeholderTextColor="#64748b"
                                    textAlignVertical="top"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, rating === 0 ? styles.buttonDisabled : null]}
                                onPress={saveReview}
                                activeOpacity={0.8}
                                disabled={rating === 0}
                            >
                                <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Publicar Reseña</Text>
                            </TouchableOpacity>
                        </View>

                        {reviews.length > 0 && (
                            <View style={styles.reviewsHeaderSection}>
                                <Text style={styles.sectionTitle}>Opiniones Recientes</Text>
                            </View>
                        )}
                        {reviews.length === 0 && (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="restaurant-outline" size={40} color="#334155" />
                                <Text style={styles.emptyText}>Sé el primero en dejar una reseña para este restaurante.</Text>
                            </View>
                        )}
                    </>
                }
                renderItem={renderItem}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a",
    },
    headerHero: {
        backgroundColor: "#1e293b",
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
        marginBottom: 20
    },
    backButton: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 8,
        borderRadius: 20
    },
    heroContent: {
        marginTop: 40
    },
    name: {
        color: "#ffffff",
        fontSize: 28,
        fontWeight: "800",
        marginBottom: 8,
        letterSpacing: 0.5
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    address: {
        color: "#94a3b8",
        fontSize: 14,
        marginLeft: 6,
        fontWeight: "500",
        flex: 1
    },
    statsContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#22c55e",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        marginRight: 12
    },
    avgText: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 16,
        marginLeft: 4
    },
    reviewsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#334155",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14
    },
    countText: {
        color: "#cbd5e1",
        fontSize: 13,
        fontWeight: "600",
        marginLeft: 6
    },
    formContainer: {
        paddingHorizontal: 24,
        marginBottom: 24
    },
    sectionTitle: {
        color: "#f8fafc",
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 16,
        letterSpacing: 0.3
    },
    interactiveStarsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1e293b",
        paddingVertical: 20,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
    },
    inputWrapper: {
        flexDirection: 'row',
        backgroundColor: "#1e293b",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        minHeight: 100
    },
    inputIcon: {
        marginTop: 4,
        marginRight: 10
    },
    input: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
        lineHeight: 22
    },
    button: {
        flexDirection: 'row',
        backgroundColor: "#22c55e",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6
    },
    buttonDisabled: {
        backgroundColor: "#334155",
        shadowOpacity: 0
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5
    },
    reviewsHeaderSection: {
        paddingHorizontal: 24,
        marginTop: 10
    },
    reviewCard: {
        backgroundColor: "#1e293b",
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 24,
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
        marginBottom: 10
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reviewName: {
        color: "#f8fafc",
        fontSize: 16,
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
    reviewDate: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "600"
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 2
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
    reviewComment: {
        color: "#cbd5e1",
        fontSize: 14,
        flex: 1,
        lineHeight: 20
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        marginHorizontal: 24,
        marginTop: 10,
        backgroundColor: '#1e293b',
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#334155'
    },
    emptyText: {
        color: "#64748b",
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22
    }
});

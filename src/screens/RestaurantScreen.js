import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
    updateDoc,
    increment,
    orderBy
} from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
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
    Platform,
    ActivityIndicator,
    Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, storage } from "../services/firebase";
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Image, ScrollView } from "react-native";

const GOOGLE_API_KEY = "AIzaSyDjgLXJBed2-NrpEcmWXKX_uhmmT8pdASQ";

export default function RestaurantScreen({ route, navigation }) {
    const { place } = route.params;

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [reviews, setReviews] = useState([]);
    const [avg, setAvg] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const heartScale = useRef(new Animated.Value(1)).current;

    // Estados para Fotos
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);

    useEffect(() => {
        loadReviews();
        checkIfFavorite();
    }, []);

    const checkIfFavorite = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const favRef = doc(db, "users", user.uid, "favorites", place.place_id);
            const favSnap = await getDoc(favRef);

            if (favSnap.exists()) {
                setIsFavorite(true);
            }
        } catch (e) {
            console.log("Error checking favorite:", e);
        }
    };

    const toggleFavorite = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const favRef = doc(db, "users", user.uid, "favorites", place.place_id);

            // Animación
            Animated.sequence([
                Animated.timing(heartScale, { toValue: 1.5, duration: 150, useNativeDriver: true }),
                Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true })
            ]).start();

            if (isFavorite) {
                await deleteDoc(favRef);
                setIsFavorite(false);
            } else {
                await setDoc(favRef, {
                    name: place.name,
                    vicinity: place.vicinity,
                    rating: place.rating || 0,
                    placeId: place.place_id,
                    addedAt: serverTimestamp()
                });
                setIsFavorite(true);
            }
        } catch (e) {
            console.log("Error toggling favorite:", e);
        }
    };

    const loadReviews = async () => {
        try {
            const q = query(
                collection(db, "reviews"),
                where("placeId", "==", place.place_id),
                orderBy("createdAt", "desc")
            );

            const revSnap = await getDocs(q);
            const revList = [];
            let rTotal = 0;

            for (const docSnapshot of revSnap.docs) {
                const data = docSnapshot.data();
                const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : "Reciente";

                const likeRef = doc(db, "reviews", docSnapshot.id, "likes", auth.currentUser.uid);
                const likeSnap = await getDoc(likeRef);

                revList.push({
                    id: docSnapshot.id,
                    ...data,
                    date,
                    isLiked: likeSnap.exists()
                });
                rTotal += data.rating;
            }

            setReviews(revList);
            if (revList.length > 0) {
                setAvg((rTotal / revList.length).toFixed(1));
            } else {
                setAvg(0);
            }
        } catch (error) {
            console.log("Error loading reviews:", error);
        }
    };

    const getPlacePhoto = (photoRef) => {
        if (!photoRef) return null;
        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`;
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const storageRef = ref(storage, `reviews/${auth.currentUser.uid}/${Date.now()}_${filename}`);

        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    const toggleLike = async (reviewId, currentLikes = 0) => {
        try {
            const user = auth.currentUser;
            const likeRef = doc(db, "reviews", reviewId, "likes", user.uid);
            const reviewRef = doc(db, "reviews", reviewId);

            const likeDoc = await getDoc(likeRef);

            if (likeDoc.exists()) {
                await deleteDoc(likeRef);
                await updateDoc(reviewRef, {
                    likesCount: increment(-1)
                });
            } else {
                await setDoc(likeRef, { createdAt: serverTimestamp() });
                await updateDoc(reviewRef, {
                    likesCount: increment(1)
                });
            }
            loadReviews();
        } catch (e) {
            console.log("Error toggleLike:", e);
        }
    };

    const handleDeleteReview = async (reviewId, imageUrl) => {
        Alert.alert(
            "Eliminar Reseña",
            "¿Borrar esta opinión permanentemente?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Borrar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "reviews", reviewId));
                            if (imageUrl) {
                                try {
                                    const imgRef = ref(storage, imageUrl);
                                    await deleteObject(imgRef);
                                } catch (err) { console.log("Storage delete err:", err); }
                            }
                            loadReviews();
                        } catch (e) { console.log("Delete err:", e); }
                    }
                }
            ]
        );
    };

    const startEditReview = (item) => {
        setEditingReviewId(item.id);
        setRating(item.rating);
        setComment(item.comment);
        setImage(item.imageUrl);
    };

    const saveReview = async () => {
        if (rating === 0) {
            Alert.alert("Aviso", "Por favor ingresa una puntuación tocando las estrellas.");
            return;
        }

        try {
            setUploading(true);
            const user = auth.currentUser;
            const nameToDisplay = user.displayName || user.email.split("@")[0];
            const initial = nameToDisplay[0].toUpperCase();

            let imageUrl = image;
            if (image && !image.startsWith('http')) {
                imageUrl = await uploadImage(image);
            }

            if (editingReviewId) {
                await updateDoc(doc(db, "reviews", editingReviewId), {
                    rating,
                    comment,
                    imageUrl,
                    updatedAt: serverTimestamp()
                });
                setEditingReviewId(null);
            } else {
                await addDoc(collection(db, "reviews"), {
                    placeId: place.place_id,
                    name: place.name,
                    address: place.vicinity,
                    rating,
                    comment,
                    userId: user.uid,
                    userName: nameToDisplay,
                    userInitial: initial,
                    imageUrl,
                    createdAt: serverTimestamp(),
                    likesCount: 0
                });
            }

            setRating(0);
            setComment("");
            setImage(null);
            loadReviews();

        } catch (e) {
            console.log("Error saveReview:", e);
            Alert.alert("Error al guardar");
        } finally {
            setUploading(false);
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
                <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>{item.userInitial || (item.userName ? item.userName[0] : "?")}</Text>
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.reviewName} numberOfLines={1}>
                            {item.userName || "Comensal Anónimo"}
                        </Text>
                        <View style={styles.dateBadge}>
                            <Ionicons name="calendar-outline" size={10} color="#94a3b8" style={{ marginRight: 4 }} />
                            <Text style={styles.reviewDate}>{item.date}</Text>
                        </View>
                    </View>
                </View>
                {item.userId === auth.currentUser?.uid && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => startEditReview(item)} style={styles.miniActionBtn}>
                            <Ionicons name="pencil" size={14} color="#22c55e" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteReview(item.id, item.imageUrl)} style={styles.miniActionBtn}>
                            <Ionicons name="trash" size={14} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {renderStars(item.rating)}

            {item.comment ? (
                <View style={styles.commentContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748b" style={styles.commentIcon} />
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                </View>
            ) : null}

            {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.reviewImage} resizeMode="cover" />
            )}

            <View style={styles.reviewFooter}>
                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => toggleLike(item.id, item.likesCount)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={item.isLiked ? "flame" : "flame-outline"}
                        size={16}
                        color={item.isLiked ? "#f97316" : "#64748b"}
                    />
                    <Text style={[styles.likeText, item.isLiked && { color: "#f97316" }]}>
                        {item.likesCount || 0}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const headerImage = place.photos && place.photos.length > 0
        ? { uri: getPlacePhoto(place.photos[0].photo_reference) }
        : require("../../assets/gusto_modern_logo.png"); // Fallback if no photo
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
                        <ImageBackground
                            source={headerImage}
                            style={styles.headerHero}
                            resizeMode="cover"
                        >
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.heartButton}
                                onPress={toggleFavorite}
                                activeOpacity={0.7}
                            >
                                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                                    <Ionicons
                                        name={isFavorite ? "heart" : "heart-outline"}
                                        size={24}
                                        color={isFavorite ? "#ef4444" : "#fff"}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                        </ImageBackground>

                        <View style={styles.detailsContainer}>
                            <View style={styles.titleRow}>
                                <Text style={styles.restaurantName}>{place.name}</Text>
                            </View>

                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={16} color="#94a3b8" />
                                <Text style={styles.restaurantAddress}>{place.vicinity}</Text>
                            </View>

                            {place.photos && place.photos.length > 1 && (
                                <View style={styles.galleryContainer}>
                                    <Text style={styles.galleryTitle}>Galería 📸</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                        {place.photos.slice(1, 6).map((ph, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri: getPlacePhoto(ph.photo_reference) }}
                                                style={styles.galleryImage}
                                            />
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.statsRow}>
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

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.7}>
                                    <Ionicons name="camera-outline" size={24} color="#64748b" />
                                    <Text style={styles.photoText}>{image ? "Foto lista!" : "Añadir foto"}</Text>
                                </TouchableOpacity>

                                {image && (
                                    <View style={styles.previewContainer}>
                                        <Image source={{ uri: image }} style={styles.imagePreview} />
                                        <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
                                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.button, (rating === 0 || uploading) ? styles.buttonDisabled : null]}
                                onPress={saveReview}
                                activeOpacity={0.8}
                                disabled={rating === 0 || uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name={editingReviewId ? "checkmark-circle" : "send"} size={16} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.buttonText}>
                                            {editingReviewId ? "Actualizar Reseña" : "Publicar Reseña"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {editingReviewId && (
                                <TouchableOpacity
                                    style={styles.cancelEditBtn}
                                    onPress={() => {
                                        setEditingReviewId(null);
                                        setRating(0);
                                        setComment("");
                                        setImage(null);
                                    }}
                                >
                                    <Text style={styles.cancelEditText}>Cancelar Edición</Text>
                                </TouchableOpacity>
                            )}
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
        height: 250,
        width: '100%',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 20
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
    heartButton: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 8,
        borderRadius: 20
    },
    detailsContainer: {
        backgroundColor: "#0f172a",
        paddingHorizontal: 24,
        paddingTop: 20,
        marginTop: -20, // Overlap with headerHero
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
        marginBottom: 20
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    restaurantName: {
        color: "#ffffff",
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: 0.5,
        flexShrink: 1
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    restaurantAddress: {
        color: "#94a3b8",
        fontSize: 14,
        marginLeft: 6,
        fontWeight: "500",
        flex: 1
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20
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
    galleryContainer: {
        marginTop: 20,
        marginBottom: 10
    },
    galleryTitle: {
        color: "#f8fafc",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12
    },
    galleryScroll: {
        paddingRight: 20
    },
    galleryImage: {
        width: 120,
        height: 120,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
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
    actionButtons: {
        flexDirection: 'row',
        gap: 8
    },
    miniActionBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 8,
        borderRadius: 10
    },
    cancelEditBtn: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 8
    },
    cancelEditText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600'
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
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    reviewerInitial: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
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
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    photoPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    photoText: {
        color: "#64748b",
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 8
    },
    previewContainer: {
        position: 'relative'
    },
    imagePreview: {
        width: 50,
        height: 50,
        borderRadius: 8
    },
    removeImage: {
        position: 'absolute',
        top: -10,
        right: -10
    },
    reviewImage: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    reviewFooter: {
        flexDirection: 'row',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    likeText: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "700",
        marginLeft: 6
    }
});

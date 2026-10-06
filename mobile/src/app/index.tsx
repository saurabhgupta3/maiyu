import { useState } from "react";
import { View, Text, StyleSheet, Button, Alert} from "react-native";

export default function HomeScreen() {
    const [message, setMessage] = useState("");
    const handlePress = async () => {
        Alert.alert("Button works");

        try {
            const response = await fetch("https://api.maiyu.online/api/msg");

            const data = await response.json();

            setMessage(data.message);
        } catch (error) {
            console.error("Error:", error);
            setMessage("Something went wrong.");
        }
    };
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Maiyu</Text>
            <Text style={styles.subtitle}>Your interactive AI talker</Text>
            <Button title="Start talking" onPress={handlePress} />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 40,
        fontWeight: "bold",
    },
    subtitle: {
        marginTop: 10,
        fontSize: 18,
    },
    message: {
        marginTop: 20,
        fontSize: 18,
    },
});

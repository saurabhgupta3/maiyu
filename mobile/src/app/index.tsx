import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import * as Speech from "expo-speech";

const PERSON_IMAGE = require("../../assets/images/person.png");
const PERSON_BLINK_IMAGE = require("../../assets/images/person_blink.png");
const PERSON_HI_IMAGE = require("../../assets/images/person_hi.png");

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [image, setImage] = useState<"normal" | "blink" | "hi">("normal");

  const handleClick = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/msg`,
      );

      const data = await response.json();

      setMessage(data.message);
    } catch (error) {
      setMessage("Something went wrong.");
    }
  };

  const handleActiveClick = () => {
    if (active) {
      return;
    }

    setActive(true);
    Speech.stop();

    // Normal → Blink
    setImage("blink");

    setTimeout(() => {
      // Blink → Hi
      setImage("hi");

      Speech.speak("Hi", {
        language: "en-US",
        rate: 0.85,
        pitch: 0.9,
        volume: 1,
      });

      setTimeout(() => {
        // Hi → Normal
        setImage("normal");
        setActive(false);
      }, 700);
    }, 220);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maiyu — AI Talker</Text>

      <Text style={styles.subtitle}>
        Talk naturally with Maiyu, an interactive AI talker.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleClick}
      >
        <Text style={styles.buttonText}>How to use</Text>
      </Pressable>

      <View style={styles.imageContainer}>
        <Image
          source={PERSON_IMAGE}
          style={[
            styles.person,
            image !== "normal" && styles.hidden,
          ]}
        />

        <Image
          source={PERSON_BLINK_IMAGE}
          style={[
            styles.person,
            image !== "blink" && styles.hidden,
          ]}
        />

        <Image
          source={PERSON_HI_IMAGE}
          style={[
            styles.person,
            image !== "hi" && styles.hidden,
          ]}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          active && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleActiveClick}
        disabled={active}
      >
        <Text style={styles.buttonText}>
          {active ? "Active..." : "Active"}
        </Text>
      </Pressable>

      {message !== "" && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
  },

  subtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 380,
    marginBottom: 25,
  },

  button: {
    backgroundColor: "#22c55e",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginBottom: 30,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#a855f7",
    fontSize: 17,
    fontWeight: "bold",
  },

  imageContainer: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    marginBottom: 30,
    position: "relative",
  },

  person: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  hidden: {
    opacity: 0,
  },

  message: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 27,
    maxWidth: 380,
    marginTop: 5,
  },
});
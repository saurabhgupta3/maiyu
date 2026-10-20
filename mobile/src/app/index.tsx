
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
const MAIYU_LOGO = require("../../assets/images/splash-icon.png");

export default function HomeScreen() {
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [image, setImage] = useState<"normal" | "blink" | "hi">("normal");

  // Opening animation
  const [showIntro, setShowIntro] = useState(true);

  const introOpacity = useRef(new Animated.Value(0)).current;
  const introScale = useRef(new Animated.Value(0.85)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const logoAnimation = Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(introScale, {
        toValue: 1,
        speed: 12,
        bounciness: 3,
        useNativeDriver: true,
      }),
    ]);

    const progressAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    logoAnimation.start();
    progressAnimation.start();

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 1900);

    return () => {
      clearTimeout(timer);
      logoAnimation.stop();
      progressAnimation.stop();
    };
  }, [introOpacity, introScale, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleClick = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/msg`,
      );

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      setMessage(data.message);
    } catch {
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

  // Branded opening screen
  if (showIntro) {
    return (
      <View style={styles.introContainer}>
        <Animated.Image
          source={MAIYU_LOGO}
          resizeMode="contain"
          style={[
            styles.introLogo,
            {
              opacity: introOpacity,
              transform: [{ scale: introScale }],
            },
          ]}
        />

        <Text style={styles.startingText}>
          Starting Maiyu
          <Text style={styles.ellipsis}>...</Text>
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          />
        </View>

        <Text style={styles.loadingHint}>
          Getting things ready
        </Text>
      </View>
    );
  }

  // Existing Maiyu home screen
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
  introContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#000000",
  paddingHorizontal: 24,
},

  introLogo: {
    width: 155,
    height: 155,
    marginBottom: 28,
  },

  startingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0369A1",
    marginBottom: 18,
    letterSpacing: 0.3,
  },

  ellipsis: {
    color: "#0284C7",
  },

  progressTrack: {
    width: 220,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DCEFFB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#0284C7",
    borderRadius: 999,
  },

  loadingHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#22C55E",
    borderWidth: 1,
    borderColor: "#22C55E",
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
    color: "#A855F7",
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

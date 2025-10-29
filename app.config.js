import 'dotenv/config';

export default {
  expo: {
    name: "ADMIN",
    slug: "ADMIN",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    },
    web: {
      favicon: "./assets/logo.png"
    },
    plugins: [
      "@react-native-firebase/app",
      "expo-router",
      "expo-camera",
      "expo-barcode-scanner"
    ],
    extra: {
      eas: {
        projectId: "c0981eda-5795-4ed9-9cc7-fbb46fdd4369"
      },
      API_BASE_URL: process.env.API_BASE_URL,
      CONFIG_INTERNAL_API_KEY: process.env.CONFIG_INTERNAL_API_KEY
    },
    owner: "user12312312312"
  }
};

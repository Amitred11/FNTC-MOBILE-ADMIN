import 'dotenv/config';

export default {
  expo: {
    name: "ADMIN",
    slug: "ADMIN",
    scheme: "fibearadmin",
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
      package: "com.hellopo123.fibearadmin",
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
      "expo-router",
      "expo-camera",
      "expo-barcode-scanner"
    ],
    extra: {
      eas: {
        projectId: "da6490a8-da67-4e76-82db-499af557fe3a"
      },
      API_BASE_URL: process.env.API_BASE_URL,
      CONFIG_INTERNAL_API_KEY: process.env.CONFIG_INTERNAL_API_KEY
    },
    owner: "hellopo123"
  }
};

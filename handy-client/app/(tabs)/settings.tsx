import {
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getServerUrl, clearAll } from "../../src/api/client";
import { colors } from "../../src/theme";

const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const router = useRouter();
  const serverUrl = getServerUrl();

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      fetch(`${serverUrl}/api/health`)
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 30_000,
  });

  const handleChangeServer = () => {
    Alert.alert("Disconnect", "Sign out and change server?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await clearAll();
          router.replace("/setup");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-deep-purple" edges={["top"]}>
      <ScrollView contentContainerClassName="px-4 pb-12">
        <View className="pt-2 pb-4">
          <Text className="text-white font-semibold text-xl">Settings</Text>
        </View>

        {/* About */}
        <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
          {[
            { label: "App version", value: APP_VERSION },
            {
              label: "API status",
              value: health ? "Online" : "Offline",
              highlight: health,
            },
            { label: "Server URL", value: serverUrl, mono: true },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              className={`flex-row items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-white/8" : ""}`}
            >
              <Text className="text-white/50 text-sm">{row.label}</Text>
              <Text
                className={`text-sm font-medium max-w-[180px] text-right ${row.label === "API status" ? (row.highlight ? "text-vibrant-green" : "text-vibrant-orange") : row.mono ? "text-white/50 font-mono text-xs" : "text-white/80"}`}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Server */}
        <View className="bg-white/5 border border-white/10 rounded-2xl mb-4">
          <Pressable
            onPress={handleChangeServer}
            className="flex-row items-center justify-between px-4 py-3.5 active:bg-white/5"
          >
            <Text className="text-vibrant-orange text-sm">
              Change server / disconnect
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.vibrantOrange}
            />
          </Pressable>
        </View>

        {/* Links */}
        <View className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          {[
            {
              label: "GitHub",
              desc: "Source code",
              url: "https://github.com/Eric-Philippe/filaventory",
            },
            {
              label: "Report a bug",
              desc: "Open an issue",
              url: "https://github.com/Eric-Philippe/filaventory/issues",
            },
          ].map((link, i, arr) => (
            <Pressable
              key={link.label}
              onPress={() => Linking.openURL(link.url)}
              className={`flex-row items-center justify-between px-4 py-3.5 active:bg-white/5 ${i < arr.length - 1 ? "border-b border-white/8" : ""}`}
            >
              <View>
                <Text className="text-white/80 text-sm">{link.label}</Text>
                <Text className="text-white/30 text-xs">{link.desc}</Text>
              </View>
              <Ionicons
                name="open-outline"
                size={16}
                color="rgba(255,255,255,0.3)"
              />
            </Pressable>
          ))}
        </View>

        {/* Branding */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-6 items-center gap-2">
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
          <Text className="text-white font-bold tracking-widest uppercase text-sm">
            Filaventory Handy
          </Text>
          <Text className="text-white text-xs">Version {APP_VERSION}</Text>
          <Text className="text-white text-xs">
            Developed by <Text className="text-white/50">Eric PHILIPPE</Text>
          </Text>
          <Text className="text-white text-xs">
            Copyright © 2026 · All rights reserved
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

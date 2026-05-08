import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { saveServerUrl } from "../src/api/client";
import { colors } from "../src/theme";

export default function SetupScreen() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setError("");
    let normalized = url.trim().replace(/\/$/, "");
    if (!normalized) {
      setError("Enter a server URL");
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) normalized = `http://${normalized}`;
    setLoading(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${normalized}/api/health`, {
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      await saveServerUrl(normalized);
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Cannot reach server: ${err.message}`
          : "Cannot reach server",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-deep-purple"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-12">
        {/* Logo text */}
        <View className="items-center mb-12">
          <Image
            source={require("../assets/icon.png")}
            style={{ width: 80, height: 80, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text className="text-white font-bold tracking-widest uppercase text-xl">
            Filaventory Handy
          </Text>
          <Text className="text-white/40 text-sm mt-1">
            Filament inventory management
          </Text>
        </View>

        {/* Card */}
        <View className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Text className="text-white font-semibold text-lg mb-1">
            Connect to server
          </Text>
          <Text className="text-white/40 text-sm mb-6">
            Enter the address of your Filaventory server.
          </Text>

          {!!error && (
            <View className="bg-vibrant-orange/15 border border-vibrant-orange/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-vibrant-orange text-sm">{error}</Text>
            </View>
          )}

          <Text className="text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Server URL
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.100:8080"
            placeholderTextColor="rgba(255,255,255,0.2)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleConnect}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-5"
          />

          <Pressable
            onPress={handleConnect}
            disabled={loading}
            className="bg-vibrant-orange rounded-xl py-3.5 items-center active:opacity-80"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Connect</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

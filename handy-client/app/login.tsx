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
import { useRouter, Link } from "expo-router";
import { api, saveToken } from "../src/api/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Fill in all fields");
      return;
    }
    setLoading(true);
    const result = await api.auth.login(email, password);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    await saveToken(result.data.token, result.data.user);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-deep-purple"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-12">
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

        <View className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Text className="text-white font-semibold text-lg mb-6">Sign in</Text>

          {!!error && (
            <View className="bg-vibrant-orange/15 border border-vibrant-orange/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-vibrant-orange text-sm">{error}</Text>
            </View>
          )}

          <Text className="text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.2)"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-4"
          />

          <Text className="text-white/50 text-xs uppercase tracking-wider mb-1.5">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.2)"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-5"
          />

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-vibrant-orange rounded-xl py-3.5 items-center active:opacity-80"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Sign in</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center mt-5 gap-1">
            <Text className="text-white/30 text-sm">No account?</Text>
            <Link href="/register">
              <Text className="text-light-blue text-sm font-medium">
                Create one
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

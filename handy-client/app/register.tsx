import React from "react";
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
} from "react-native";
import { useRouter, Link } from "expo-router";
import { api, saveToken } from "../src/api/client";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setError("");
    if (!form.email || !form.username || !form.password) {
      setError("Fill in all fields");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await api.auth.register(
      form.email,
      form.username,
      form.password,
    );
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    await saveToken(result.data.token, result.data.user);
    router.replace("/(tabs)");
  };

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChangeText: (v: string) => setForm((p) => ({ ...p, [k]: v })),
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-deep-purple"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12">
        <View className="items-center mb-10">
          <View className="flex-row items-end gap-1.5 mb-4">
            <View className="w-2 h-8 bg-vibrant-orange rounded-full" />
            <View className="w-2 h-5 bg-light-blue rounded-full" />
            <View className="w-2 h-6 bg-vibrant-green rounded-full" />
          </View>
          <Text className="text-white font-bold tracking-widest uppercase text-xl">
            Filaventory Handy
          </Text>
        </View>

        <View className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <Text className="text-white font-semibold text-lg mb-6">
            Create account
          </Text>

          {!!error && (
            <View className="bg-vibrant-orange/15 border border-vibrant-orange/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-vibrant-orange text-sm">{error}</Text>
            </View>
          )}

          {[
            {
              key: "email" as const,
              label: "Email",
              keyboardType: "email-address" as const,
              secure: false,
            },
            {
              key: "username" as const,
              label: "Username",
              keyboardType: "default" as const,
              secure: false,
            },
            {
              key: "password" as const,
              label: "Password",
              keyboardType: "default" as const,
              secure: true,
            },
            {
              key: "confirm" as const,
              label: "Confirm password",
              keyboardType: "default" as const,
              secure: true,
            },
          ].map(({ key, label, keyboardType, secure }) => (
            <View key={key} className="mb-4">
              <Text className="text-white/50 text-xs uppercase tracking-wider mb-1.5">
                {label}
              </Text>
              <TextInput
                {...field(key)}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                keyboardType={keyboardType}
                secureTextEntry={secure}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              />
            </View>
          ))}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="bg-vibrant-orange rounded-xl py-3.5 items-center active:opacity-80 mt-1"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Create account</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center mt-5 gap-1">
            <Text className="text-white/30 text-sm">
              Already have an account?
            </Text>
            <Link href="/login">
              <Text className="text-light-blue text-sm font-medium">
                Sign in
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/api/client';
import { saveAuth } from '../src/store/auth';
import { redirectByRole } from './_layout';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;
      const token = data.token || data.accessToken || data.data?.token;
      const user = data.user || data.data?.user || data.data;

      if (!token) {
        Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
        return;
      }

      await saveAuth({
        accessToken: token,
        refreshToken: data.refreshToken || '',
        user: user,
      });

      redirectByRole(user?.role, router);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Login failed. Please check your credentials.';
      Alert.alert('Login Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>IF</Text>
          </View>
          <Text style={styles.appTitle}>IlmForge</Text>
          <Text style={styles.appTitleUrdu}>ilmفورج</Text>
          <Text style={styles.appSubtitle}>School Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Enter your credentials to continue
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#6B7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="admin@school.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#6B7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Role hint */}
          <View style={styles.roleHint}>
            <Text style={styles.roleHintText}>
              Roles: Admin • Teacher • Parent • Student
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          IlmForge ERP v1.0 — Powered by Anthropic
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1B2F6E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 2,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  appTitleUrdu: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A5B4FC',
    marginTop: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#C7D2FE',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: NAVY,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleHint: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  roleHintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 24,
  },
});

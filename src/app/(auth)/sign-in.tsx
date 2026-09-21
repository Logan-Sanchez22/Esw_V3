import { useState } from 'react'
import { Text, TextInput, TouchableOpacity } from 'react-native'
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';

const SafeAreaView = styled(RNSafeAreaView);

const SignIn = () => {
    const { signIn } = useSignIn();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        if (!signIn) return;
        setError(null);
        setSubmitting(true);

        try {
            const { error: signInError } = await signIn.password({ identifier, password });
            if (signInError) {
                setError(signInError.message ?? 'Could not sign in.');
                return;
            }

            if (signIn.status !== 'complete') {
                // Sign-in needs another step (2FA, etc.) that this minimal
                // email+password flow doesn't handle yet.
                setError(`Sign-in needs an additional step (${signIn.status}) not supported here yet.`);
                return;
            }

            const { error: finalizeError } = await signIn.finalize();
            if (finalizeError) {
                setError(finalizeError.message ?? 'Could not complete sign-in.');
                return;
            }

            router.replace('/(tabs)');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAwareForm>
                <Text className="text-2xl font-bold text-success mb-6">Sign In</Text>

                <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor="#6EE7B7"
                    value={identifier}
                    onChangeText={setIdentifier}
                    style={{
                        borderWidth: 1,
                        borderColor: '#065F46',
                        borderRadius: 8,
                        padding: 12,
                        color: '#ECFDF5',
                        marginBottom: 12,
                    }}
                />

                <TextInput
                    autoCapitalize="none"
                    secureTextEntry
                    placeholder="Password"
                    placeholderTextColor="#6EE7B7"
                    value={password}
                    onChangeText={setPassword}
                    style={{
                        borderWidth: 1,
                        borderColor: '#065F46',
                        borderRadius: 8,
                        padding: 12,
                        color: '#ECFDF5',
                        marginBottom: 12,
                    }}
                />

                {error && <Text className="text-warning mb-3">{error}</Text>}

                <TouchableOpacity
                    disabled={submitting || !identifier || !password}
                    onPress={onSubmit}
                    style={{
                        backgroundColor: '#34D399',
                        borderRadius: 8,
                        padding: 14,
                        alignItems: 'center',
                        opacity: submitting || !identifier || !password ? 0.5 : 1,
                        marginBottom: 16,
                    }}
                >
                    <Text style={{ color: '#020F09', fontWeight: '700' }}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </Text>
                </TouchableOpacity>

                <Link href={"/(auth)/sign-up"} className="text-mutedForeground underline text-center">
                    Create account
                </Link>
            </KeyboardAwareForm>
        </SafeAreaView>
    )
}
export default SignIn

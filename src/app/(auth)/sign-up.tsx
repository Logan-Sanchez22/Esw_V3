import { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const inputStyle = {
    borderWidth: 1,
    borderColor: '#065F46',
    borderRadius: 8,
    padding: 12,
    color: '#ECFDF5',
    marginBottom: 12,
} as const;

const SignUp = () => {
    const { signUp } = useSignUp();
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const onSubmitDetails = async () => {
        if (!signUp) return;
        setError(null);
        setSubmitting(true);

        try {
            const { error: passwordError } = await signUp.password({ emailAddress, password });
            if (passwordError) {
                setError(passwordError.message ?? 'Could not create account.');
                return;
            }

            if (signUp.status === 'complete') {
                const { error: finalizeError } = await signUp.finalize();
                if (finalizeError) {
                    setError(finalizeError.message ?? 'Could not complete sign-up.');
                    return;
                }
                router.replace('/(tabs)');
                return;
            }

            // Most Clerk apps require email verification before completing —
            // handle it generically rather than assuming it's on or off.
            if (signUp.unverifiedFields.includes('email_address')) {
                const { error: codeError } = await signUp.verifications.sendEmailCode();
                if (codeError) {
                    setError(codeError.message ?? 'Could not send verification code.');
                    return;
                }
                setPendingVerification(true);
                return;
            }

            setError(`Sign-up needs an additional step (${signUp.status}) not supported here yet.`);
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmitCode = async () => {
        if (!signUp) return;
        setError(null);
        setSubmitting(true);

        try {
            const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
            if (verifyError) {
                setError(verifyError.message ?? 'Invalid code.');
                return;
            }

            if (signUp.status !== 'complete') {
                setError(`Sign-up needs an additional step (${signUp.status}) not supported here yet.`);
                return;
            }

            const { error: finalizeError } = await signUp.finalize();
            if (finalizeError) {
                setError(finalizeError.message ?? 'Could not complete sign-up.');
                return;
            }

            router.replace('/(tabs)');
        } finally {
            setSubmitting(false);
        }
    };

    if (pendingVerification) {
        return (
            <SafeAreaView className="flex-1 bg-background p-5 justify-center">
                <Text className="text-2xl font-bold text-success mb-2">Check your email</Text>
                <Text className="text-mutedForeground mb-6">
                    Enter the verification code we sent to {emailAddress}.
                </Text>

                <TextInput
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    placeholder="Verification code"
                    placeholderTextColor="#6EE7B7"
                    value={code}
                    onChangeText={setCode}
                    style={inputStyle}
                />

                {error && <Text className="text-warning mb-3">{error}</Text>}

                <TouchableOpacity
                    disabled={submitting || !code}
                    onPress={onSubmitCode}
                    style={{
                        backgroundColor: '#34D399',
                        borderRadius: 8,
                        padding: 14,
                        alignItems: 'center',
                        opacity: submitting || !code ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: '#020F09', fontWeight: '700' }}>
                        {submitting ? 'Verifying…' : 'Verify'}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background p-5 justify-center">
            <Text className="text-2xl font-bold text-success mb-6">Create Account</Text>

            <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#6EE7B7"
                value={emailAddress}
                onChangeText={setEmailAddress}
                style={inputStyle}
            />

            <TextInput
                autoCapitalize="none"
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#6EE7B7"
                value={password}
                onChangeText={setPassword}
                style={inputStyle}
            />

            {error && <Text className="text-warning mb-3">{error}</Text>}

            <TouchableOpacity
                disabled={submitting || !emailAddress || !password}
                onPress={onSubmitDetails}
                style={{
                    backgroundColor: '#34D399',
                    borderRadius: 8,
                    padding: 14,
                    alignItems: 'center',
                    opacity: submitting || !emailAddress || !password ? 0.5 : 1,
                    marginBottom: 16,
                }}
            >
                <Text style={{ color: '#020F09', fontWeight: '700' }}>
                    {submitting ? 'Creating account…' : 'Create Account'}
                </Text>
            </TouchableOpacity>

            <Link href={"/(auth)/sign-in"} className="text-mutedForeground underline text-center">
                login to account
            </Link>
        </SafeAreaView>
    )
}
export default SignUp

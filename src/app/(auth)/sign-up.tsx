import { useState } from 'react'
import { Text, TextInput, TouchableOpacity } from 'react-native'
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';

const SafeAreaView = styled(RNSafeAreaView);

const inputStyle = {
    borderWidth: 1,
    borderColor: '#065F46',
    borderRadius: 8,
    padding: 12,
    color: '#ECFDF5',
    marginBottom: 8,
} as const;

const emailLooksValid = (value: string) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const SignUp = () => {
    const { signUp, errors, fetchStatus } = useSignUp();
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [genericError, setGenericError] = useState<string | null>(null);

    const submitting = fetchStatus === 'fetching';
    const emailValid = emailLooksValid(emailAddress);

    const completeSignUp = async () => {
        const { error } = await signUp.finalize({
            navigate: async ({ session }) => {
                if (session.currentTask) {
                    setGenericError('Additional account setup is required (not supported in this app yet).');
                    return;
                }
                router.replace('/(tabs)');
            },
        });
        if (error) setGenericError(error.message ?? 'Could not complete sign-up.');
    };

    const onSubmitDetails = async () => {
        if (!emailAddress || !password || !emailValid) return;
        setGenericError(null);

        const { error } = await signUp.password({ emailAddress, password });
        if (error) return; // field-specific messages come from `errors` below

        if (signUp.status === 'complete') {
            await completeSignUp();
            return;
        }

        // Most Clerk apps require email verification before completing —
        // handle it generically rather than assuming it's on or off.
        if (signUp.unverifiedFields.includes('email_address')) {
            const { error: codeError } = await signUp.verifications.sendEmailCode();
            if (codeError) setGenericError(codeError.message ?? 'Could not send verification code.');
            else setPendingVerification(true);
            return;
        }

        setGenericError(`Sign-up needs an additional step (${signUp.status}) not supported here yet.`);
    };

    const onSubmitCode = async () => {
        setGenericError(null);
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) return;

        if (signUp.status === 'complete') {
            await completeSignUp();
        } else {
            setGenericError(`Sign-up needs an additional step (${signUp.status}) not supported here yet.`);
        }
    };

    if (pendingVerification) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <KeyboardAwareForm>
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
                    {errors.fields.code && <Text className="text-warning mb-2">{errors.fields.code.message}</Text>}
                    {genericError && <Text className="text-warning mb-3">{genericError}</Text>}

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
                </KeyboardAwareForm>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAwareForm>
                <Text className="text-2xl font-bold text-success mb-6">Create Account</Text>

                <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="Email"
                    placeholderTextColor="#6EE7B7"
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    onBlur={() => setEmailTouched(true)}
                    style={inputStyle}
                />
                {emailTouched && !emailValid && (
                    <Text className="text-warning mb-2">Please enter a valid email address</Text>
                )}
                {errors.fields.emailAddress && (
                    <Text className="text-warning mb-2">{errors.fields.emailAddress.message}</Text>
                )}

                <TextInput
                    autoCapitalize="none"
                    secureTextEntry
                    autoComplete="password-new"
                    placeholder="Password"
                    placeholderTextColor="#6EE7B7"
                    value={password}
                    onChangeText={setPassword}
                    style={inputStyle}
                />
                {errors.fields.password && (
                    <Text className="text-warning mb-2">{errors.fields.password.message}</Text>
                )}

                {genericError && <Text className="text-warning mb-3">{genericError}</Text>}

                <TouchableOpacity
                    disabled={submitting || !emailAddress || !password || !emailValid}
                    onPress={onSubmitDetails}
                    style={{
                        backgroundColor: '#34D399',
                        borderRadius: 8,
                        padding: 14,
                        alignItems: 'center',
                        opacity: submitting || !emailAddress || !password || !emailValid ? 0.5 : 1,
                        marginTop: 8,
                        marginBottom: 16,
                    }}
                >
                    <Text style={{ color: '#020F09', fontWeight: '700' }}>
                        {submitting ? 'Creating account…' : 'Create Account'}
                    </Text>
                </TouchableOpacity>

                <Link
                    href={"/(auth)/sign-in"}
                    style={{ color: '#6EE7B7', textDecorationLine: 'underline', textAlign: 'center' }}
                >
                    login to account
                </Link>
            </KeyboardAwareForm>
        </SafeAreaView>
    )
}
export default SignUp

import { useState } from 'react'
import { Text, TextInput, TouchableOpacity } from 'react-native'
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/expo";
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

const SignIn = () => {
    const { signIn, errors, fetchStatus } = useSignIn();
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    // 'needs_client_trust' — Clerk's new-device verification. Genuinely
    // likely to trigger on a phone's first-ever sign-in, and the previous
    // version of this screen had no path through it beyond a dead-end
    // "not supported" message — that was very plausibly the actual "stuck,
    // no way forward" bug, not just the keyboard issue.
    const [needsDeviceVerification, setNeedsDeviceVerification] = useState(false);
    const [genericError, setGenericError] = useState<string | null>(null);

    const submitting = fetchStatus === 'fetching';
    const emailValid = emailLooksValid(emailAddress);

    const completeSignIn = async () => {
        const { error } = await signIn.finalize({
            navigate: async ({ session }) => {
                if (session.currentTask) {
                    // A Clerk Dashboard "Task" (e.g. org selection) is pending —
                    // this app doesn't have a flow for that yet.
                    setGenericError('Additional account setup is required (not supported in this app yet).');
                    return;
                }
                router.replace('/(tabs)');
            },
        });
        if (error) setGenericError(error.message ?? 'Could not complete sign-in.');
    };

    const handleSubmit = async () => {
        if (!emailAddress || !password || !emailValid) return;
        setGenericError(null);

        const { error } = await signIn.password({ emailAddress, password });
        if (error) return; // field-specific messages come from `errors` below

        if (signIn.status === 'complete') {
            await completeSignIn();
        } else if (signIn.status === 'needs_client_trust') {
            const { error: codeError } = await signIn.mfa.sendEmailCode();
            if (codeError) setGenericError(codeError.message ?? 'Could not send verification code.');
            else setNeedsDeviceVerification(true);
        } else {
            setGenericError(`Sign-in needs an additional step (${signIn.status}) not supported here yet.`);
        }
    };

    const handleVerifyDevice = async () => {
        setGenericError(null);
        const { error } = await signIn.mfa.verifyEmailCode({ code });
        if (error) return;

        if (signIn.status === 'complete') await completeSignIn();
        else setGenericError(`Sign-in needs an additional step (${signIn.status}) not supported here yet.`);
    };

    if (needsDeviceVerification) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <KeyboardAwareForm>
                    <Text className="text-2xl font-bold text-success mb-2">Verify this device</Text>
                    <Text className="text-mutedForeground mb-6">
                        You're signing in from a new device — enter the code we emailed you.
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
                        onPress={handleVerifyDevice}
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
                <Text className="text-2xl font-bold text-success mb-6">Sign In</Text>

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
                {errors.fields.identifier && (
                    <Text className="text-warning mb-2">{errors.fields.identifier.message}</Text>
                )}

                <TextInput
                    autoCapitalize="none"
                    secureTextEntry
                    autoComplete="password"
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
                    onPress={handleSubmit}
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

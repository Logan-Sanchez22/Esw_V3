import { useState } from 'react'
import { Image, Text } from 'react-native'
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { Button, TextField } from '@/components/ui';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

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
                    <Text
                        style={{
                            color: colors.success,
                            fontSize: typography.display.fontSize,
                            fontFamily: typography.display.fontFamily,
                            textAlign: 'center',
                            marginBottom: spacing[2],
                        }}
                    >
                        Verify this device
                    </Text>
                    <Text
                        style={{
                            color: colors.mutedForeground,
                            fontSize: typography.body.fontSize,
                            fontFamily: typography.body.fontFamily,
                            textAlign: 'center',
                            marginBottom: spacing[6],
                        }}
                    >
                        You're signing in from a new device — enter the code we emailed you.
                    </Text>

                    <TextField
                        autoCapitalize="none"
                        keyboardType="number-pad"
                        placeholder="Verification code"
                        value={code}
                        onChangeText={setCode}
                        error={errors.fields.code?.message}
                    />
                    {genericError && <Text style={{ color: colors.warning, marginBottom: spacing[3] }}>{genericError}</Text>}

                    <Button label={submitting ? 'Verifying…' : 'Verify'} onPress={handleVerifyDevice} disabled={submitting || !code} />
                </KeyboardAwareForm>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAwareForm>
                <Image source={require('@/assets/icons/logo.png')} style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: spacing[4] }} />
                <Text
                    style={{
                        color: colors.success,
                        fontSize: typography.display.fontSize,
                        fontFamily: typography.display.fontFamily,
                        textAlign: 'center',
                        marginBottom: spacing[6],
                    }}
                >
                    Sign In
                </Text>

                <TextField
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="Email"
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    onBlur={() => setEmailTouched(true)}
                    error={
                        (emailTouched && !emailValid && 'Please enter a valid email address') ||
                        errors.fields.identifier?.message ||
                        undefined
                    }
                />

                <TextField
                    autoCapitalize="none"
                    secureTextEntry
                    autoComplete="password"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    error={errors.fields.password?.message}
                />

                {genericError && <Text style={{ color: colors.warning, marginBottom: spacing[3] }}>{genericError}</Text>}

                <Button
                    label={submitting ? 'Signing in…' : 'Sign In'}
                    onPress={handleSubmit}
                    disabled={submitting || !emailAddress || !password || !emailValid}
                />

                <Link
                    href={"/(auth)/sign-up"}
                    style={{
                        color: colors.mutedForeground,
                        textDecorationLine: 'underline',
                        textAlign: 'center',
                        marginTop: spacing[4],
                    }}
                >
                    Create account
                </Link>
            </KeyboardAwareForm>
        </SafeAreaView>
    )
}
export default SignIn

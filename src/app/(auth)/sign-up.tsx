import { useState } from 'react'
import { Image, Text } from 'react-native'
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { Button, TextField } from '@/components/ui';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { colors, spacing, typography } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

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
                    <Text
                        style={{
                            color: colors.success,
                            fontSize: typography.display.fontSize,
                            fontFamily: typography.display.fontFamily,
                            textAlign: 'center',
                            marginBottom: spacing[2],
                        }}
                    >
                        Check your email
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
                        Enter the verification code we sent to {emailAddress}.
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

                    <Button label={submitting ? 'Verifying…' : 'Verify'} onPress={onSubmitCode} disabled={submitting || !code} />
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
                    Create Account
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
                        errors.fields.emailAddress?.message ||
                        undefined
                    }
                />

                <TextField
                    autoCapitalize="none"
                    secureTextEntry
                    autoComplete="password-new"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    error={errors.fields.password?.message}
                />

                {genericError && <Text style={{ color: colors.warning, marginBottom: spacing[3] }}>{genericError}</Text>}

                <Button
                    label={submitting ? 'Creating account…' : 'Create Account'}
                    onPress={onSubmitDetails}
                    disabled={submitting || !emailAddress || !password || !emailValid}
                />

                <Link
                    href={"/(auth)/sign-in"}
                    style={{
                        color: colors.mutedForeground,
                        textDecorationLine: 'underline',
                        textAlign: 'center',
                        marginTop: spacing[4],
                    }}
                >
                    Login to account
                </Link>
            </KeyboardAwareForm>
        </SafeAreaView>
    )
}
export default SignUp

import { useState } from 'react'
import { Image, Text } from 'react-native'
import { Link, router } from "expo-router";
import { isClerkAPIResponseError, useClerk, useSignIn } from "@clerk/expo";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { Button, TextField } from '@/components/ui';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { colors, spacing, typography } from '../../../constants/theme';

// `styled(...)` is NativeWind's bridge that lets a plain React Native
// component (RNSafeAreaView here) accept Tailwind-style `className` props
// (see the "bg-background" usage below) instead of only React Native's own
// `style={{...}}` object syntax. Both appear throughout this file — that's
// normal, not a mistake; this codebase mixes NativeWind classes for layout
// with theme.ts's raw values for anything (like exact colors) NativeWind
// doesn't have a token for.
const SafeAreaView = styled(RNSafeAreaView);

// Empty string counts as "valid" here on purpose — this function is used
// to decide whether to show a *red error message*, and an untouched/empty
// field shouldn't look like an error; the "required" check is separate
// (see the `disabled={...}` conditions below, which also check `!emailAddress`).
const emailLooksValid = (value: string) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const SignIn = () => {
    const { signIn, errors, fetchStatus } = useSignIn();
    const clerk = useClerk();
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

    // Clerk's sign-in is a multi-step state machine, not a single call —
    // `signIn.status` can land on several different values depending on
    // what this account requires (password only, email verification,
    // device trust, etc). This function is the *last* step, called once
    // Clerk reports the sign-in is fully complete, and it's what actually
    // navigates into the app.
    const completeSignIn = async () => {
        const { error } = await signIn.finalize({
            navigate: async ({ session }) => {
                if (session.currentTask) {
                    // A Clerk Dashboard "Task" (e.g. org selection) is pending —
                    // this app doesn't have a flow for that yet. Sign the
                    // pending session out right away: left on the device, it
                    // reads as signed-out to useAuth() yet makes Clerk reject
                    // every later sign-in with `session_exists`.
                    setGenericError(
                        `Your account needs an extra setup step ("${session.currentTask.key}") that this app doesn't support yet. Finish it or turn it off in the Clerk Dashboard, then sign in again.`
                    );
                    await clerk.signOut();
                    return;
                }
                router.replace('/(tabs)');
            },
        });
        if (error) setGenericError(error.message ?? 'Could not complete sign-in.');
    };

    // Clerk refuses a new sign-in with `session_exists` when this device
    // still holds a session. (auth)/_layout.tsx already clears unusable
    // sessions on the way in, so this is a last-resort fallback: sign the
    // leftover session out and let the user simply tap Sign In again.
    const clearExistingSession = async () => {
        if (clerk.session?.status === 'active') {
            router.replace('/');
            return;
        }
        await clerk.signOut();
        setGenericError('An old sign-in session on this device was cleared — tap Sign In again.');
    };

    const handleSubmit = async () => {
        if (!emailAddress || !password || !emailValid) return;
        setGenericError(null);

        const { error } = await signIn.password({ emailAddress, password });
        if (error) {
            if (isClerkAPIResponseError(error) && error.errors.some((e) => e.code === 'session_exists')) {
                await clearExistingSession();
            } else if (!errors.fields.identifier && !errors.fields.password) {
                // Field-specific messages render under their inputs via
                // `errors` below; anything else would otherwise be silent.
                setGenericError(
                    (isClerkAPIResponseError(error) && (error.errors[0]?.longMessage ?? error.errors[0]?.message)) ||
                    error.message ||
                    'Could not sign in.'
                );
            }
            return;
        }

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

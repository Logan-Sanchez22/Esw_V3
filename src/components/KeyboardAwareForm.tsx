import { ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback } from 'react-native';

type Props = { children: ReactNode };

/**
 * Wraps a vertically-centered form so the keyboard doesn't just cover the
 * bottom of the screen: shifts content up when it opens, falls back to
 * scrolling if it still doesn't fit, and a tap outside the inputs dismisses
 * it. Without this, a `justify-center` form screen has no way to reach
 * whatever ends up below the keyboard (submit button, "create account"
 * link) — that's the exact bug this fixes on the sign-in/sign-up screens.
 */
export function KeyboardAwareForm({ children }: Props) {
    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

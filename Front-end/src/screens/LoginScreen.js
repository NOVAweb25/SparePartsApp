import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../api/api';

const LoginScreen = ({ navigation }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!phoneNumber || !password) {
            setError('يرجى ملء جميع الحقول.');
            return;
        }

        try {
            console.log('Logging in with:', { phoneNumber, password });
            const response = await login(phoneNumber, password);
            console.log('Login response:', response);
            if (response.access_token) {
                // حفظ التوكن والبيانات في AsyncStorage
                await AsyncStorage.setItem('token', response.access_token);
                await AsyncStorage.setItem('userId', response.user_id);
                await AsyncStorage.setItem('userType', response.user_type);
                await AsyncStorage.setItem('fullName', response.full_name);
                if (response.user_type === 'admin') {
                    navigation.replace('AdminDashboard', { userId: response.user_id });
                } else {
                    navigation.replace('Home', { userId: response.user_id });
                }
            } else {
                setError('فشل تسجيل الدخول: استجابة غير متوقعة من الخادم.');
            }
        } catch (err) {
            const errorMessage =
                err.response?.data?.detail ||
                err.message ||
                'فشل تسجيل الدخول. تحققي من رقم الهاتف وكلمة المرور.';
            setError(errorMessage);
            console.error('Login error:', err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>تسجيل الدخول</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
                style={styles.input}
                placeholder="رقم الهاتف (مثال: 966531234567)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
            />
            <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title="تسجيل الدخول" onPress={handleLogin} />
            <Button
                title="ليس لديك حساب؟ سجل الآن"
                onPress={() => navigation.navigate('Register')}
                color="#888"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    error: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
    },
});

export default LoginScreen;
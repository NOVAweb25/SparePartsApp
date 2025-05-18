import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { register } from '../api/api';

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^966\d{9}$/;
    return phoneRegex.test(number);
  };

  const handleRegister = async () => {
    if (!fullName || !phoneNumber || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقتين.');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('رقم الهاتف يجب أن يبدأ بـ 966 ويكون طوله 12 رقمًا (مثال: 966531234567).');
      return;
    }

    try {
      const response = await register({
        full_name: fullName,
        phoneNumber: phoneNumber,
        password: password,
      });
      if (response.data.message) {
        Alert.alert('نجاح', 'تم التسجيل بنجاح! يرجى تسجيل الدخول.');
        navigation.replace('Login');
      }
    } catch (err) {
      // تحسين معالجة الأخطاء
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'فشل التسجيل. تحققي من البيانات وحاولي مرة أخرى.';
      setError(errorMessage);
      console.error('Registration error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>التسجيل</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="الاسم الكامل"
        value={fullName}
        onChangeText={setFullName}
      />
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
      <TextInput
        style={styles.input}
        placeholder="تأكيد كلمة المرور"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Button title="إنشاء حساب" onPress={handleRegister} />
      <Button
        title="لديك حساب؟ سجل الدخول"
        onPress={() => navigation.navigate('Login')}
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

export default RegisterScreen;
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUser } from '../api/api';

const AccountScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await checkUser();
        if (response.data.user_id) {
          setUserData(response.data);
        } else {
          Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً.');
          navigation.replace('LoginScreen');
        }
      } catch (error) {
        Alert.alert('خطأ', 'فشل جلب بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.');
        navigation.replace('LoginScreen');
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('LoginScreen');
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل بيانات المستخدم...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>حسابي</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>الاسم الكامل: {userData.full_name}</Text>
        <Text style={styles.label}>رقم الهاتف: {userData.phoneNumber}</Text>
      </View>
      <Button title="تسجيل الخروج" onPress={handleLogout} color="#ff4444" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    marginVertical: 5,
  },
});

export default AccountScreen;
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUser } from '../api/api';
import { ActivityIndicator, View, Text, Button, StyleSheet } from 'react-native';

// استيراد الشاشات
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminProducts from '../screens/admin/AdminProducts';
import AdminOrders from '../screens/admin/AdminOrders';
import AdminOffers from '../screens/admin/AdminOffers';
import AdminCustomers from '../screens/admin/AdminCustomers';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userType, setUserType] = useState(null);

  const checkAuthStatus = async () => {
    try {
      const response = await checkUser();
      if (response.data.user_id) {
        setIsAuthenticated(true);
        setUserId(response.data.user_id);
        setUserType(response.data.user_type || 'customer');
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error.response?.data || error.message);
      if (error.message.includes('Network Error')) {
        alert('فشل الاتصال بخادم التطوير. تأكدي من تشغيل الخادم واتصال الشبكة.');
      } else if (error.response?.status === 401) {
        alert('انتهت جلسة تسجيل الدخول. الرجاء تسجيل الدخول مرة أخرى.');
      } else {
        alert('فشل التحقق من حالة المصادقة. تأكد من اتصال الإنترنت وحاول مرة أخرى.');
      }
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>جاري التحقق من حالة المصادقة...</Text>
        <Button
          title="إعادة المحاولة"
          onPress={checkAuthStatus} // الدالة مُعرفة قبل استخدامها
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={
          isAuthenticated ? (userType === 'admin' ? 'AdminDashboard' : 'Home') : 'Login'
        }
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'التسجيل' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'الصفحة الرئيسية' }}
          initialParams={{ userId }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'تفاصيل المنتج' }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: 'السلة' }}
        />
        <Stack.Screen
          name="Orders"
          options={{ title: 'طلباتي' }}
        >
          {props => <OrdersScreen {...props} userId={userId} />}
        </Stack.Screen>
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: 'المفضلة' }}
        />
        <Stack.Screen
          name="Subscriptions"
          component={SubscriptionScreen}
          options={{ title: 'الاشتراكات' }}
        />
        <Stack.Screen
          name="Maintenance"
          component={MaintenanceScreen}
          options={{ title: 'الصيانة' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ title: 'لوحة تحكم المسؤول' }}
        />
        <Stack.Screen
          name="AdminProducts"
          component={AdminProducts}
          options={{ title: 'إدارة المنتجات' }}
        />
        <Stack.Screen
          name="AdminOrders"
          component={AdminOrders}
          options={{ title: 'إدارة الطلبات' }}
        />
        <Stack.Screen
          name="AdminOffers"
          component={AdminOffers}
          options={{ title: 'إدارة العروض' }}
        />
        <Stack.Screen
          name="AdminCustomers"
          component={AdminCustomers}
          options={{ title: 'إدارة العملاء' }}
        />
        <Stack.Screen
          name="OrderDetailsScreen"
          component={OrderDetailsScreen}
          options={{ title: 'تفاصيل الطلب' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginVertical: 10,
    fontSize: 16,
  },
});

export default AppNavigator;
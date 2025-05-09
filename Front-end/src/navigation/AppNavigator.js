import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkUser } from '../api/api';
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

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await checkUser();
        if (response.data.user_id) {
          setIsAuthenticated(true);
          setUserId(response.data.user_id);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, []);

  if (isAuthenticated === null) {
    return null; // Show a loading screen while checking auth status
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isAuthenticated ? "Home" : "Login"}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Heavy Machinery' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
        <Stack.Screen
          name="Orders"
          options={{ title: 'My Orders' }}
        >
          {props => <OrdersScreen {...props} userId={userId} />}
        </Stack.Screen>
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
        <Stack.Screen name="Subscriptions" component={SubscriptionScreen} options={{ title: 'Subscriptions' }} />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Maintenance' }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin Dashboard' }} />
        <Stack.Screen name="AdminProducts" component={AdminProducts} options={{ title: 'Manage Products' }} />
        <Stack.Screen name="AdminOrders" component={AdminOrders} options={{ title: 'Manage Orders' }} />
        <Stack.Screen name="AdminOffers" component={AdminOffers} options={{ title: 'Manage Offers' }} />
        <Stack.Screen name="AdminCustomers" component={AdminCustomers} options={{ title: 'Manage Customers' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
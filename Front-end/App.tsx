import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import ProductsScreen from './screens/ProductsScreen';
import PaymentScreen from './screens/PaymentScreen';
import TrackingScreen from './screens/TrackingScreen';
import PickupScreen from './screens/PickupScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';
import CartScreen from './screens/CartScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import OrdersScreen from './screens/Orders';
import AIScreen from './screens/AIScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import AdminUserListScreen from './screens/admin/AdminUserListScreen';
import AdminEditUserScreen from './screens/admin/AdminEditUserScreen';
import AdminProductListScreen from './screens/admin/AdminProductListScreen';
import AdminEditProductScreen from './screens/admin/AdminEditProductScreen';
import AdminOrdersScreen from './screens/admin/AdminOrdersScreen';
import AdminPaymentsScreen from './screens/admin/AdminPaymentsScreen';
import AdminSubscriptionsScreen from './screens/admin/AdminSubscriptionsScreen';
import AdminMaintenanceScreen from './screens/admin/AdminMaintenanceScreen';
import AdminReportsScreen from './screens/admin/AdminReportsScreen';
import AdminFeedbackScreen from './screens/admin/AdminFeedbackScreen';
import AdminSettingsScreen from './screens/admin/AdminSettingsScreen';
import OrderDetailsScreen from './screens/admin/OrderDetailsScreen';
import UserDetailsScreen from './screens/admin/UserDetailsScreen';
import { checkAdmin } from './services/api';

type RootStackParamList = {
  Main: undefined;
  Home: { loggedIn?: boolean; isAdmin?: boolean; user?: { fullName: string; email: string; password: string } };
  Products: { search?: string; brand?: string; car?: string; part?: string; loggedIn?: boolean };
  ProductDetails: { product: any; loggedIn?: boolean };
  Cart: { product: any; loggedIn?: boolean };
  Favorites: { favorites: any[]; loggedIn?: boolean };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Payment: undefined;
  Tracking: { order: any };
  Pickup: undefined;
  Categories: { loggedIn?: boolean };
  Orders: { loggedIn?: boolean };
  AI: undefined;
};

type AdminDrawerParamList = {
  AdminDashboard: undefined;
  AdminUserList: undefined;
  AdminEditUser: { userId: number };
  AdminProductList: undefined;
  AdminEditProduct: { productId?: number };
  AdminOrders: undefined;
  AdminPayments: undefined;
  AdminSubscriptions: undefined;
  AdminMaintenance: undefined;
  AdminReports: undefined;
  AdminFeedback: undefined;
  AdminSettings: undefined;
  OrderDetails: { orderId: number };
  UserDetails: { userId: number };
};

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<AdminDrawerParamList>();

SplashScreen.preventAutoHideAsync();

const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#F5F5F5',
          width: 240,
        },
        drawerLabelStyle: {
          color: '#023E8A',
          fontSize: 16,
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#FCA311',
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'لوحة التحكم', drawerIcon: () => <Ionicons name="home-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminProductList"
        component={AdminProductListScreen}
        options={{ title: 'المنتجات', drawerIcon: () => <Ionicons name="cube-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminOrders"
        component={AdminOrdersScreen}
        options={{ title: 'الطلبات', drawerIcon: () => <Ionicons name="cart-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminUserList"
        component={AdminUserListScreen}
        options={{ title: 'العملاء', drawerIcon: () => <Ionicons name="people-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminPayments"
        component={AdminPaymentsScreen}
        options={{ title: 'المدفوعات', drawerIcon: () => <Ionicons name="card-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminSubscriptions"
        component={AdminSubscriptionsScreen}
        options={{ title: 'الاشتراكات', drawerIcon: () => <Ionicons name="document-text-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminMaintenance"
        component={AdminMaintenanceScreen}
        options={{ title: 'الصيانة', drawerIcon: () => <Ionicons name="construct-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ title: 'التقارير والتحليلات', drawerIcon: () => <Ionicons name="bar-chart-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminFeedback"
        component={AdminFeedbackScreen}
        options={{ title: 'الآراء والاستفسارات', drawerIcon: () => <Ionicons name="chatbubble-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ title: 'الإعدادات', drawerIcon: () => <Ionicons name="settings-outline" size={20} color="#023E8A" /> }}
      />
      <Drawer.Screen
        name="AdminEditUser"
        component={AdminEditUserScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="AdminEditProduct"
        component={AdminEditProductScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="UserDetails"
        component={UserDetailsScreen}
        options={{ drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<{ fullName: string; email: string; password: string } | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const token = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        if (token && storedUser) {
          const userData = JSON.parse(storedUser);
          setLoggedIn(true);
          setUser(userData);
          const isAdminUser = await checkAdmin();
          setIsAdmin(isAdminUser);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepareApp();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={loggedIn ? "Main" : "Login"}>
        <Stack.Screen
          name="Main"
          component={isAdmin ? AdminDrawerNavigator : HomeScreen}
          options={{ headerShown: false }}
          initialParams={{ loggedIn, isAdmin, user }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
          initialParams={{ loggedIn, isAdmin, user }}
        />
        <Stack.Screen
          name="Products"
          component={ProductsScreen}
          options={{ title: 'المنتجات', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'الدفع', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Tracking"
          component={TrackingScreen}
          options={{ title: 'تتبع الطلب', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Pickup"
          component={PickupScreen}
          options={{ title: 'استلام من المقر', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="ProductDetails"
          component={ProductDetailsScreen}
          options={{ title: 'تفاصيل المنتج', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: 'سلة التسوق', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ title: 'المفضلة', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'تسجيل الدخول', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'إنشاء حساب', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'نسيت كلمة المرور', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
        />
        <Stack.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{ headerShown: false }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ title: 'الطلبات', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
          initialParams={{ loggedIn }}
        />
        <Stack.Screen
          name="AI"
          component={AIScreen}
          options={{ title: 'الذكاء الاصطناعي', headerTintColor: '#FCA311', headerStyle: { backgroundColor: '#023E8A' } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
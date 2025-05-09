import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.1.5:8000', // تأكدي من تحديث هذا الرابط
  timeout: 10000,
});

// Add interceptor to attach JWT token to requests
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const login = async (username, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const response = await API.post('/auth/manual-login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (response.data.access_token) {
      await AsyncStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

export const register = async (userData) => {
  return API.post('/auth/register', userData);
};

export const registerAdmin = async (userData) => {
  return API.post('/auth/register/admin', userData);
};

export const checkUser = async () => {
  return API.get('/auth/check');
};

// Products
export const getProducts = async (params = {}) => {
  return API.get('/products', { params });
};

export const searchProducts = async (query) => {
  return API.get('/products/search', { params: { query } });
};

export const getSimilarProducts = async (productId) => {
  return API.get(`/products/similar/${productId}`);
};

export const sortProductsByPrice = async (order) => {
  return API.get('/products/sort/price', { params: { order } });
};

export const getTrendingProducts = async () => {
  return API.get('/products/trending');
};

export const getSuggestedProducts = async () => {
  return API.get('/products/trending');
};

// Cart
export const getCart = async () => {
  try {
    const response = await API.get('/auth/check');
    return { data: response.data.cart || [] };
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
};

export const addToCart = async (productId, quantity) => {
  try {
    const response = await API.post('/auth/check', { cart: { product_id: productId, quantity } });
    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await API.put('/auth/check', { cart_item_id: itemId, quantity });
    return response;
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
};

export const removeFromCart = async (itemId) => {
  try {
    const response = await API.delete('/auth/check', { params: { cart_item_id: itemId } });
    return response;
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw error;
  }
};

// Orders
export const getOrders = async (userId) => {
  return API.get(`/api/orders/${userId}`);
};

export const getLastOrder = async (userId) => {
  return API.get(`/api/orders/${userId}/last`);
};

export const checkout = async (cartItems, totalPrice, couponCode) => {
  return API.post('/api/checkout', { cart_items: cartItems, total_price: totalPrice, coupon_code: couponCode });
};

// Favorites
export const getFavorites = async () => {
  try {
    const response = await API.get('/auth/check');
    return { data: response.data.favorites || [] };
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }
};

export const addToFavorites = async (productId) => {
  try {
    const response = await API.post('/auth/check', { favorite: { product_id: productId } });
    return response;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

export const removeFromFavorites = async (productId) => {
  try {
    const response = await API.delete('/auth/check', { params: { favorite_id: productId } });
    return response;
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
};

// Subscriptions
export const getSubscriptions = async () => {
  try {
    const response = await API.get('/auth/check');
    return { data: response.data.subscription ? [response.data] : [] };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export const getPreferredProducts = async (userId) => {
  try {
    const response = await API.get('/auth/check');
    return { data: response.data.preferred_products || [] };
  } catch (error) {
    console.error('Error fetching preferred products:', error);
    throw error;
  }
};

// Coupons
export const applyCoupon = async (couponCode) => {
  return API.post('/api/coupons/apply', { coupon_code: couponCode });
};

// Maintenance Articles
export const getMaintenanceArticles = async (customerType) => {
  return API.get('/maintenance/articles', { params: { customer_type: customerType } });
};

// FAQs
export const getFAQs = async () => {
  return API.get('/faqs');
};

export const addFAQ = async (faq) => {
  return API.post('/faqs', faq);
};

// Feedback
export const addFeedback = async (productId, rating, comment) => {
  return API.post('/feedback', { product_id: productId, rating, comment });
};

export const getFeedback = async (minRating, maxRating) => {
  return API.get('/feedback', { params: { min_rating: minRating, max_rating: maxRating } });
};

// Chat Inquiry
export const sendInquiry = async (question, context, userId) => {
  return API.post('/chat/inquiry', { question, context, user_id: userId });
};
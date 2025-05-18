import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = axios.create({
  baseURL: 'https://spareparts-backend-dda57e70bd23.herokuapp.com',
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

// Add response interceptor for better error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

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
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Login failed' };
  }
};

export const register = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    if (response.data.user_id) {
      const loginResponse = await login(userData.username, userData.password);
      return loginResponse;
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Registration failed' };
  }
};

export const registerAdmin = async (userData) => {
  try {
    const response = await API.post('/auth/register/admin', userData);
    if (response.data.user_id) {
      const loginResponse = await login(userData.username, userData.password);
      return loginResponse;
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Admin registration failed' };
  }
};

export const checkUser = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log('Token in checkUser:', token); // تسجيل للتحقق
    if (!token) {
      return { data: null };
    }
    const response = await API.get('/auth/check');
    console.log('checkUser response:', response.data); // تسجيل الاستجابة
    return { data: response.data };
  } catch (error) {
    console.error('checkUser error:', error.response?.data || error.message);
    return { data: null };
  }
};

// Products
export const getProducts = async (params = {}) => {
  try {
    const response = await API.get('/products', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch products' };
  }
};

export const searchProducts = async (query) => {
  try {
    const response = await API.get('/products/search', { params: { query } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to search products' };
  }
};

export const getSimilarProducts = async (productId) => {
  try {
    const response = await API.get(`/products/similar/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch similar products' };
  }
};

export const sortProductsByPrice = async (order) => {
  try {
    const response = await API.get('/products/sort/price', { params: { order } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to sort products' };
  }
};

export const getTrendingProducts = async () => {
  try {
    const response = await API.get('/products/trending');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch trending products' };
  }
};

export const getSuggestedProducts = async () => {
  try {
    const response = await API.get('/api/suggested-products');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch suggested products' };
  }
};

// Brands
export const getBrands = async () => {
  try {
    const response = await API.get('/api/brands');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch brands' };
  }
};

// Cart
export const getCart = async () => {
  try {
    const response = await API.get('/api/cart');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch cart' };
  }
};

export const addToCart = async (productId, quantity) => {
  try {
    const response = await API.post('/api/cart', { product_id: productId, quantity });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to add to cart' };
  }
};

export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await API.put(`/api/cart/${itemId}`, { quantity });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to update cart item' };
  }
};

export const removeFromCart = async (itemId) => {
  try {
    const response = await API.delete(`/api/cart/${itemId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to remove cart item' };
  }
};

// Orders
export const getOrders = async (userId) => {
  try {
    const response = await API.get(`/orders`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch orders' };
  }
};

export const getLastOrder = async (userId) => {
  try {
    const response = await API.get(`/orders/${userId}/last`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch last order' };
  }
};

export const checkout = async (cartItems, totalPrice, couponCode) => {
  try {
    const response = await API.post('/api/checkout', {
      cart_items: cartItems,
      total_price: totalPrice,
      coupon_code: couponCode,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to checkout' };
  }
};

// Favorites
export const getFavorites = async () => {
  try {
    const response = await API.get('/api/favorites');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch favorites' };
  }
};

export const addToFavorites = async (productId) => {
  try {
    const response = await API.post('/api/favorites', { product_id: productId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to add to favorites' };
  }
};

export const removeFromFavorites = async (productId) => {
  try {
    const response = await API.delete(`/api/favorites/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to remove favorite' };
  }
};

// Subscriptions
export const getSubscriptions = async () => {
  try {
    const response = await API.get('/api/subscriptions');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch subscriptions' };
  }
};

export const getPreferredProducts = async (userId) => {
  try {
    const response = await API.get(`/api/subscriptions/${userId}/preferred-products`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch preferred products' };
  }
};

// Coupons
export const applyCoupon = async (couponCode) => {
  try {
    const response = await API.post('/api/coupons/apply', { coupon_code: couponCode });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to apply coupon' };
  }
};

// Maintenance Articles
export const getMaintenanceArticles = async (customerType) => {
  try {
    const response = await API.get('/maintenance/articles', {
      params: { customer_type: customerType },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch maintenance articles' };
  }
};

// FAQs
export const getFAQs = async () => {
  try {
    const response = await API.get('/faqs');
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch FAQs' };
  }
};

export const addFAQ = async (faq) => {
  try {
    const response = await API.post('/faqs', faq);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to add FAQ' };
  }
};

// Feedback
export const addFeedback = async (productId, rating, comment) => {
  try {
    const response = await API.post('/feedback', { product_id: productId, rating, comment });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to add feedback' };
  }
};

export const getFeedback = async (minRating, maxRating) => {
  try {
    const response = await API.get('/feedback', {
      params: { min_rating: minRating, max_rating: maxRating },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to fetch feedback' };
  }
};

// Chat Inquiry
export const sendInquiry = async (question, context, userId) => {
  try {
    const response = await API.post('/chat/inquiry', { question, context, user_id: userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: 'Failed to send inquiry' };
  }
};
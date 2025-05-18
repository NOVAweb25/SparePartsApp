import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TextInput } from 'react-native';
import { getCart, updateCartItem, removeFromCart, checkout } from '../api/api';
import CartItem from '../components/CartItem';

const CartScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await getCart();
        setCartItems(response.data);
        const total = response.data.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setTotalPrice(total);
      } catch (error) {
        console.error('Error fetching cart:', error);
      }
    };
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      await updateCartItem(itemId, quantity);
      const response = await getCart();
      setCartItems(response.data);
      const total = response.data.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setTotalPrice(total);
    } catch (error) {
      console.error('Error updating cart item:', error);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeFromCart(itemId);
      const response = await getCart();
      setCartItems(response.data);
      const total = response.data.reduce((sum, item) => sum + item.price * item.quantity, 0);
      setTotalPrice(total);
    } catch (error) {
      console.error('Error removing cart item:', error);
    }
  };

  const handleApplyCoupon = async () => {
    try {
      const response = await applyCoupon(couponCode);
      if (response.data.discount) {
        setDiscount(response.data.discount);
        setTotalPrice((prevTotal) => prevTotal * (1 - response.data.discount / 100));
      } else {
        console.error('Invalid coupon code:', response.data.error);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      await checkout(cartItems, totalPrice, couponCode);
      setCartItems([]);
      setTotalPrice(0);
 navigation.navigate('Orders', { userId: navigation.getParent().getState().routes[0].params?.userId });
    } catch (error) {
      console.error('Error during checkout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart</Text>
      <FlatList
        data={cartItems}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
          />
        )}
        keyExtractor={(item) => item.id}
      />
      <Text style={styles.total}>Total: ${totalPrice.toFixed(2)}</Text>
      <TextInput
        style={styles.input}
        placeholder="Coupon Code"
        value={couponCode}
        onChangeText={setCouponCode}
      />
      <Button title="Apply Coupon" onPress={handleApplyCoupon} />
      <Button title="Checkout" onPress={handleCheckout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});

export default CartScreen;
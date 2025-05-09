import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getOrders } from '../api/api';

const OrdersScreen = ({ route }) => {
  const { userId } = route.params;
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await getOrders(userId);
        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      <FlatList
        data={orders}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text>Order ID: {item.orderId}</Text>
            <Text>Date: {item.date}</Text>
            <Text>Amount: ${item.amount}</Text>
            <Text>Products: {item.products.map(p => p.name).join(', ')}</Text>
          </View>
        )}
        keyExtractor={(item) => item.orderId}
      />
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
  orderItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default OrdersScreen;
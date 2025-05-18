import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';

const AdminOrders = ({ navigation }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('https://your-backend-subdomain.loca.lt/admin/orders', {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();
  }, []);

  const handleChangeStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`https://your-backend-subdomain.loca.lt/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setOrders(orders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
      }
    } catch (error) {
      console.error('Error changing order status:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Orders</Text>
      <FlatList
        data={orders}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text>Order ID: {item.id}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Total Price: ${item.total_price}</Text>
            <Button
              title="Mark as Completed"
              onPress={() => handleChangeStatus(item.id, 'Completed')}
            />
            <Button
              title="Mark as Pending"
              onPress={() => handleChangeStatus(item.id, 'Pending')}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
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

export default AdminOrders;
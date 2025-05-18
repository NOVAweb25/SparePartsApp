import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert } from 'react-native';
import { getOrders, addToCart } from '../api/api';

const OrdersScreen = ({ navigation, userId }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await getOrders(userId);
        setOrders(response.data);
      } catch (error) {
        Alert.alert('خطأ', 'فشل جلب الطلبات. حاولي مرة أخرى.');
      }
    };
    if (userId) {
      fetchOrders();
    } else {
      Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً.');
      navigation.replace('LoginScreen');
    }
  }, [userId]);

  const handleReorder = async (order) => {
    try {
      for (const product of order.products) {
        await addToCart(product.id, product.quantity);
      }
      Alert.alert('نجاح', 'تم إعادة طلب المنتجات بنجاح!');
    } catch (error) {
      Alert.alert('خطأ', 'فشل إعادة الطلب. حاولي مرة أخرى.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>طلباتي</Text>
      <FlatList
        data={orders}
        renderItem={({ item }) => (
          <View style={styles.orderContainer}>
            <Text style={styles.orderDate}>تاريخ الطلب: {item.created_at}</Text>
            <Text style={styles.orderAmount}>المبلغ: {item.total_price} ريال</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="إعادة الطلب"
                onPress={() => handleReorder(item)}
                color="#4CAF50"
              />
              <Button
                title="تفاصيل الطلب"
                onPress={() => navigation.navigate('OrderDetailsScreen', { order: item })}
                color="#2196F3"
              />
            </View>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  orderContainer: {
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  orderDate: {
    fontSize: 16,
    marginBottom: 5,
  },
  orderAmount: {
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default OrdersScreen;
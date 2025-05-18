import React from 'react';
import { View, Text, FlatList, Button, Image, StyleSheet } from 'react-native';
import { addToCart } from '../api/api';

const OrderDetailsScreen = ({ route, navigation }) => {
  const { order } = route.params;

  const handleAddToCart = async (productId, quantity) => {
    try {
      await addToCart(productId, quantity);
      alert('تمت إضافة المنتج إلى السلة بنجاح!');
    } catch (error) {
      alert('فشل إضافة المنتج إلى السلة. حاولي مرة أخرى.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تفاصيل الطلب</Text>
      <Text style={styles.label}>تاريخ الطلب: {order.created_at}</Text>
      <Text style={styles.label}>المبلغ الإجمالي: {order.total_price} ريال</Text>
      <Text style={styles.label}>المنتجات:</Text>
      <FlatList
        data={order.products}
        renderItem={({ item }) => (
          <View style={styles.productContainer}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.productImage} />
            )}
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text>السعر: {item.price} ريال</Text>
              <Text>الكمية: {item.quantity}</Text>
              <Text>العلامة التجارية: {item.brand}</Text>
              <Button
                title="أضف للسلة"
                onPress={() => handleAddToCart(item.id, item.quantity)}
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
  label: {
    fontSize: 18,
    marginVertical: 5,
  },
  productContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;
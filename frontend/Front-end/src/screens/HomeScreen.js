import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { getProducts, getTrendingProducts } from '../api/api';
import ProductCard from '../components/ProductCard';

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts();
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    const fetchTrendingProducts = async () => {
      try {
        const response = await getTrendingProducts();
        setTrendingProducts(response.data);
      } catch (error) {
        console.error('Error fetching trending products:', error);
      }
    };

    fetchProducts();
    fetchTrendingProducts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>المنتجات الشائعة</Text>
      <FlatList
        data={trendingProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
      />
      <Text style={styles.title}>جميع المنتجات</Text>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
          />
        )}
        keyExtractor={(item) => item.id}
      />
      <Button title="الذهاب إلى السلة" onPress={() => navigation.navigate('Cart')} />
      <Button
        title="الذهاب إلى الطلبات"
        onPress={() => navigation.navigate('Orders', { userId: navigation.getState().routes[0].params?.userId })}
      />
      <Button title="الذهاب إلى المفضلة" onPress={() => navigation.navigate('Favorites')} />
      <Button title="الذهاب إلى الاشتراكات" onPress={() => navigation.navigate('Subscriptions')} />
      <Button title="الذهاب إلى الصيانة" onPress={() => navigation.navigate('Maintenance')} />
      <Button title="تسجيل الدخول" onPress={() => navigation.navigate('LoginScreen')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
});

export default HomeScreen;
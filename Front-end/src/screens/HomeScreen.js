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
      <Text style={styles.title}>Trending Products</Text>
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
      <Text style={styles.title}>All Products</Text>
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
      <Button title="Go to Cart" onPress={() => navigation.navigate('Cart')} />
      <Button
        title="Go to Orders"
        onPress={() => navigation.navigate('Orders', { userId: navigation.getState().routes[0].params?.userId })}
      />
      <Button title="Go to Favorites" onPress={() => navigation.navigate('Favorites')} />
      <Button title="Go to Subscriptions" onPress={() => navigation.navigate('Subscriptions')} />
      <Button title="Go to Maintenance" onPress={() => navigation.navigate('Maintenance')} />
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
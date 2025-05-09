import React from 'react';
import { View, Text, Image, Button, StyleSheet } from 'react-native';
import { addToCart, addToFavorites } from '../api/api';

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params;

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, 1);
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleAddToFavorites = async () => {
    try {
      await addToFavorites(product.id);
      navigation.navigate('Favorites');
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: product.image_url }} style={styles.image} />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>${product.price}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={styles.stock}>Stock: {product.stock}</Text>
      <Button title="Add to Cart" onPress={handleAddToCart} />
      <Button title="Add to Favorites" onPress={handleAddToFavorites} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  price: {
    fontSize: 20,
    color: 'green',
  },
  description: {
    fontSize: 16,
    marginVertical: 10,
  },
  stock: {
    fontSize: 16,
    color: 'gray',
  },
});

export default ProductDetailScreen;
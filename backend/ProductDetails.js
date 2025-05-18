import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const ProductDetails = ({ route }) => {
  const { product } = route.params;
  const [similarProducts, setSimilarProducts] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchSimilarProducts();
  }, []);

  const fetchSimilarProducts = async () => {
    try {
      const response = await axios.get(`http://192.168.1.100:8000/products/similar/${product._id}`);
      setSimilarProducts(response.data);
    } catch (error) {
      console.error('Error fetching similar products:', error);
    }
  };

  const addToCart = () => {
    // هنا يمكنك إضافة المنتج إلى السلة
    Alert.alert('Success', 'Product added to cart');
  };

  const renderSimilarProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.similarProductCard}
      onPress={() => navigation.navigate('ProductDetails', { product: item })}
    >
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price} SAR</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={styles.price}>Price: {product.price} SAR</Text>
      <Text style={styles.stock}>
        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={addToCart}>
        <Text style={styles.buttonText}>Add to Cart</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Similar Products</Text>
      <FlatList
        data={similarProducts}
        renderItem={renderSimilarProduct}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Checkout', { product })}
      >
        <Text style={styles.buttonText}>Proceed to Checkout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stock: {
    fontSize: 16,
    color: '#ff0000',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  similarProductCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    width: 120,
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductDetails;
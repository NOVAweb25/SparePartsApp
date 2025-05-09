import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getFavorites, removeFromFavorites } from '../api/api';
import ProductCard from '../components/ProductCard';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await getFavorites();
        setFavorites(response.data);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };
    fetchFavorites();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeFromFavorites(productId);
      setFavorites(favorites.filter(item => item.productId !== productId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorites</Text>
      <FlatList
        data={favorites}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            />
            <Button title="Remove" onPress={() => handleRemove(item.productId)} />
          </View>
        )}
        keyExtractor={(item) => item.productId}
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
  itemContainer: {
    marginBottom: 10,
  },
});

export default FavoritesScreen;
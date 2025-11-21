import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tutorial } from '../../data/tutorials/types';

interface Props {
  tutorial: Tutorial;
  onPress: () => void;
  completed?: boolean;
  isNew?: boolean;
}

export default function TutorialCard({ tutorial, onPress, completed, isNew }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, completed && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NUEVO</Text>
        </View>
      )}

      {/* Icon Container with gradient */}
      <LinearGradient
        colors={[tutorial.color, tutorial.color + 'CC']}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name={tutorial.icon as any}
          size={32}
          color="white"
        />
      </LinearGradient>

      {/* Tutorial Info */}
      <Text style={[styles.name, completed && styles.nameCompleted]} numberOfLines={2}>
        {tutorial.name}
      </Text>

      <View style={styles.metaInfo}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={[styles.duration, { marginLeft: 4 }]}>{tutorial.duration}s</Text>
        </View>

        <View style={styles.slidesContainer}>
          <Ionicons name="images-outline" size={14} color="#64748b" />
          <Text style={[styles.slidesCount, { marginLeft: 4 }]}>{tutorial.slides.length} slides</Text>
        </View>
      </View>

      {/* Status or Play Button */}
      {completed ? (
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={[styles.completedText, { marginLeft: 6 }]}>Completado</Text>
        </View>
      ) : (
        <View style={styles.playButton}>
          <Ionicons name="play-circle" size={18} color="#2563EB" />
          <Text style={[styles.playButtonText, { marginLeft: 6 }]}>Ver Tutorial</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  cardCompleted: {
    opacity: 0.8,
    backgroundColor: '#f8fafc',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    minHeight: 40,
    lineHeight: 20,
  },
  nameCompleted: {
    color: '#64748b',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#64748b',
  },
  slidesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slidesCount: {
    fontSize: 12,
    color: '#64748b',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
  },
  completedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  playButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
});

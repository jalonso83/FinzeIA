import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TutorialSlide from './TutorialSlide';
import ProgressBar from './ProgressBar';
import { Tutorial } from '../../data/tutorials/types';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  tutorial: Tutorial;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  onComplete: () => void;
  onSkip: () => void;
  onSlideChange?: (index: number) => void;
}

export default function TutorialModal({
  visible,
  tutorial,
  autoAdvance = false,
  autoAdvanceDelay = 5000,
  onComplete,
  onSkip,
  onSlideChange,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    if (currentIndex < tutorial.slides.length - 1) {
      const newIndex = currentIndex + 1;
      goToSlide(newIndex);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      goToSlide(newIndex);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({
      x: width * index,
      animated: true,
    });

    if (onSlideChange) {
      onSlideChange(index);
    }

    // Auto-advance timer
    if (autoAdvance) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }

      autoAdvanceTimerRef.current = setTimeout(() => {
        if (index < tutorial.slides.length - 1) {
          goToSlide(index + 1);
        } else {
          onComplete();
        }
      }, autoAdvanceDelay);
    }
  };

  const handleClose = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setCurrentIndex(0);
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={handleClose}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1e293b"
        translucent={false}
      />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {tutorial.slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBarWrapper,
                index < tutorial.slides.length - 1 && styles.progressBarMargin
              ]}
            >
              <ProgressBar
                active={index === currentIndex}
                completed={index < currentIndex}
                autoAdvance={autoAdvance && index === currentIndex}
                duration={autoAdvanceDelay}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tutorialInfo}>
            <Text style={styles.tutorialName}>{tutorial.name}</Text>
            <Text style={styles.slideCounter}>
              {currentIndex + 1} / {tutorial.slides.length}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          {tutorial.slides.map((slide) => (
            <TutorialSlide key={slide.id} slide={slide} />
          ))}
        </ScrollView>

        {/* Navigation Tap Zones (Instagram-style) */}
        <View style={styles.tapZones}>
          <TouchableOpacity
            style={styles.tapLeft}
            onPress={handlePrevious}
            activeOpacity={1}
            disabled={currentIndex === 0}
          />
          <TouchableOpacity
            style={styles.tapRight}
            onPress={handleNext}
            activeOpacity={1}
          />
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevious}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
              <Text style={[styles.backButtonText, { marginLeft: 8 }]}>Anterior</Text>
            </TouchableOpacity>
          )}

          <View style={styles.spacer} />

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === tutorial.slides.length - 1 && styles.completeButton,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === tutorial.slides.length - 1 ? 'Empezar' : 'Siguiente'}
            </Text>
            <Ionicons
              name={
                currentIndex === tutorial.slides.length - 1
                  ? 'checkmark-circle'
                  : 'arrow-forward'
              }
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 16 : 12, // Aumentado para evitar choque con Dynamic Island
    paddingBottom: 8,
  },
  progressBarWrapper: {
    flex: 1,
  },
  progressBarMargin: {
    marginRight: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  slideCounter: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  tapZones: {
    position: 'absolute',
    top: 100,
    bottom: 120, // Aumentar para NO cubrir botones del footer
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1, // Asegurar que esté DEBAJO de los botones del footer
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10, // Por ENCIMA de las tap zones
    backgroundColor: '#1e293b', // Asegurar fondo
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

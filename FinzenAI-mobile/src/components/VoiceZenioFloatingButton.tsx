import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VoiceZenioChat from './VoiceZenioChat';

interface VoiceZenioFloatingButtonProps {
  onTransactionCreated?: () => void;
  onTransactionUpdated?: () => void;
  onTransactionDeleted?: () => void;
  onBudgetCreated?: () => void;
  onBudgetUpdated?: () => void;
  onBudgetDeleted?: () => void;
  onGoalCreated?: () => void;
  onGoalUpdated?: () => void;
  onGoalDeleted?: () => void;
}

const VoiceZenioFloatingButton: React.FC<VoiceZenioFloatingButtonProps> = () => {
  const [showChat, setShowChat] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [{ scale }],
            bottom: 100 + insets.bottom,
            right: 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Image 
            source={require('../assets/isotipo.png')} 
            style={styles.zenioIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Voice Chat Modal */}
      <Modal
        visible={showChat}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCloseChat}
      >
        <VoiceZenioChat 
          onClose={handleCloseChat}
          threadId={undefined}
          isOnboarding={false}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  button: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  zenioIcon: {
    width: 36,
    height: 36,
  },
});

export default VoiceZenioFloatingButton;
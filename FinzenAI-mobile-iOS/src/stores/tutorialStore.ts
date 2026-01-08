import AsyncStorage from '@react-native-async-storage/async-storage';
import { TutorialProgress } from '../data/tutorials/types';

import { logger } from '../utils/logger';
const KEYS = {
  COACH_MARKS_SEEN: '@finzenai/coachMarksSeen',
  TUTORIALS_PROGRESS: '@finzenai/tutorialsProgress',
  FIRST_TIME_SCREENS: '@finzenai/firstTimeScreens',
};

export const tutorialStore = {
  // ==================== COACH MARKS ====================

  /**
   * Verifica si el usuario ya vio los coach marks de una pantalla
   */
  async hasSeenCoachMarks(screen: string): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(KEYS.COACH_MARKS_SEEN);
      if (!data) return false;
      const seen = JSON.parse(data);
      return seen[screen] === true;
    } catch (error) {
      logger.error('[TutorialStore] Error checking coach marks:', error);
      return false;
    }
  },

  /**
   * Marca los coach marks de una pantalla como vistos
   */
  async markCoachMarksAsSeen(screen: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(KEYS.COACH_MARKS_SEEN);
      const seen = data ? JSON.parse(data) : {};
      seen[screen] = true;
      await AsyncStorage.setItem(KEYS.COACH_MARKS_SEEN, JSON.stringify(seen));
      logger.log(`[TutorialStore] Coach marks marked as seen for: ${screen}`);
    } catch (error) {
      logger.error('[TutorialStore] Error saving coach marks:', error);
    }
  },

  /**
   * Resetea todos los coach marks (útil para testing)
   */
  async resetCoachMarks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.COACH_MARKS_SEEN);
      logger.log('[TutorialStore] All coach marks reset');
    } catch (error) {
      logger.error('[TutorialStore] Error resetting coach marks:', error);
    }
  },

  // ==================== TUTORIAL PROGRESS ====================

  /**
   * Obtiene el progreso de un tutorial específico
   */
  async getTutorialProgress(tutorialId: string): Promise<TutorialProgress | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TUTORIALS_PROGRESS);
      if (!data) return null;
      const progress = JSON.parse(data);
      return progress[tutorialId] || null;
    } catch (error) {
      logger.error('[TutorialStore] Error getting tutorial progress:', error);
      return null;
    }
  },

  /**
   * Guarda el progreso de un tutorial
   */
  async saveTutorialProgress(tutorialId: string, progress: TutorialProgress): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TUTORIALS_PROGRESS);
      const allProgress = data ? JSON.parse(data) : {};
      allProgress[tutorialId] = progress;
      await AsyncStorage.setItem(KEYS.TUTORIALS_PROGRESS, JSON.stringify(allProgress));
      logger.log(`[TutorialStore] Progress saved for tutorial: ${tutorialId}`);
    } catch (error) {
      logger.error('[TutorialStore] Error saving tutorial progress:', error);
    }
  },

  /**
   * Marca un tutorial como completado
   */
  async markTutorialAsCompleted(tutorialId: string): Promise<void> {
    await this.saveTutorialProgress(tutorialId, {
      tutorialId,
      completed: true,
      lastViewed: new Date().toISOString(),
      currentSlide: 0,
    });
  },

  /**
   * Obtiene todos los IDs de tutoriales completados
   */
  async getAllCompletedTutorials(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TUTORIALS_PROGRESS);
      if (!data) return [];
      const progress = JSON.parse(data);
      return Object.keys(progress).filter(id => progress[id].completed);
    } catch (error) {
      logger.error('[TutorialStore] Error getting completed tutorials:', error);
      return [];
    }
  },

  /**
   * Obtiene el progreso de todos los tutoriales
   */
  async getAllTutorialProgress(): Promise<{ [key: string]: TutorialProgress }> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TUTORIALS_PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      logger.error('[TutorialStore] Error getting all tutorial progress:', error);
      return {};
    }
  },

  /**
   * Resetea el progreso de todos los tutoriales (útil para testing)
   */
  async resetAllTutorialProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.TUTORIALS_PROGRESS);
      logger.log('[TutorialStore] All tutorial progress reset');
    } catch (error) {
      logger.error('[TutorialStore] Error resetting tutorial progress:', error);
    }
  },

  // ==================== FIRST TIME SCREENS ====================

  /**
   * Verifica si es la primera vez que el usuario visita una pantalla
   */
  async isFirstTimeOnScreen(screen: string): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FIRST_TIME_SCREENS);
      if (!data) return true;
      const screens = JSON.parse(data);
      return !screens[screen];
    } catch (error) {
      logger.error('[TutorialStore] Error checking first time screen:', error);
      return true;
    }
  },

  /**
   * Marca una pantalla como visitada
   */
  async markScreenAsVisited(screen: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FIRST_TIME_SCREENS);
      const screens = data ? JSON.parse(data) : {};
      screens[screen] = true;
      await AsyncStorage.setItem(KEYS.FIRST_TIME_SCREENS, JSON.stringify(screens));
      logger.log(`[TutorialStore] Screen marked as visited: ${screen}`);
    } catch (error) {
      logger.error('[TutorialStore] Error marking screen as visited:', error);
    }
  },

  /**
   * Resetea el estado de primera vez de todas las pantallas
   */
  async resetFirstTimeScreens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.FIRST_TIME_SCREENS);
      logger.log('[TutorialStore] All first time screens reset');
    } catch (error) {
      logger.error('[TutorialStore] Error resetting first time screens:', error);
    }
  },

  // ==================== UTILITY ====================

  /**
   * Resetea TODOS los datos del tutorial system (para testing o reset completo)
   */
  async resetAll(): Promise<void> {
    await Promise.all([
      this.resetCoachMarks(),
      this.resetAllTutorialProgress(),
      this.resetFirstTimeScreens(),
    ]);
    logger.log('[TutorialStore] All tutorial data reset');
  },
};

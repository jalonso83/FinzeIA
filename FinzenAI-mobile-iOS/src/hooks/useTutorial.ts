import { useState, useEffect } from 'react';
import { tutorialStore } from '../stores/tutorialStore';
import { TutorialProgress } from '../data/tutorials/types';

/**
 * Hook para gestionar el progreso de un tutorial específico
 */
export function useTutorial(tutorialId: string) {
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [tutorialId]);

  const loadProgress = async () => {
    setLoading(true);
    const data = await tutorialStore.getTutorialProgress(tutorialId);
    setProgress(data);
    setLoading(false);
  };

  const updateProgress = async (currentSlide: number) => {
    const newProgress: TutorialProgress = {
      tutorialId,
      completed: false,
      lastViewed: new Date().toISOString(),
      currentSlide,
    };
    await tutorialStore.saveTutorialProgress(tutorialId, newProgress);
    setProgress(newProgress);
  };

  const markAsCompleted = async () => {
    await tutorialStore.markTutorialAsCompleted(tutorialId);
    await loadProgress();
  };

  return {
    progress,
    loading,
    isCompleted: progress?.completed || false,
    updateProgress,
    markAsCompleted,
  };
}

/**
 * Hook para gestionar coach marks de una pantalla
 */
export function useCoachMarks(screen: string) {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCoachMarks();
  }, [screen]);

  const checkCoachMarks = async () => {
    setLoading(true);
    const hasSeen = await tutorialStore.hasSeenCoachMarks(screen);
    setShouldShow(!hasSeen);
    setLoading(false);
  };

  const markAsSeen = async () => {
    await tutorialStore.markCoachMarksAsSeen(screen);
    setShouldShow(false);
  };

  return {
    shouldShow,
    loading,
    markAsSeen,
  };
}

/**
 * Hook para obtener todos los tutoriales completados
 */
export function useCompletedTutorials() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleted();
  }, []);

  const loadCompleted = async () => {
    setLoading(true);
    const ids = await tutorialStore.getAllCompletedTutorials();
    setCompletedIds(ids);
    setLoading(false);
  };

  const refresh = () => {
    loadCompleted();
  };

  return {
    completedIds,
    loading,
    refresh,
    isCompleted: (tutorialId: string) => completedIds.includes(tutorialId),
  };
}

/**
 * Hook para verificar si es primera vez en una pantalla
 */
export function useFirstTimeScreen(screen: string) {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFirstTime();
  }, [screen]);

  const checkFirstTime = async () => {
    setLoading(true);
    const firstTime = await tutorialStore.isFirstTimeOnScreen(screen);
    setIsFirstTime(firstTime);
    setLoading(false);
  };

  const markAsVisited = async () => {
    await tutorialStore.markScreenAsVisited(screen);
    setIsFirstTime(false);
  };

  return {
    isFirstTime,
    loading,
    markAsVisited,
  };
}

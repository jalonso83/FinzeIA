'use client';

import { useState, useEffect } from 'react';

type Device = 'ios' | 'android' | 'desktop';

export function useDeviceDetect(): Device {
  const [device, setDevice] = useState<Device>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;

    if (/iPad|iPhone|iPod/.test(ua)) {
      setDevice('ios');
    } else if (/android/i.test(ua)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }
  }, []);

  return device;
}

'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/staff-sw.js', { scope: '/staff/' }).catch(() => {});
  }, []);
  return null;
}

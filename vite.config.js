import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // مسارات نسبية: ضرورية ليعمل التطبيق داخل كاباسيتور (ملفات محلية) وعلى الاستضافة معاً
  base: './',
  plugins: [
    react(),
    VitePWA({
      // "prompt": لا يتم التحديث تلقائياً، بل يظهر إشعار للمستخدم ليقرر
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'مرافق السكري',
        short_name: 'مرافق السكري',
        description: 'تطبيق لمتابعة قراءات السكر والأنسولين والوجبات والفحوصات الطبية',
        lang: 'ar',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#eef3f2',
        theme_color: '#0e5c63',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // لا نفرض skipWaiting: التحديث يتم فقط عندما يضغط المستخدم "تحديث الآن"
        clientsClaim: false,
        skipWaiting: false
      },
      devOptions: { enabled: false }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900
  }
});

import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '二维码工具箱',
    description: '一个轻量、便捷的浏览器二维码工具',
    action: {
      default_title: '二维码工具箱',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    permissions: ['clipboardWrite', 'activeTab', 'storage'],
    host_permissions: [
      '<all_urls>',
    ],
  },
});

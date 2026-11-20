import { browser } from 'wxt/browser';

export default defineBackground(() => {
    browser.runtime.onMessage.addListener((message) => {
        // 启动截图
        if (message.type === 'START_QR_SCAN') {
            return startScan();
        }

        // 接收识别结果
        if (message.type === 'QR_SCAN_RESULT') {
            return handleScanResult(message.result);
        }
    });

    async function startScan() {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });

        if (!tab.id || !tab.windowId) {
            throw new Error('无法获取当前标签页');
        }

        const screenshot = await browser.tabs.captureVisibleTab(
            tab.windowId,
            { format: 'png' },
        );

        await browser.tabs.sendMessage(tab.id, {
            type: 'START_SELECTION',
            screenshot,
        });

        return { success: true };
    }

    async function handleScanResult(result: string) {
        // 先保存结果
        await browser.storage.session.set({
            qrScanResult: result,
        });

        // 再重新打开 Popup
        try {
            await browser.action.openPopup();
        } catch (error) {
            console.warn('无法自动打开 Popup:', error);
        }

        return { success: true };
    }
});
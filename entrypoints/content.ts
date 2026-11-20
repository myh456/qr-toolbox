import jsQR from 'jsqr';
import { browser } from 'wxt/browser';

export default defineContentScript({
    matches: ['<all_urls>'],

    main() {
        browser.runtime.onMessage.addListener((message) => {
            if (message.type === 'START_SELECTION') {
                startSelection(message.screenshot);
            }
        });
    }
});

function startSelection(screenshot: string) {
    // 防止重复创建
    if (document.getElementById('__qr_selector__')) {
        return;
    }

    const host = document.createElement('div');
    host.id = '__qr_selector__';

    Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
    });

    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
      }

      .mask {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        cursor: crosshair;
        user-select: none;
      }

      .selection {
        position: absolute;
        border: 2px solid #409eff;
        background: rgba(64, 158, 255, 0.15);
        display: none;
      }

      .tip {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        background: #333;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-family: sans-serif;
        white-space: nowrap;
      }
    </style>

    <div class="mask">
      <div class="tip">拖动鼠标选择二维码区域，按 ESC 取消</div>
      <div class="selection"></div>
    </div>
  `;

    document.documentElement.appendChild(host);

    const mask = shadow.querySelector('.mask') as HTMLDivElement;
    const selection = shadow.querySelector('.selection') as HTMLDivElement;

    let startX = 0;
    let startY = 0;
    let selecting = false;

    mask.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;

        selecting = true;

        startX = event.clientX;
        startY = event.clientY;

        selection.style.display = 'block';

        updateSelection(event.clientX, event.clientY);

        event.preventDefault();
    });

    mask.addEventListener('pointermove', (event) => {
        if (!selecting) return;

        updateSelection(event.clientX, event.clientY);
    });

    mask.addEventListener('pointerup', async (event) => {
        if (!selecting) return;

        selecting = false;

        const rect = getSelectionRect(event.clientX, event.clientY);

        host.remove();

        if (rect.width < 5 || rect.height < 5) return;

        await recognizeQRCode(screenshot, rect);
    });

    function updateSelection(x: number, y: number) {
        const rect = getSelectionRect(x, y);

        Object.assign(selection.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    }

    function getSelectionRect(x: number, y: number) {
        return {
            left: Math.min(startX, x),
            top: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY),
        };
    }

    function cancel(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            host.remove();
            document.removeEventListener('keydown', cancel);
        }
    }

    document.addEventListener('keydown', cancel);
}

async function recognizeQRCode(
    screenshot: string,
    rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    },
) {
    let result = '';
    try {
        const img = new Image();

        img.src = screenshot;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('截图加载失败'));
        });

        // 截图像素与浏览器 CSS 像素可能不一致
        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;

        const sx = Math.round(rect.left * scaleX);
        const sy = Math.round(rect.top * scaleY);

        const sw = Math.min(
            Math.round(rect.width * scaleX),
            img.naturalWidth - sx,
        );

        const sh = Math.min(
            Math.round(rect.height * scaleY),
            img.naturalHeight - sy,
        );

        const canvas = document.createElement('canvas');

        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('无法创建 Canvas');
        }

        // 裁剪选中的截图区域
        ctx.drawImage(
            img,
            sx, sy, sw, sh,
            0, 0, sw, sh,
        );

        const imageData = ctx.getImageData(
            0, 0, sw, sh,
        );

        const qr = jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
                inversionAttempts: 'attemptBoth',
            },
        );

        result = qr?.data ?? '';
    } catch (error) {
        console.error('二维码识别失败:', error);
    }
    await browser.runtime.sendMessage({
        type: 'QR_SCAN_RESULT',
        result,
    });
}
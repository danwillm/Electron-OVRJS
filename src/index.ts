import {EVRApplicationType, VROverlay, VR_Init, EVREventType, VREvent_Mouse_t} from 'ovrjs';
import * as Electron from "electron";

const { BrowserWindow } = require('electron');

export interface VRWindowConstructorOptions
    extends Electron.BrowserWindowConstructorOptions {
    vr: {
        key: string;
        name: string;
        fps: number;
    };
}

export class VRWindow extends BrowserWindow {
    public overlay: VROverlay;

    constructor(opts: VRWindowConstructorOptions) {
        opts.frame = false;
        opts.transparent = true;
        opts.webPreferences = {
            ...(opts.webPreferences || {}),
            offscreen: true,
        };

        super(opts);

        VR_Init(EVRApplicationType.VRApplication_Overlay);
        this.overlay = new VROverlay(opts.vr.name, opts.vr.key);

        this.webContents.setFrameRate(opts.vr.fps);

        this.webContents.on('paint', async (...args) => {
            await this.draw();
        });

        this.webContents.on('dom-ready', async () => {
            await this.draw();

            this.overlay.ShowOverlay();

            // force draw after a second, too
            setTimeout(() => {
                this.draw();
            }, 1000);
        });

        setInterval(() => {
            let event;
            while (
                // eslint-disable-next-line no-cond-assign
                (event = this.overlay.PollNextOverlayEvent())
                ) {
                if(typeof event === 'boolean') continue;

                switch (event.eventType as number) {
                    case EVREventType.VREvent_MouseButtonDown: {
                        const { x, y } = event as unknown as VREvent_Mouse_t;

                        const window_width = this.getBounds().width;
                        const window_height = this.getBounds().height;

                        const window_x = x * window_width;
                        const window_y = window_height - y * window_height;

                        this?.webContents?.executeJavaScript(
                            `document.elementFromPoint(${window_x}, ${window_y}).click()`
                        );
                        break;
                    }
                    default:
                }
            }
        }, 1);
    }

    async draw() {
        const image = await this.webContents.capturePage();

        const buf = image.toBitmap();

        if (buf.length === 0) {
            return;
        }

        const w = image.getSize().width;
        const h = image.getSize().height;

        this.overlay.SetOverlayTextureFromBuffer(buf, w, h);
    }
}
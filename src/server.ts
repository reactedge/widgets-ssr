import {run} from "node:test";

if (process.env.ALLOW_SELF_SIGNED_SSL === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import 'dotenv/config';
import { logger } from './logger'
import express from 'express';
import {buildRenderPayload} from "./payload";

const app = express();
app.use(express.json());

function resolveEntry(widget: string): string {
    return `${process.env.SSR_WIDGET_ROOT}/widget-${widget}/vite_project/src/ssr/entry.tsx`;
}

app.post('/render', async (req, res) => {
    const requestId = crypto.randomUUID();
    const started = performance.now();

    try {
        logger.info('[SSR START]', {
            requestId
        });

        const payload = await buildRenderPayload(req.body);

        logger.info('[SSR PAYLOAD]', {
            requestId,
            widget: payload.widget,
            contractFile: payload.contractFile,
            runtime: payload.runtimeConfig
        });

        const entry = resolveEntry(payload.widget);
        const {renderHtml, buildBootstrap} = await import(entry);

        const bootstrapData =
            buildBootstrap
                ? await buildBootstrap(
                    payload.contract,
                    payload.runtimeConfig
                )
                : undefined;

        const html = renderHtml(payload.contract, payload.runtimeConfig, bootstrapData);

        logger.info('[SSR DONE]', {
            requestId,
            duration:
                Math.round(
                    performance.now() - started
                ),
            size: html.length
        });

        res.send(`
            <!-- SSR:${requestId} -->
            ${html}
        `);

    } catch (e) {
        logger.error('[SSR ERROR]', e);

        res.status(500).send(
            'SSR failed'
        );
    }
});

app.listen( process.env.SSR_PORT, '0.0.0.0', () => {
    console.log(`Widgets SSR runtime listening on :${process.env.SSR_PORT}`);
    console.log('Widgets SSR runtime WIDGETS_CDN_URL', process.env.WIDGETS_CDN_URL);
});
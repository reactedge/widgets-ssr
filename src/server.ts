process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';

import express from 'express';

const app = express();
app.use(express.json());

function resolveEntry(widget: string): string {
    return `/workspace/widget-${widget}/vite_project/src/ssr/entry.tsx`;
}

async function fetchContract(widget: string, contract: string) {
    const contractPath = `${process.env.WIDGETS_CDN_URL}/${widget}/contracts/${contract}`
    const response = await fetch(contractPath);
    console.log(`SSR built with contract path: ${contractPath}`)

    if (!response.ok) {
        throw new Error(
            `Contract fetch failed: ${response.status}`
        );
    }

    return response.json();
}

app.get('/render/:widget/:contract', async (req, res) => {
    try {
        const widget = req.params.widget;
        const contract = req.params.contract;

        const entry = resolveEntry(widget);
        const { renderHtml } = await import(entry);
        const config  = await fetchContract(widget, contract)
        const html = renderHtml(config);

        res.send(html);
    } catch (e) {
        console.error('SSR ERROR', e);
        res.status(500).send('SSR failed');
    }
});

app.post('/render', async (req, res) => {
    try {
        const { widget, contract } = req.body;
        const entry = resolveEntry(widget);
        const { renderHtml } = await import(entry);
        const html = renderHtml(contract);

        res.send(html);
    } catch (e) {
        console.error('SSR ERROR', e);
        res.status(500).send('SSR failed');
    }
});

app.listen(3001, '0.0.0.0', () => {
    console.log('Widgets SSR runtime listening on :3001');
    console.log('Widgets SSR runtime WIDGETS_CDN_URL', process.env.WIDGETS_CDN_URL);
});
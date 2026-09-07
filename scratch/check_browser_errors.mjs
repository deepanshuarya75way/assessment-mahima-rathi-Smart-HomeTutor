import { spawn } from 'child_process';
import WebSocket from 'ws';

async function runBrowserTest() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;

  console.log('Launching headless Chrome on port', port);
  const chromeProc = spawn(chromePath, [
    '--remote-debugging-port=' + port,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await fetch(`http://127.0.0.1:${port}/json`);
    const pages = await jsonRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page || !page.webSocketDebuggerUrl) {
      console.error('No page WebSocket URL found!');
      chromeProc.kill();
      return;
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let msgId = 1;
    const send = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve) => {
        const handler = (data) => {
          const res = JSON.parse(data.toString());
          if (res.id === id) {
            ws.removeListener('message', handler);
            resolve(res);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    ws.on('open', async () => {
      console.log('CDP WebSocket connected!');
      await send('Page.enable');
      await send('Runtime.enable');
      await send('DOM.enable');

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('\n🔴 [RUNTIME EXCEPTION]:', JSON.stringify(msg.params.exceptionDetails, null, 2));
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const args = msg.params.args.map(a => (a.value !== undefined ? String(a.value) : (a.description || JSON.stringify(a)))).join(' ');
          if (type === 'error') {
            console.error(`\n❌ [CONSOLE ERROR]:`, args);
          } else if (type === 'warn') {
            console.warn(`⚠️ [CONSOLE WARN]:`, args);
          } else {
            console.log(`ℹ️ [CONSOLE ${type}]:`, args);
          }
        }
      });

      console.log('\n--- Navigating to http://localhost:5000/ ---');
      await send('Page.navigate', { url: 'http://localhost:5000/' });
      await new Promise(r => setTimeout(r, 3000));

      const evalRoot = async () => {
        const res = await send('Runtime.evaluate', { expression: 'document.getElementById("root")?.innerHTML' });
        return res.result?.value || '';
      };

      console.log('Home Page Root InnerHTML Length:', (await evalRoot()).length);

      // Now click on "Find Tutors" link
      console.log('\n--- Clicking Find Tutors Link ---');
      const clickRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const links = Array.from(document.querySelectorAll('a'));
            const link = links.find(a => a.getAttribute('href') === '/find' || a.textContent.includes('Find Tutors'));
            if (link) {
              link.click();
              return 'Clicked: ' + link.getAttribute('href');
            }
            return 'Link /find not found';
          })()
        `
      });
      console.log('Click action:', clickRes.result?.value);
      await new Promise(r => setTimeout(r, 3000));

      console.log('After Clicking Find Tutors, Root InnerHTML Length:', (await evalRoot()).length);
      const urlAfterClick = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result?.value;
      console.log('Current URL:', urlAfterClick);

      ws.close();
      chromeProc.kill();
    });

  } catch (err) {
    console.error('Error during CDP test:', err);
    chromeProc.kill();
  }
}

runBrowserTest();

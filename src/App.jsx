import { useState } from 'react';

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'local-dev';
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || 'not-built';

export function add(a, b) {
  return a + b;
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>DevOps CI/CD Demo</h1>
      <p>A minimal UI shipped through a full pipeline: lint → test → scan → build → containerize → deploy.</p>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>Clicks: {count}</button>
      </div>

      <footer>
        <small>
          build: <code>{BUILD_SHA}</code> &middot; built at <code>{BUILD_TIME}</code>
        </small>
      </footer>
    </div>
  );
}

export default App;

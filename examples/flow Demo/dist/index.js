import { enableDebugger } from './codeapp.js';
enableDebugger();

import { callFlow } from "./codeapp.js";



async function runRandomNumberFlow(number) {
  return callFlow('powerappv2__respondtoapowerapporflow', { number });
}

function getElements() {
  return {
    form: document.querySelector('[data-form]'),
    input: document.querySelector('[data-max-input]'),
    button: document.querySelector('[data-submit]'),
    orbValue: document.querySelector('[data-random-value]'),
    orbLabel: document.querySelector('[data-random-label]'),
    status: document.querySelector('[data-status]'),
  };
}

function renderApp() {
  const root = document.getElementById('root');

  root.innerHTML = `
    <main class="shell">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Flow-triggered randomizer</p>
          <h1>Send a ceiling to Power Automate and let the flow throw the number back.</h1>
          <p class="lede">
            Enter the maximum random number, press the button once, and the flow response lands in the display chamber.
          </p>

          <form class="control-panel" data-form>
            <label class="field" for="max-number">
              <span>Maximum random number</span>
              <input
                id="max-number"
                name="max-number"
                type="number"
                min="1"
                step="1"
                value="100"
                inputmode="numeric"
                data-max-input
                required
              />
            </label>

            <button type="submit" class="launch-button" data-submit>
              Trigger Flow
            </button>
          </form>

          <p class="status" data-status>Ready. Run the flow inside the Power Apps Code Apps host.</p>
        </div>

        <aside class="display-card" aria-live="polite">
          <div class="display-frame">
            <p class="display-caption">Returned random value</p>
            <div class="number-orb">
              <span class="number-orb__value" data-random-value>--</span>
            </div>
            <p class="display-label" data-random-label>Waiting for your first run.</p>
          </div>
        </aside>
      </section>
    </main>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .shell {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 32px;
    }

    .hero-card {
      width: min(1080px, 100%);
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
      gap: 28px;
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 32px;
      background: linear-gradient(135deg, var(--panel), rgba(255, 246, 232, 0.92));
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
      overflow: hidden;
    }

    .hero-copy,
    .display-card {
      position: relative;
      z-index: 1;
    }

    .hero-copy {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 18px;
      padding: 12px;
    }

    .eyebrow,
    .display-caption,
    .display-label,
    .status,
    .field span {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.72rem;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent-strong);
      font-weight: 700;
    }

    h1 {
      margin: 0;
      max-width: 12ch;
      font-size: clamp(3rem, 7vw, 5.5rem);
      line-height: 0.93;
      font-weight: 700;
    }

    .lede {
      margin: 0;
      max-width: 56ch;
      font-size: 1.05rem;
      line-height: 1.75;
      color: rgba(20, 33, 61, 0.8);
    }

    .control-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: end;
      margin-top: 8px;
    }

    .field {
      display: grid;
      gap: 10px;
    }

    .field input {
      width: 100%;
      min-height: 60px;
      border: 1px solid rgba(20, 33, 61, 0.16);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.78);
      color: var(--ink);
      padding: 0 18px;
      font: inherit;
      font-size: 1.2rem;
      outline: none;
      transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
    }

    .field input:focus {
      border-color: rgba(255, 77, 0, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 0 0 6px rgba(255, 122, 24, 0.12);
    }

    .launch-button {
      min-height: 60px;
      padding: 0 28px;
      border: 0;
      border-radius: 18px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
      color: #000000;
      font: inherit;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 18px 36px rgba(255, 77, 0, 0.24);
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
    }

    .launch-button:hover:not(:disabled),
    .launch-button:focus-visible:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 24px 40px rgba(255, 77, 0, 0.3);
      filter: saturate(1.08);
    }

    .launch-button:disabled {
      cursor: wait;
      opacity: 0.76;
    }

    .status {
      margin: 4px 0 0;
      min-height: 1.2rem;
      color: rgba(20, 33, 61, 0.7);
    }

    .display-card {
      display: grid;
      place-items: center;
      padding: 10px;
    }

    .display-frame {
      position: relative;
      width: 100%;
      min-height: 100%;
      display: grid;
      place-items: center;
      gap: 18px;
      padding: 28px 20px;
      border-radius: 28px;
      background:
        radial-gradient(circle at top, rgba(255, 122, 24, 0.26), transparent 30%),
        linear-gradient(180deg, rgba(20, 33, 61, 0.95) 0%, rgba(15, 23, 42, 0.88) 100%);
      color: #f7f1e6;
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .display-frame::before,
    .display-frame::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      filter: blur(2px);
    }

    .display-frame::before {
      width: 160px;
      height: 160px;
      top: -42px;
      right: -32px;
    }

    .display-frame::after {
      width: 120px;
      height: 120px;
      bottom: -30px;
      left: -14px;
    }

    .display-caption,
    .display-label {
      margin: 0;
      color: rgba(247, 241, 230, 0.78);
      text-align: center;
    }

    .number-orb {
      position: relative;
      display: grid;
      place-items: center;
      width: clamp(220px, 30vw, 300px);
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.95), rgba(255, 191, 128, 0.88) 18%, rgba(255, 122, 24, 0.94) 42%, rgba(255, 77, 0, 0.96) 68%, rgba(111, 28, 0, 0.92) 100%);
      box-shadow:
        inset 0 6px 22px rgba(255, 255, 255, 0.24),
        inset 0 -18px 30px rgba(89, 26, 1, 0.35),
        0 30px 70px rgba(0, 0, 0, 0.28);
      animation: float-orb 4.2s ease-in-out infinite;
    }

    .number-orb::before {
      content: "";
      position: absolute;
      inset: 11%;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
    }

    .number-orb__value {
      font-size: clamp(3rem, 9vw, 5.2rem);
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 12px 22px rgba(57, 12, 0, 0.26);
    }

    .number-orb.is-active {
      animation-duration: 1.35s;
      transform: scale(1.04);
    }

    @keyframes float-orb {
      0%,
      100% {
        transform: translateY(0px);
      }

      50% {
        transform: translateY(-10px);
      }
    }

    @media (max-width: 860px) {
      .shell {
        padding: 20px;
      }

      .hero-card {
        grid-template-columns: 1fr;
      }

      h1 {
        max-width: 100%;
      }
    }

    @media (max-width: 640px) {
      .control-panel {
        grid-template-columns: 1fr;
      }

      .launch-button {
        width: 100%;
      }
    }
  `;

  document.head.append(style);
}

function setStatus(message, tone = 'neutral') {
  const { status } = getElements();

  if (!status) {
    return;
  }

  status.textContent = message;
  status.style.color =
    tone === 'error'
      ? '#9f2100'
      : tone === 'success'
        ? '#8f3d00'
        : 'rgba(20, 33, 61, 0.7)';
}

function formatFlowError(error) {
  const fallbackMessage = 'Flow execution failed.';
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;

  if (rawMessage.includes('Power Apps host was not detected')) {
    return 'Open this app from the Power Apps Code Apps host to run the flow.';
  }

  return rawMessage;
}

function pulseOrb() {
  const { orbValue } = getElements();
  const orb = orbValue?.closest('.number-orb');

  if (!orb) {
    return;
  }

  orb.classList.remove('is-active');
  void orb.offsetWidth;
  orb.classList.add('is-active');
}

async function handleSubmit(event) {
  event.preventDefault();

  const { input, button, orbValue, orbLabel } = getElements();
  const maxNumber = Number.parseInt(input?.value ?? '', 10);

  if (!Number.isInteger(maxNumber) || maxNumber < 1) {
    setStatus('Enter a whole number greater than zero.', 'error');
    input?.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Calling Flow...';
  }

  setStatus(`Sending ${maxNumber} to the flow.`, 'neutral');

  try {
    const result = await runRandomNumberFlow(maxNumber);
    const randomValue = result?.random;
    const parsedRandomValue = typeof randomValue === 'number' ? randomValue : Number(randomValue);

    if (!Number.isFinite(parsedRandomValue)) {
      throw new Error('The flow response did not include a random number.');
    }

    if (orbValue) {
      orbValue.textContent = `${parsedRandomValue}`;
    }

    if (orbLabel) {
      orbLabel.textContent = `Flow returned a value from 0 to ${maxNumber}.`;
    }

    pulseOrb();
    setStatus('Flow complete.', 'success');
  } catch (error) {
    setStatus(formatFlowError(error), 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Trigger Flow';
    }
  }
}

function bindEvents() {
  const { form } = getElements();
  form?.addEventListener('submit', handleSubmit);
}

async function boot() {
  renderApp();
  bindEvents();
}

boot();
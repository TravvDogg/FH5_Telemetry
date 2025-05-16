;(async function(){
  // fetch the same config file from the server
  const module = await import('/fields.js');
  const fields = module.default;
  const container = document.getElementById('values');
  const elements  = [];

  // Build rows in the exact order of your JSON
  fields.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="label">${f.name}</div>
      <div class="bar">
        <div class="fill" id="fill-${i}"></div>
      </div>
      <div class="value" id="value-${i}">—</div>
    `;
    container.appendChild(row);
    elements.push({
      fillEl: document.getElementById(`fill-${i}`),
      valEl: document.getElementById(`value-${i}`),
      min: f.min,
      max:f.max,
     });
  });

  // WebSocket
  const ws = new WebSocket(`ws://${location.hostname}:8765`);
  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    elements.forEach((el, i) => {
      const field = fields[i];
      let v = data[field.name];
      if (v == null) return;

      // Apply transformation if defined in the field
      if (field.transform) {
        v = field.transform(v);
      }

      if (typeof v === 'number') {
        el.valEl.textContent = v.toFixed(2);

        // update fill‐bar
        const pct = (v - el.min) / (el.max - el.min);
        el.fillEl.style.width =
          Math.max(0, Math.min(1, pct)) * 100 + '%';
      } else {
        // e.g. Boolean or string
        el.valEl.textContent = String(v);
      }
    });
  };
})();

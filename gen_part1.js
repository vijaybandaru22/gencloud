const lines = ["exec(open('helper2.py').read())", ""];
const _add = (f, ops) => {
  const opsStr = ops.map(op => {
    const parts = op.map(p => typeof p === 'number' ? String(p) : JSON.stringify(p));
    return '    (' + parts.join(',') + ')';
  }).join(',\n');
  lines.push('fix(' + JSON.stringify(f) + ',[');
  lines.push(opsStr);
  lines.push('])');
  lines.push('');
};

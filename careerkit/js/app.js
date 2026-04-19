const CK = {
  getEntries()       { return JSON.parse(localStorage.getItem('ck_entries') || '[]'); },
  saveEntries(e)     { localStorage.setItem('ck_entries', JSON.stringify(e)); },
  getSettings()      { return JSON.parse(localStorage.getItem('ck_settings') || '{}'); },
  saveSettings(s)    { localStorage.setItem('ck_settings', JSON.stringify(s)); },
  getDecodes()       { return parseInt(localStorage.getItem('ck_decodes') || '0'); },
  incDecodes()       { localStorage.setItem('ck_decodes', CK.getDecodes() + 1); },
  isPremium()        { return localStorage.getItem('ck_premium') === 'true'; },
  setPremium(v)      { localStorage.setItem('ck_premium', v ? 'true' : 'false'); },

  getStreak() {
    const entries = CK.getEntries();
    if (!entries.length) return 0;
    const days = [...new Set(entries.map(e => e.date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }
};

const CATEGORY_VERBS = {
  shipped:    ['Shipped', 'Launched', 'Deployed', 'Released', 'Delivered'],
  closed:     ['Closed', 'Won', 'Secured', 'Landed', 'Negotiated'],
  led:        ['Led', 'Managed', 'Coordinated', 'Directed', 'Oversaw'],
  built:      ['Built', 'Developed', 'Engineered', 'Designed', 'Created'],
  learned:    ['Completed', 'Mastered', 'Acquired', 'Studied', 'Earned'],
  saved:      ['Reduced', 'Saved', 'Cut', 'Optimised', 'Streamlined'],
  recognized: ['Awarded', 'Recognised', 'Received', 'Honoured', 'Commended'],
};

function toCVBullet(entry) {
  const verbs = CATEGORY_VERBS[entry.category] || ['Completed'];
  const verb = verbs[0];
  let bullet = `${verb} ${entry.title}`;
  if (entry.metrics) bullet += ` — ${entry.metrics}`;
  else if (entry.description) bullet += `: ${entry.description.substring(0, 80)}${entry.description.length > 80 ? '...' : ''}`;
  return bullet;
}

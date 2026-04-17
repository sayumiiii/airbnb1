/* InfluencerKit LK — localStorage data layer */
const IK = {
  getProfile()       { return JSON.parse(localStorage.getItem('ik_profile') || '{}'); },
  saveProfile(p)     { localStorage.setItem('ik_profile', JSON.stringify(p)); },

  getDeals()         { return JSON.parse(localStorage.getItem('ik_deals') || '[]'); },
  saveDeals(d)       { localStorage.setItem('ik_deals', JSON.stringify(d)); },

  getInvoices()      { return JSON.parse(localStorage.getItem('ik_invoices') || '[]'); },
  saveInvoices(i)    { localStorage.setItem('ik_invoices', JSON.stringify(i)); },

  getPortfolio()     { return JSON.parse(localStorage.getItem('ik_portfolio') || '[]'); },
  savePortfolio(p)   { localStorage.setItem('ik_portfolio', JSON.stringify(p)); },

  getCustomRates()   { return JSON.parse(localStorage.getItem('ik_rates') || '[]'); },
  saveCustomRates(r) { localStorage.setItem('ik_rates', JSON.stringify(r)); },

  isPremium()        { return localStorage.getItem('ik_premium') === 'true'; },
  setPremium(v)      { localStorage.setItem('ik_premium', v ? 'true' : 'false'); },
};

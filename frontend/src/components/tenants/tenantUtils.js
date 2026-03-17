// Shared sort & format utilities for tenant-related components

export const sortPropertiesByBuildingId = (properties) => {
  return [...properties].sort((a, b) => {
    const aId = a.building_id;
    const bId = b.building_id;
    if (aId == null && bId == null) return (a.name || '').localeCompare(b.name || '');
    if (aId == null) return 1;
    if (bId == null) return -1;
    if (aId !== bId) return aId - bId;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const sortUnitsNumerically = (units) => {
  return [...units].sort((a, b) => {
    const aNum = parseInt(a.unit_number, 10);
    const bNum = parseInt(b.unit_number, 10);
    if (isNaN(aNum) && isNaN(bNum)) return (a.unit_number || '').localeCompare(b.unit_number || '');
    if (isNaN(aNum)) return 1;
    if (isNaN(bNum)) return -1;
    return aNum - bNum;
  });
};

export const fmt = (v) => v || '';

export const fmtMoney = (v) => {
  if (v == null || v === '' || v === 0) return '';
  return `$${parseFloat(v).toLocaleString()}`;
};

export const fmtDate = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v + 'T00:00:00');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  } catch {
    return v;
  }
};

export const getQuarterLabel = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth();
  const y = String(d.getFullYear()).slice(-2);
  const quarters = ['Jan\u2013Mar', 'Apr\u2013Jun', 'Jul\u2013Sep', 'Oct\u2013Dec'];
  return `${quarters[Math.floor(m / 3)]} '${y}`;
};

export const getQuarterSortKey = (dateStr) => {
  if (!dateStr) return '0000-0';
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3);
  return `${y}-${q}`;
};

export const emptyForm = {
  property_id: '', unit_id: '', name: '', phone: '', email: '',
  move_in_date: '', move_out_date: '', is_airbnb_vrbo: false,
  deposit_amount: '', deposit_date: '', monthly_rent: '',
  partial_first_month: '', partial_last_month: '',
  pets: '', parking: '', has_parking: false, notes: '', total_rent: '',
  payment_method: '', rent_due_date: '',
  moveout_confirmed: false, moveout_confirmed_date: null,
  deposit_return_date: '', deposit_return_amount: '', deposit_return_method: '',
  marlins_decal: false
};

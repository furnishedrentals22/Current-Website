export const STATUSES = [
  { value: 'upcoming', label: 'Upcoming', color: 'bg-amber-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'done', label: 'Done', color: 'bg-emerald-500' },
  { value: 'reassigned', label: 'Reassigned', color: 'bg-purple-500' },
  { value: 'archived', label: 'Archived', color: 'bg-stone-400' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-400', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  { value: 'high', label: 'High', dot: 'bg-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-600', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
];

export const CATEGORIES = [
  'manual', 'parking', 'door_code', 'deposit', 'move_in', 'move_out', 'housekeeping', 'lead', 'deposit_return', 'other'
];

export const STATUS_BG = {
  upcoming: 'bg-amber-50/70 border-amber-200',
  in_progress: 'bg-blue-50/70 border-blue-200',
  done: 'bg-emerald-50/70 border-emerald-200',
  reassigned: 'bg-purple-50/70 border-purple-200',
  archived: 'bg-stone-50/70 border-stone-200',
};

export const emptyNotificationForm = {
  name: '', property_id: '', unit_id: '', assigned_person: '',
  reminder_date: '', reminder_time: '', status: 'upcoming',
  is_recurring: false, recurrence_pattern: '', recurrence_end_date: '',
  reminder_times: [], notes: '', notification_type: 'manual',
  priority: 'medium', category: 'manual', message: '',
};

export const getPriorityInfo = (p) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { PROGRAMS } from '@/lib/programs';
import { isEmail, text } from '@/lib/validate';
import type { FormState } from '@/lib/types';

const SAVE_FAILED =
  'Something went wrong and your information was not saved. Please try again in a minute.';

export async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  // Hidden "website" field: real people leave it empty, form-filling bots do not.
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const picked = formData.getAll('programs').map(String);
  const values = {
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    address: text(formData.get('address'), 200),
    household: text(formData.get('household'), 3),
    details: text(formData.get('details'), 1500),
    programs: picked,
  };

  const openIds = PROGRAMS.filter((p) => p.requestsOpen).map((p) => p.id);
  const programs = Array.from(new Set(picked.filter((id) => openIds.includes(id))));
  const household = Number.parseInt(values.household, 10);

  let message = '';
  if (!values.name) message = 'Please enter your name.';
  else if (programs.length === 0) message = 'Please choose at least one program.';
  else if (!values.phone && !values.email)
    message = 'Please give us a phone number or an email so we can reach you.';
  else if (values.email && !isEmail(values.email))
    message = 'That email address does not look right.';
  else if (!Number.isInteger(household) || household < 1 || household > 30)
    message = 'Please enter how many people live in your household (1 to 30).';
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('help_requests')
      .insert({
        programs,
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        household_size: household,
        details: values.details || null,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitRequest failed', e);
    return { status: 'error', message: SAVE_FAILED, values };
  }
  return { status: 'ok' };
}

export async function submitTagPickup(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData.get('website'), 200)) return { status: 'ok' };

  const values = {
    name: text(formData.get('name'), 100),
    phone: text(formData.get('phone'), 40),
    email: text(formData.get('email'), 120),
    tags: text(formData.get('tags'), 200),
    notes: text(formData.get('notes'), 500),
  };

  let message = '';
  if (!values.name) message = 'Please enter your name.';
  else if (!values.tags) message = 'Please tell us which tag or tags you took.';
  else if (!values.phone && !values.email)
    message = 'Please give us a phone number or an email so we can reach you.';
  else if (values.email && !isEmail(values.email))
    message = 'That email address does not look right.';
  if (message) return { status: 'error', message, values };

  try {
    const { error } = await createAdminClient()
      .from('tag_pickups')
      .insert({
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        tag_numbers: values.tags,
        notes: values.notes || null,
      });
    if (error) throw error;
  } catch (e) {
    console.error('submitTagPickup failed', e);
    return { status: 'error', message: SAVE_FAILED, values };
  }
  return { status: 'ok' };
}

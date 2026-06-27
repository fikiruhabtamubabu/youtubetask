// Profile update operations handler
import { supabase } from './supabase.js';
import { checkRouteGuard } from './app.js';
import { NotificationManager } from './notifications.js';

async function initProfile() {
  const session = await checkRouteGuard(true);
  if (!session) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    document.getElementById('email').value = profile.email;
    document.getElementById('name').value = profile.name || '';
    document.getElementById('avatar').value = profile.avatar || '';
  }
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const avatar = document.getElementById('avatar').value;

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('profiles')
    .update({ name, avatar })
    .eq('id', user.id);

  if (error) {
    NotificationManager.show(error.message, "error");
  } else {
    NotificationManager.show("Profile configurations updated!", "success");
  }
});

document.addEventListener('DOMContentLoaded', initProfile);
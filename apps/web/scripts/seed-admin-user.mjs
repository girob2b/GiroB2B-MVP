import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error("Missing ADMIN_EMAIL and ADMIN_PASSWORD.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAdminUser() {
  const existing = await findUserByEmail(adminEmail);

  let userId;
  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (error || !data.user) throw error ?? new Error("Failed to create user.");
    userId = data.user.id;
    console.log(`Created admin auth user: ${adminEmail}`);
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), role: "admin" },
    });
    if (error || !data.user) throw error ?? new Error("Failed to update user.");
    userId = data.user.id;
    console.log(`Updated admin auth user: ${adminEmail}`);
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      role: "admin",
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  console.log("Admin role ensured in user_profiles.");
}

ensureAdminUser()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed admin user:", error.message ?? error);
    process.exit(1);
  });
